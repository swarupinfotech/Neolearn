"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { readSessionUserId } from "@/lib/session";
import { onboardingInput } from "@/lib/validation";
import { track } from "@/lib/events";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function submitOnboarding(input: unknown): Promise<ActionResult> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const parsed = onboardingInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await prisma.onboarding.findUnique({ where: { userId } });
  if (existing) return { ok: false, error: "Onboarding already completed." };

  await prisma.onboarding.create({
    data: {
      userId,
      topics: parsed.data.topics,
      experienceLevel: parsed.data.experienceLevel,
      goal: parsed.data.goal,
    },
  });

  // Seed initial skills from chosen topics.
  await prisma.user.update({
    where: { id: userId },
    data: { skills: parsed.data.topics as unknown as string[] },
  });

  void track("onboarding_complete", { goal: parsed.data.goal }, userId);
  revalidatePath("/", "layout");
  await cookies();
  return { ok: true };
}