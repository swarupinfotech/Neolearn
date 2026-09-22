import { prisma } from "@/lib/db";
import { awardXp } from "@/services/xp";
import { notify } from "@/services/notifications";

export interface AchievementStat {
  lessonsCompleted: number;
  quizzesPassed: number;
  challengesPassed: number;
  coursesCompleted: number;
  projectsPassed: number;
  xp: number;
  streakLongest: number;
}

export async function getAchievementStats(userId: string): Promise<AchievementStat> {
  const [user, quizzes, challenges, courses, projectsDone, streak] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.quizAttempt.findMany({
      where: { userId, passed: true },
      select: { quizId: true },
      distinct: ["quizId"],
    }),
    prisma.challengeAttempt.findMany({
      where: { userId, hiddenPassed: true },
      select: { challengeId: true },
      distinct: ["challengeId"],
    }),
    prisma.courseProgress.findMany({
      where: { userId, completed: true },
      select: { courseId: true },
    }),
    prisma.projectSubmission.findMany({
      where: { userId, passed: true },
      select: { projectId: true },
      distinct: ["projectId"],
    }),
    prisma.streak.findUnique({ where: { userId } }),
  ]);
  return {
    lessonsCompleted:
      await prisma.lessonProgress.count({ where: { userId, status: "completed" } }),
    quizzesPassed: quizzes.length,
    challengesPassed: challenges.length,
    coursesCompleted: courses.length,
    projectsPassed: projectsDone.length,
    xp: user?.xp ?? 0,
    streakLongest: streak?.longest ?? 0,
  };
}

interface Criteria {
  type: string;
  value?: number;
  field?: string;
}

function evaluate(criteria: Criteria, s: AchievementStat): boolean {
  const value = criteria.value ?? 1;
  switch (criteria.type) {
    case "lessons_completed":
      return s.lessonsCompleted >= value;
    case "quizzes_passed":
      return s.quizzesPassed >= value;
    case "challenges_passed":
      return s.challengesPassed >= value;
    case "courses_completed":
      return s.coursesCompleted >= value;
    case "projects_passed":
      return s.projectsPassed >= value;
    case "xp_total":
      return s.xp >= value;
    case "streak_days":
      return s.streakLongest >= value;
    default:
      return false;
  }
}

/**
 * Re-checks all achievement criteria for a user and awards any newly
 * unlocked achievements (idempotent + server validated).
 */
export async function checkAchievements(userId: string): Promise<string[]> {
  const [stats, achievements, owned] = await Promise.all([
    getAchievementStats(userId),
    prisma.achievement.findMany({ orderBy: { order: "asc" } }),
    prisma.userAchievement.findMany({ where: { userId }, select: { achievementId: true } }),
  ]);
  const ownedSet = new Set(owned.map((o) => o.achievementId));
  const unlocked: string[] = [];

  for (const a of achievements) {
    if (ownedSet.has(a.id)) continue;
    const criteria = (a.criteria as unknown as Criteria) ?? { type: "xp_total" };
    if (!evaluate(criteria, stats)) continue;

    try {
      await prisma.userAchievement.create({ data: { userId, achievementId: a.id } });
    } catch {
      continue; // race: already unlocked
    }
    await awardXp(userId, "achievement", a.key, a.xpReward, { title: a.title });
    await notify({
      userId,
      type: "achievement",
      title: `Achievement unlocked: ${a.title}`,
      body: a.description,
      link: "/achievements",
    });
    unlocked.push(a.key);
  }
  return unlocked;
}

export async function userAchievements(userId: string) {
  return prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { unlockedAt: "desc" },
  });
}