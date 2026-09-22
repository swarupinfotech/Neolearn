"use server";

import { revalidatePath } from "next/cache";
import { readSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { updateProfileInput, resetInput } from "@/lib/validation";
import { requestEmailVerification } from "@/services/auth";
import { track } from "@/lib/events";

export async function updateProfileAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const parsed = updateProfileInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const { displayName, bio, skills, avatarUrl } = parsed.data;
  await prisma.user.update({
    where: { id: userId },
    data: {
      displayName,
      bio: bio || null,
      skills: skills.length ? skills : [],
      avatarUrl: avatarUrl || null,
    },
  });
  await track("profile_updated", undefined, userId);
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function changePasswordAction(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const parsed = resetInput.safeParse({ token: "", password: (input as { newPassword?: string })?.newPassword ?? "" });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid password." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  const current = (input as { currentPassword?: string })?.currentPassword ?? "";
  if (!(await verifyPassword(current, user.passwordHash))) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await track("password_changed", undefined, userId);
  return { ok: true };
}

export async function resendVerificationAction(): Promise<{ ok: boolean; error?: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const res = await requestEmailVerification(userId);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}