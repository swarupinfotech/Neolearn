"use server";

import { revalidatePath } from "next/cache";
import { readSessionUserId } from "@/lib/session";
import { prisma } from "@/lib/db";
import {
  acceptFriendRequest,
  removeFriend,
  searchUsersByUsername,
  sendFriendRequest,
} from "@/services/friends";

export async function sendFriendAction(targetId: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const res = await sendFriendRequest(userId, targetId);
  revalidatePath("/friends");
  return res;
}

export async function acceptFriendAction(requesterId: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const res = await acceptFriendRequest(userId, requesterId);
  revalidatePath("/friends");
  return res;
}

export async function removeFriendAction(otherId: string): Promise<{ ok: boolean; error?: string }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const res = await removeFriend(userId, otherId);
  revalidatePath("/friends");
  return res;
}

export async function searchUsersAction(query: string): Promise<{
  ok: boolean;
  users?: { id: string; username: string; displayName: string; avatarUrl: string | null; xp: number; level: number }[];
  error?: string;
}> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, error: "Not signed in." };
  const users = await searchUsersByUsername(query, userId);
  return { ok: true, users };
}

export async function pendingCountAction(): Promise<{ ok: boolean; username?: string; count: number }> {
  const userId = await readSessionUserId();
  if (!userId) return { ok: false, count: 0 };
  const count = await prisma.friendship.count({ where: { status: "PENDING", userBId: userId } });
  return { ok: true, count };
}