import { prisma } from "@/lib/db";
import { notify } from "@/services/notifications";
import { track } from "@/lib/events";

function pair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function sendFriendRequest(userId: string, targetId: string) {
  if (userId === targetId) return { ok: false, error: "You can't add yourself." };
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return { ok: false, error: "User not found." };

  const [a, b] = pair(userId, targetId);
  const existing = await prisma.friendship.findUnique({ where: { userAId_userBId: { userAId: a, userBId: b } } });
  if (existing) {
    if (existing.status === "ACCEPTED") return { ok: false, error: "Already friends." };
    if (existing.status === "BLOCKED") return { ok: false, error: "Unable to send request." };
    return { ok: false, error: "Request already pending." };
  }

  await prisma.friendship.create({
    data: { userAId: a, userBId: b, status: "PENDING", actionedBy: userId },
  });
  await notify({
    userId: targetId,
    type: "friend_request",
    title: "New friend request",
    body: "Someone wants to connect with you.",
    link: "/friends",
  });
  void track("friend_request", { targetId }, userId);
  return { ok: true };
}

export async function acceptFriendRequest(userId: string, requesterId: string) {
  const [a, b] = pair(userId, requesterId);
  const rel = await prisma.friendship.updateMany({
    where: { userAId: a, userBId: b, status: "PENDING" },
    data: { status: "ACCEPTED", actionedBy: userId },
  });
  if (rel.count === 0) return { ok: false, error: "No pending request from that user." };
  await notify({
    userId: requesterId,
    type: "friend_request",
    title: "Friend request accepted",
    body: "You're now connected.",
    link: "/friends",
  });
  return { ok: true };
}

export async function removeFriend(userId: string, otherId: string) {
  const [a, b] = pair(userId, otherId);
  await prisma.friendship.updateMany({
    where: { userAId: a, userBId: b },
    data: { status: "BLOCKED", actionedBy: userId },
  });
  return { ok: true };
}

export async function listFriends(userId: string) {
  const rels = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ userAId: userId }, { userBId: userId }],
    },
  });
  const ids = rels.map((r) => (r.userAId === userId ? r.userBId : r.userAId));
  const users = await prisma.user.findMany({
    where: { id: { in: ids }, status: "active" },
    select: { id: true, username: true, displayName: true, avatarUrl: true, xp: true, level: true },
  });
  return { rels, users };
}

export async function listPendingRequests(userId: string) {
  const rels = await prisma.friendship.findMany({
    where: { status: "PENDING", userBId: userId },
  });
  const ids = rels.map((r) => r.userAId);
  const requesters = await prisma.user.findMany({
    where: { id: { in: ids }, status: "active" },
    select: { id: true, username: true, displayName: true, avatarUrl: true, xp: true, level: true },
  });
  return requesters;
}

export async function searchUsersByUsername(query: string, excludeId: string, take = 8) {
  if (!query.trim()) return [];
  return prisma.user.findMany({
    where: {
      status: "active",
      id: { not: excludeId },
      OR: [{ username: { contains: query.trim() } }, { displayName: { contains: query.trim() } }],
    },
    select: { id: true, username: true, displayName: true, avatarUrl: true, xp: true, level: true },
    take,
  });
}