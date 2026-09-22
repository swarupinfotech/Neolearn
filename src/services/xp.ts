import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { levelFromXp } from "@/services/level";
import { track } from "@/lib/events";

export type XpType =
  | "lesson"
  | "quiz"
  | "challenge"
  | "daily_mission"
  | "course"
  | "project"
  | "achievement";

export interface XpResult {
  granted: boolean;
  newXp?: number;
  newLevel?: number;
  duplicate?: boolean;
  error?: string;
}

/**
 * Authoritative XP award. Writes an immutable XpTransaction and updates
 * the cached user totals inside a transaction. The DB unique constraint
 * (userId, type, sourceId) makes duplicate rewards impossible even under
 * concurrent requests.
 */
export async function awardXp(
  userId: string,
  type: XpType,
  sourceId: string,
  amount: number,
  meta?: Record<string, unknown>
): Promise<XpResult> {
  if (!userId || !sourceId) return { granted: false, error: "bad_args" };
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.xpTransaction.findUnique({
        where: { userId_type_sourceId: { userId, type, sourceId } },
      });
      if (existing) return { granted: false, duplicate: true };

      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) return { granted: false, error: "no_user" };

      const newXp = user.xp + amount;
      const newLevel = levelFromXp(newXp);

      await tx.xpTransaction.create({
        data: { userId, type, sourceId, amount, meta: meta as Prisma.InputJsonValue | undefined },
      });
      await tx.user.update({
        where: { id: userId },
        data: { xp: newXp, level: newLevel },
      });
      return { granted: true, newXp, newLevel };
    });
  } catch (e) {
    void track("xp_error", { type, sourceId, err: String(e) }, userId);
    if (isUniqueError(e)) return { granted: false, duplicate: true };
    throw e;
  }
}

function isUniqueError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("Unique constraint") || msg.includes("P2002");
}