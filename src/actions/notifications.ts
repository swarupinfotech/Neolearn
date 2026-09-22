"use server";

import { revalidatePath } from "next/cache";
import { readSessionUserId } from "@/lib/session";
import { listNotifications, markRead, markAllRead } from "@/services/notifications";

export async function markAllReadAction(): Promise<{ ok: boolean }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false };
  await markAllRead(userId);
  revalidatePath("/notifications");
  return { ok: true };
}

export async function markReadAction(id: string): Promise<{ ok: boolean }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false };
  await markRead(userId, id);
  revalidatePath("/notifications");
  return { ok: true };
}

export async function verifyFirstNotifications(): Promise<{ ok: boolean; count: number }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, count: 0 };
  const items = await listNotifications(userId, 5);
  return { ok: true, count: items.length };
}