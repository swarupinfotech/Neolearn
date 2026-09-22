import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { awardXp } from "@/services/xp";
import { freshUser } from "./helpers";

describe("awardXp", () => {
  it("grants XP and updates cached totals", async () => {
    await freshUser(async (userId) => {
      const res = await awardXp(userId, "lesson", "lesson-a", 10);
      expect(res.granted).toBe(true);
      expect(res.newXp).toBe(10);

      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(user.xp).toBe(10);
      expect(user.level).toBe(1);

      const txn = await prisma.xpTransaction.findUnique({
        where: { userId_type_sourceId: { userId, type: "lesson", sourceId: "lesson-a" } },
      });
      expect(txn?.amount).toBe(10);
    });
  });

  it("never double-rewards the same source", async () => {
    await freshUser(async (userId) => {
      await awardXp(userId, "quiz", "quiz-a", 20);
      const res = await awardXp(userId, "quiz", "quiz-a", 20);
      expect(res.granted).toBe(false);
      expect(res.duplicate).toBe(true);

      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(user.xp).toBe(20);
    });
  });

  it("levels the user up at thresholds", async () => {
    await freshUser(async (userId) => {
      const res = await awardXp(userId, "challenge", "c1", 100);
      expect(res.granted).toBe(true);
      expect(res.newLevel).toBe(2);
    });
  });

  it("returns no_user for unknown users", async () => {
    const res = await awardXp("missing-user", "lesson", "l", 10);
    expect(res.granted).toBe(false);
    expect(res.error).toBe("no_user");
  });
});