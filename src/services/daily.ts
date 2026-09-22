import { prisma } from "@/lib/db";
import { dateKey } from "@/lib/utils";
import { awardXp } from "@/services/xp";
import { XP_REWARDS } from "@/lib/constants";

export const DAILY_TASKS = [
  { key: "lesson", label: "Complete 1 lesson", target: 1 },
  { key: "quiz", label: "Pass 1 quiz", target: 1 },
  { key: "challenge", label: "Solve 1 coding challenge", target: 1 },
] as const;

export type DailyTaskKey = (typeof DAILY_TASKS)[number]["key"];

export interface DailyState {
  dateKey: string;
  tasks: { key: string; label: string; target: number; done: number }[];
  rewardXp: number;
  allComplete: boolean;
  claimed: boolean;
}

export async function getDailyMission(userId: string): Promise<DailyState> {
  const today = dateKey(new Date());
  const mission =
    (await prisma.dailyMission.findUnique({ where: { dateKey: today } })) ??
    (await prisma.dailyMission.create({
      data: { dateKey: today, tasks: DAILY_TASKS as unknown as object[], rewardXp: XP_REWARDS.daily_mission },
    }));

  const userMission = await prisma.userDailyMission.findUnique({
    where: { userId_dailyMissionId: { userId, dailyMissionId: mission.id } },
  });

  const tasksDone: Record<string, boolean> = (userMission?.tasksDone as Record<string, boolean>) ?? {};

  const tasks = (mission.tasks as { key: string; label: string; target: number }[]).map((t) => ({
    key: t.key,
    label: t.label,
    target: t.target,
    done: tasksDone[t.key] ? t.target : 0,
  }));
  const allComplete = tasks.every((t) => t.done >= t.target);

  return {
    dateKey: today,
    tasks,
    rewardXp: mission.rewardXp,
    allComplete,
    claimed: userMission?.claimedXp ?? false,
  };
}

/** Mark progress without allowing resets (only ever goes forward). */
export async function recordDailyTask(userId: string, key: DailyTaskKey, done: boolean) {
  if (!done) return;
  const state = await getDailyMission(userId);
  const now = new Date();
  const mission = await prisma.dailyMission.upsert({
    where: { dateKey: dateKey(now) },
    update: {},
    create: { dateKey: dateKey(now), tasks: DAILY_TASKS as unknown as object[], rewardXp: XP_REWARDS.daily_mission },
  });
  if (state.claimed) return;

  const existing = await prisma.userDailyMission.findUnique({
    where: { userId_dailyMissionId: { userId, dailyMissionId: mission.id } },
  });
  const tasksDone: Record<string, boolean> = (existing?.tasksDone as Record<string, boolean>) ?? {};
  if (tasksDone[key]) return; // already done today
  tasksDone[key] = true;

  await prisma.userDailyMission.upsert({
    where: { userId_dailyMissionId: { userId, dailyMissionId: mission.id } },
    update: { tasksDone: tasksDone as object },
    create: { userId, dailyMissionId: mission.id, tasksDone: tasksDone as object },
  });
}

/** Claim daily reward — server validates all tasks complete. */
export async function claimDailyReward(userId: string) {
  const state = await getDailyMission(userId);
  if (!state.allComplete) return { ok: false, error: "Daily mission not complete yet." };
  if (state.claimed) return { ok: false, error: "Already claimed." };

  const result = await awardXp(userId, "daily_mission", dateKey(new Date()), state.rewardXp, {
    mission: dateKey(new Date()),
  });
  if (!result.granted) return { ok: false, error: "Reward already granted." };

  const mission = await prisma.dailyMission.findUnique({ where: { dateKey: dateKey(new Date()) } });
  if (mission) {
    await prisma.userDailyMission.upsert({
      where: { userId_dailyMissionId: { userId, dailyMissionId: mission.id } },
      update: { claimedXp: true, completedAt: new Date() },
      create: {
        userId,
        dailyMissionId: mission.id,
        tasksDone: (() => {
          const map: Record<string, boolean> = {};
          for (const t of state.tasks) map[t.key] = true;
          return map as object;
        })(),
        claimedXp: true,
        completedAt: new Date(),
      },
    });
  }
  return { ok: true, xp: state.rewardXp };
}