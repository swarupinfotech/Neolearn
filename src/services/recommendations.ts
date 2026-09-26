// ============================================================
// Dashboard recommendations.
//
// Picks content the learner has not started yet, ranked by how well it
// matches their stated interests (onboarding topics, experience level
// and goal) rather than raw popularity alone. Popularity is the
// tie-breaker so the result is still sensible for a user with no
// onboarding data.
// ============================================================

import { prisma } from "@/lib/db";

export interface Recommendation {
  slug: string;
  title: string;
  description: string;
  category: string;
  language: string;
  difficulty: string;
  icon: string;
  color: string;
  rating: number;
  students: number;
  duration: number;
  xpReward: number;
  tags: string[];
  reason: string;
}

function toStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

/** Rough difficulty ladder so a beginner is not handed advanced content. */
const LEVEL_RANK: Record<string, number> = {
  Beginner: 1,
  Intermediate: 2,
  Advanced: 3,
};

/** Which onboarding goal maps to which course categories. */
const GOAL_CATEGORIES: Record<string, string[]> = {
  Cybersecurity: ["Cybersecurity"],
  Career: ["Programming", "Web Development", "Database", "Data & AI", "DevOps & Cloud"],
  College: ["Programming", "Database"],
  Interview: ["Programming", "Web Development", "Data & AI"],
  Projects: ["Web Development", "Data & AI", "Programming"],
  Hobby: ["Programming", "Web Development"],
};

export async function recommendCourses(userId: string, limit = 6): Promise<Recommendation[]> {
  const [onboarding, started] = await Promise.all([
    prisma.onboarding.findUnique({ where: { userId } }),
    prisma.courseProgress.findMany({ where: { userId }, select: { courseId: true, completed: true } }),
  ]);

  const startedIds = new Set(started.map((p) => p.courseId));
  const completedCount = started.filter((p) => p.completed).length;

  const candidates = await prisma.course.findMany({
    where: { status: "PUBLISHED", id: { notIn: [...startedIds] } },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      category: true,
      language: true,
      technology: true,
      tags: true,
      difficulty: true,
      icon: true,
      color: true,
      rating: true,
      students: true,
      duration: true,
      xpReward: true,
      createdAt: true,
    },
  });

  const topics = toStrings(onboarding?.topics).map((t) => t.toLowerCase());
  const goalCategories = GOAL_CATEGORIES[onboarding?.goal ?? ""] ?? [];
  const learnerLevel = onboarding?.experienceLevel ?? "";
  // A learner who has already finished courses can handle harder material.
  const levelCap = LEVEL_RANK[learnerLevel] ? LEVEL_RANK[learnerLevel] + (completedCount >= 2 ? 1 : 0) : 3;

  const scored = candidates.map((c) => {
    const reasons: string[] = [];
    let score = 0;

    const category = c.category.toLowerCase();
    const haystack = [c.language, c.technology ?? "", c.category, ...toStrings(c.tags)]
      .join(" ")
      .toLowerCase();

    if (topics.some((t) => haystack.includes(t))) {
      score += 50;
      reasons.push("matches your interests");
    }
    if (goalCategories.includes(c.category)) {
      score += 25;
      reasons.push("fits your goal");
    }

    const rank = LEVEL_RANK[c.difficulty] ?? 2;
    if (rank <= levelCap) {
      score += 15;
      reasons.push(rank === 1 ? "great for starting out" : "at your level");
    } else {
      // Too hard right now: deprioritise rather than hide, so the catalog
      // still grows as the learner levels up.
      score -= 20;
    }

    score += Math.min(20, c.rating);
    score += Math.min(10, Math.log10(Math.max(1, c.students)) * 4);
    // Newer content surfaces above equal-scoring older content.
    score += Math.max(0, 5 - (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));

    return {
      course: c,
      score,
      reason: reasons[0] ?? "popular with learners",
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ course, reason }) => ({
    slug: course.slug,
    title: course.title,
    description: course.description,
    category: course.category,
    language: course.language,
    difficulty: course.difficulty,
    icon: course.icon,
    color: course.color,
    rating: course.rating,
    students: course.students,
    duration: course.duration,
    xpReward: course.xpReward,
    tags: toStrings(course.tags),
    reason,
  }));
}

export interface NextUpLesson {
  lessonId: string;
  lessonTitle: string;
  courseSlug: string;
  courseTitle: string;
}

/** The single lesson a learner should open next, if any. */
export async function nextLessonFor(userId: string): Promise<NextUpLesson | null> {
  const progress = await prisma.courseProgress.findMany({
    where: { userId, completed: false },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: { courseId: true, lastLessonId: true },
  });
  if (progress.length === 0) return null;

  for (const p of progress) {
    const lessons = await prisma.lesson.findMany({
      where: { module: { courseId: p.courseId, course: { status: "PUBLISHED" } } },
      // Module order first: a lesson's `order` only ranks it within its own
      // module, so sorting by `order` alone would interleave the modules and
      // send a learner to module 2 before they finished module 1.
      orderBy: [{ module: { order: "asc" } }, { order: "asc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        module: { select: { course: { select: { slug: true, title: true } } } },
      },
    });
    if (lessons.length === 0) continue;

    const done = await prisma.lessonProgress.findMany({
      where: { userId, status: "completed", lessonId: { in: lessons.map((l) => l.id) } },
      select: { lessonId: true },
    });
    const doneSet = new Set(done.map((d) => d.lessonId));

    // Resume exactly where the learner stopped when possible.
    const target =
      lessons.find((l) => l.id === p.lastLessonId && !doneSet.has(l.id)) ??
      lessons.find((l) => !doneSet.has(l.id));
    if (target) {
      return {
        lessonId: target.id,
        lessonTitle: target.title,
        courseSlug: target.module.course.slug,
        courseTitle: target.module.course.title,
      };
    }
  }
  return null;
}
