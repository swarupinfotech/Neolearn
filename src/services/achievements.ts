import { prisma } from "@/lib/db";
import { awardXp } from "@/services/xp";
import { notify } from "@/services/notifications";

export interface AchievementStat {
  lessonsCompleted: number;
  quizzesPassed: number;
  challengesPassed: number;
  coursesCompleted: number;
  projectsPassed: number;
  pathsCompleted: number;
  xp: number;
  streakLongest: number;
  /** Per-technology completed-lesson counts, e.g. { Python: 12, SQL: 4 }. */
  lessonsByTechnology: Record<string, number>;
  /** Per-technology passed-challenge counts, e.g. { python: 3 }. */
  challengesByLanguage: Record<string, number>;
  /** Per-category completed-course counts. */
  coursesByCategory: Record<string, number>;
}

export async function getAchievementStats(userId: string): Promise<AchievementStat> {
  const [user, quizzes, challenges, courses, projectsDone, streak, lessonProgress, pathProgress] =
    await Promise.all([
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
      prisma.lessonProgress.findMany({
        where: { userId, status: "completed" },
        select: { lesson: { select: { module: { select: { course: { select: { technology: true, language: true, category: true } } } } } } },
      }),
      prisma.userPathProgress.findMany({
        where: { userId, completed: true },
        select: { pathId: true },
      }),
    ]);

  const lessonsByTechnology: Record<string, number> = {};
  for (const lp of lessonProgress) {
    const course = lp.lesson.module.course;
    const key = course.technology || course.language;
    if (key) lessonsByTechnology[key] = (lessonsByTechnology[key] ?? 0) + 1;
  }

  // Challenge languages are stored lowercase by the content pipeline.
  const challengeRows =
    challenges.length > 0
      ? await prisma.challenge.findMany({
          where: { id: { in: challenges.map((c) => c.challengeId) } },
          select: { id: true, language: true, category: true },
        })
      : [];
  const challengesByLanguage: Record<string, number> = {};
  for (const c of challengeRows) {
    const key = c.language.toLowerCase();
    challengesByLanguage[key] = (challengesByLanguage[key] ?? 0) + 1;
  }

  const courseRows =
    courses.length > 0
      ? await prisma.course.findMany({
          where: { id: { in: courses.map((c) => c.courseId) } },
          select: { category: true },
        })
      : [];
  const coursesByCategory: Record<string, number> = {};
  for (const c of courseRows) {
    coursesByCategory[c.category] = (coursesByCategory[c.category] ?? 0) + 1;
  }

  return {
    lessonsCompleted: lessonProgress.length,
    quizzesPassed: quizzes.length,
    challengesPassed: challenges.length,
    coursesCompleted: courses.length,
    projectsPassed: projectsDone.length,
    pathsCompleted: pathProgress.length,
    xp: user?.xp ?? 0,
    streakLongest: streak?.longest ?? 0,
    lessonsByTechnology,
    challengesByLanguage,
    coursesByCategory,
  };
}

interface Criteria {
  type: string;
  value?: number;
  field?: string;
}

function countFor(s: AchievementStat, field: string | undefined): number {
  if (!field) return 0;
  // "Python" and "python" must both resolve to the same bucket.
  const table = s.lessonsByTechnology;
  if (field in table) return table[field];
  const lower = field.toLowerCase();
  for (const [k, v] of Object.entries(table)) {
    if (k.toLowerCase() === lower) return v;
  }
  return 0;
}

function challengeCountFor(s: AchievementStat, field: string | undefined): number {
  if (!field) return 0;
  const table = s.challengesByLanguage;
  const lower = field.toLowerCase();
  for (const [k, v] of Object.entries(table)) {
    if (k.toLowerCase() === lower) return v;
  }
  return 0;
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
    case "paths_completed":
      return s.pathsCompleted >= value;
    case "xp_total":
      return s.xp >= value;
    case "streak_days":
      return s.streakLongest >= value;
    // "N lessons in <technology>"
    case "technology_lessons":
      return countFor(s, criteria.field) >= value;
    // "N challenges in <language>"
    case "language_challenges":
      return challengeCountFor(s, criteria.field) >= value;
    // "N completed courses in <category>"
    case "category_courses":
      return (s.coursesByCategory[criteria.field ?? ""] ?? 0) >= value;
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