"use server";

import { revalidatePath } from "next/cache";
import { readSessionUserId } from "@/lib/session";
import { claimDailyReward } from "@/services/daily";

export interface ActionOk {
  ok: boolean;
  error?: string;
  xp?: number;
}

export async function claimDailyAction(): Promise<ActionOk> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const result = await claimDailyReward(userId);
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath("/dashboard", "layout");
  revalidatePath("/daily", "layout");
  return { ok: true, xp: result.xp };
}