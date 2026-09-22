import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { getDailyMission, recordDailyTask, claimDailyReward } from "@/services/daily";
import { freshUser } from "./helpers";
import { dateKey } from "@/lib/utils";

describe("daily missions", () => {
  it("starts incomplete and rewards once all tasks are done", async () => {
    await freshUser(async (userId) => {
      const mission = await prisma.dailyMission.findUnique({ where: { dateKey: dateKey(new Date()) } });
      if (mission) {
        // clean any pre-existing row for this user/mission
        await prisma.userDailyMission.deleteMany({ where: { userId, dailyMissionId: mission.id } });
      }

      const initial = await getDailyMission(userId);
      expect(initial.tasks.length).toBe(3);
      expect(initial.allComplete).toBe(false);
      expect(initial.claimed).toBe(false);

      await recordDailyTask(userId, "lesson", true);
      await recordDailyTask(userId, "quiz", true);
      const mid = await getDailyMission(userId);
      expect(mid.allComplete).toBe(false);

      await recordDailyTask(userId, "challenge", true);
      const state = await getDailyMission(userId);
      expect(state.allComplete).toBe(true);

      const claim = await claimDailyReward(userId);
      expect(claim.ok).toBe(true);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(state.rewardXp);

      const again = await claimDailyReward(userId);
      expect(again.ok).toBe(false);
      // XP unchanged after double-claim attempt
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(state.rewardXp);

      // idempotent task records don't inflate anything
      await recordDailyTask(userId, "lesson", true);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(state.rewardXp);
    });
  });

  it("refuses to claim while tasks are pending", async () => {
    await freshUser(async (userId) => {
      const claim = await claimDailyReward(userId);
      expect(claim.ok).toBe(false);
    });
  });
});