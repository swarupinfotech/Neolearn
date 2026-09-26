// ============================================================
// Daily mission generation.
//
// A mission is a per-UTC-day row. The set of task types rotates on a
// fixed, deterministic cycle so a learner's day is varied but the seed
// stays idempotent (the same dateKey always produces the same tasks).
//
// The rotation deliberately always includes one core action (lesson,
// quiz or challenge) so the daily loop stays achievable, and mixes in
// the harder asks — strong quiz scores, project milestones and review
// activity.
// ============================================================

export interface DailyTask {
  key: string;
  label: string;
  target: number;
}

/**
 * Canonical copy for every task key a mission can ask for. Kept in step
 * with ALL_DAILY_TASKS in src/services/daily.ts — labels are looked up
 * here so the two can never drift apart.
 */
const TASK_COPY: Record<string, { label: string; target: number }> = {
  lesson: { label: "Complete 1 lesson", target: 1 },
  quiz: { label: "Pass 1 quiz", target: 1 },
  quiz_high_score: { label: "Score 80%+ on a quiz", target: 1 },
  challenge: { label: "Solve 1 coding challenge", target: 1 },
  project: { label: "Get a project submission to pass", target: 1 },
  review: { label: "Review 1 completed lesson", target: 1 },
};

/** Expand a list of task keys into full tasks using the canonical copy. */
function tasks(...keys: string[]): DailyTask[] {
  return keys.map((key) => {
    const copy = TASK_COPY[key];
    if (!copy) throw new Error(`Unknown daily mission task key: ${key}`);
    return { key, label: copy.label, target: copy.target };
  });
}

/**
 * Rotation pool, listed as task keys. Every set opens with a core action
 * (lesson, quiz or challenge) so the daily loop stays achievable, and
 * mixes in the harder asks.
 */
const MISSION_SET_KEYS: string[][] = [
  ["lesson", "challenge"],
  ["quiz", "quiz_high_score", "lesson"],
  ["lesson", "project"],
  ["challenge", "review", "quiz"],
  ["lesson", "quiz_high_score"],
  ["quiz", "project", "lesson"],
  ["challenge", "quiz_high_score"],
  ["lesson", "review", "challenge"],
];

/** Days of missions generated ahead of today. */
export const MISSION_HORIZON_DAYS = 14;

/** UTC date key, matching src/lib/utils.ts. */
export function missionDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The task set for an absolute day offset from today. */
export function missionTasksForOffset(offset: number): DailyTask[] {
  // Days since a fixed epoch so the cycle never shifts with "today".
  const epochDay = Math.floor(Date.UTC(2026, 0, 1) / 86400000);
  const todayDay = Math.floor(Date.now() / 86400000);
  const day = todayDay + offset;
  const len = MISSION_SET_KEYS.length;
  const index = (((day - epochDay) % len) + len) % len;
  return tasks(...MISSION_SET_KEYS[index]);
}

export function buildMissions(
  rewardXp: number,
  horizon = MISSION_HORIZON_DAYS
): { dateKey: string; tasks: DailyTask[]; rewardXp: number }[] {
  const out: { dateKey: string; tasks: DailyTask[]; rewardXp: number }[] = [];
  const now = new Date();
  for (let offset = 0; offset < horizon; offset += 1) {
    const d = new Date(now.getTime() + offset * 86400000);
    out.push({ dateKey: missionDateKey(d), tasks: missionTasksForOffset(offset), rewardXp });
  }
  return out;
}
