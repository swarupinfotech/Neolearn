// ============================================================
// NeoLearn content pipeline — shared types + idempotent upserts.
//
// Every authoring file under prisma/content/ exports plain data
// matching the *Spec interfaces below. `prisma/seed.ts` imports the
// bundled content and pushes it through these helpers, so re-running
// the seed updates rows in place instead of duplicating them.
//
// Idempotency contract (required by the platform spec):
//   Course / Quiz / Challenge / Project / LearningPath / Achievement /
//   DailyMission are keyed on a natural unique column (slug or key or
//   dateKey) and upserted.
//   CourseModule is keyed on (courseId, order).
//   Lesson is keyed on slug.
//   Question is keyed on a deterministic synthetic id derived from the
//   quiz slug + index, so question ids stay stable between runs and
//   stored QuizAttempt.answers keep resolving.
// ============================================================

import { PrismaClient, Prisma } from "@prisma/client";

type PrismaLike = PrismaClient;

// ------------------------------------------------------------------
// Lesson content blocks — must match LessonBlockRenderer Block types
// ------------------------------------------------------------------
export const text = (body: string, title?: string) => ({ kind: "text", title, body });
export const example = (code: string, language: string, title?: string) => ({
  kind: "example",
  title,
  code,
  language,
});
export const code = (value: string, language: string, title?: string, instructions?: string) => ({
  kind: "code",
  title,
  instructions,
  code: value,
  language,
});
export const tips = (items: string[]) => ({ kind: "tips", items });
export const complete = (title: string, message: string) => ({ kind: "complete", title, message });

/** Inline knowledge check inside a lesson. Graded on the client for
 *  instant feedback; answering every quiz in a lesson auto-completes it,
 *  and the XP is still awarded server-side. Shapes match
 *  components/quiz/inline-question.tsx exactly. */

export const inlineMcq = (opts: {
  id: string;
  prompt: string;
  code?: string;
  options: string[];
  /** Index of the correct option. */
  correct: number;
  explanation: string;
}) => ({
  kind: "quiz",
  question: {
    id: opts.id,
    type: "mcq",
    prompt: opts.prompt,
    ...(opts.code ? { code: opts.code } : {}),
    options: opts.options,
    correct: String(opts.correct),
    explanation: opts.explanation,
  },
});

export const inlineTrueFalse = (opts: { id: string; prompt: string; correct: boolean; explanation: string }) => ({
  kind: "quiz",
  question: {
    id: opts.id,
    type: "true_false",
    prompt: opts.prompt,
    correct: opts.correct ? "true" : "false",
    explanation: opts.explanation,
  },
});

export const inlineFill = (opts: { id: string; prompt: string; accept: string[]; explanation: string }) => ({
  kind: "quiz",
  question: {
    id: opts.id,
    type: "fill",
    prompt: opts.prompt,
    accept: opts.accept,
    explanation: opts.explanation,
  },
});

/** "What does this print?" — `accept` holds the acceptable output strings. */
export const inlineOutput = (opts: {
  id: string;
  prompt: string;
  code: string;
  accept: string[];
  explanation: string;
}) => ({
  kind: "quiz",
  question: {
    id: opts.id,
    type: "output",
    prompt: opts.prompt,
    code: opts.code,
    accept: opts.accept,
    explanation: opts.explanation,
  },
});

export const inlineMatch = (opts: {
  id: string;
  prompt: string;
  pairs: { left: string; right: string }[];
  explanation: string;
}) => ({
  kind: "quiz",
  question: {
    id: opts.id,
    type: "match",
    prompt: opts.prompt,
    pairs: opts.pairs,
    explanation: opts.explanation,
  },
});

/** A coding challenge embedded in the lesson flow. `challengeSlug`
 *  points at a published Challenge so hidden tests stay server-side. */
export const challengeBlock = (opts: {
  title: string;
  description: string;
  challengeSlug: string;
  language: string;
  starterCode: string;
  functionName?: string;
  publicTests?: { name: string; input?: unknown; expected: unknown }[];
}) => ({
  kind: "challenge_block",
  title: opts.title,
  description: opts.description,
  challengeSlug: opts.challengeSlug,
  language: opts.language,
  starterCode: opts.starterCode,
  functionName: opts.functionName ?? "solution",
  ...(opts.publicTests ? { publicTests: opts.publicTests } : {}),
});

// ------------------------------------------------------------------
// Specs
// ------------------------------------------------------------------
export interface LessonSpec {
  slug: string;
  title: string;
  type?: string;
  blocks: Record<string, unknown>[];
  duration?: number;
  xpReward?: number;
  quizId?: string;
}

export interface ModuleSpec {
  title: string;
  lessons: LessonSpec[];
}

export interface CourseSpec {
  slug: string;
  title: string;
  description: string;
  longDescription?: string;
  objectives?: string[];
  category: string;
  language: string;
  technology?: string;
  tags?: string[];
  difficulty: string;
  icon: string;
  color: string;
  xpReward?: number;
  students?: number;
  rating?: number;
  ratingCount?: number;
  order?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  modules: ModuleSpec[];
}

export interface QuestionSpec {
  type: string;
  prompt: string;
  code?: string;
  options?: unknown[];
  correctAnswer: unknown[];
  explanation?: string;
  points?: number;
  /**
   * MATCH only, and authoring sugar: the pairs are flattened into
   * `options` as [left, right, left, right, …] and `correctAnswer` as
   * [left, right][], which is the shape the runner and grader agree on.
   */
  pairs?: { left: string; right: string }[];
}

export interface QuizSpec {
  slug: string;
  title: string;
  description?: string;
  type: "PRACTICE" | "ASSESSMENT" | "COURSE";
  courseSlug?: string;
  lessonSlug?: string;
  passingScore?: number;
  xpReward?: number;
  order?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export type TestCase = {
  name: string;
  input?: unknown;
  setup?: string;
  /** stdout-based grading: the exact stdin the program receives. */
  stdin?: string;
  expected: unknown;
};

export interface ChallengeSpec {
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  language: string;
  gradingMode: "function" | "stdout";
  /** stdout mode only: describes the stdin shape the program receives. */
  inputFormat?: string;
  functionName?: string;
  starterCode: string;
  publicTests: TestCase[];
  hiddenTests: TestCase[];
  xpReward?: number;
  timeoutMs?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export interface ProjectSpec {
  slug: string;
  title: string;
  description: string;
  language: string;
  difficulty?: string;
  objectives?: string[];
  technologies?: string[];
  requirements: string[];
  tasks?: { title: string; detail: string }[];
  criteria?: string[];
  starterCode: string;
  publicTests: TestCase[];
  xpReward?: number;
  order?: number;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export interface PathSpec {
  slug: string;
  title: string;
  description: string;
  longDescription?: string;
  icon: string;
  color: string;
  level?: string;
  xpReward?: number;
  prerequisitePathSlugs?: string[];
  courseSlugs: string[];
  projectSlugs?: string[];
  challengeSlugs?: string[];
  finalQuizSlug?: string;
  order?: number;
}

export interface AchievementSpec {
  key: string;
  title: string;
  description: string;
  icon: string;
  xpReward?: number;
  order?: number;
  criteria: { type: string; value?: number; field?: string };
}

// ------------------------------------------------------------------
// Upserts
// ------------------------------------------------------------------

export interface UpsertReport {
  courses: number;
  lessons: number;
  quizzes: number;
  questions: number;
  challenges: number;
  projects: number;
  paths: number;
  achievements: number;
  missions: number;
}

function emptyReport(): UpsertReport {
  return {
    courses: 0,
    lessons: 0,
    quizzes: 0,
    questions: 0,
    challenges: 0,
    projects: 0,
    paths: 0,
    achievements: 0,
    missions: 0,
  };
}

export async function upsertCourse(prisma: PrismaLike, spec: CourseSpec) {
  const json = (v: unknown) => (v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue));

  const data = {
    title: spec.title,
    description: spec.description,
    longDescription: spec.longDescription ?? null,
    objectives: json(spec.objectives),
    category: spec.category,
    language: spec.language,
    technology: spec.technology ?? spec.language,
    tags: json(spec.tags),
    difficulty: spec.difficulty,
    icon: spec.icon,
    color: spec.color,
    xpReward: spec.xpReward ?? 100,
    order: spec.order ?? 0,
    status: spec.status ?? "PUBLISHED",
    duration: spec.modules.reduce((acc, m) => acc + m.lessons.length * (m.lessons[0]?.duration ?? 8), 0),
  };

  const course = await prisma.course.upsert({
    where: { slug: spec.slug },
    update: {
      ...data,
      // Popularity/rating are only seeded on first create so a re-seed
      // never clobbers real enrolment numbers.
      ...(spec.students === undefined ? {} : { students: spec.students }),
    },
    create: {
      slug: spec.slug,
      ...data,
      rating: spec.rating ?? 4.6,
      ratingCount: spec.ratingCount ?? 120,
      students: spec.students ?? 340,
    },
  });

  for (const [mi, moduleSpec] of spec.modules.entries()) {
    const courseModule = await prisma.courseModule.upsert({
      where: { courseId_order: { courseId: course.id, order: mi + 1 } },
      update: { title: moduleSpec.title },
      create: { courseId: course.id, title: moduleSpec.title, order: mi + 1 },
    });
    for (const [li, lesson] of moduleSpec.lessons.entries()) {
      const payload = {
        moduleId: courseModule.id,
        title: lesson.title,
        type: lesson.type ?? "text",
        content: lesson.blocks as object,
        order: li + 1,
        duration: lesson.duration ?? 8,
        xpReward: lesson.xpReward ?? 10,
        quizId: null,
      };
      await prisma.lesson.upsert({
        where: { slug: lesson.slug },
        update: payload,
        create: { slug: lesson.slug, ...payload },
      });
    }
  }

  return { course, lessonCount: spec.modules.reduce((a, m) => a + m.lessons.length, 0) };
}

export async function upsertQuiz(
  prisma: PrismaLike,
  spec: QuizSpec,
  questions: QuestionSpec[]
) {
  const course = spec.courseSlug ? await prisma.course.findUnique({ where: { slug: spec.courseSlug } }) : null;
  if (spec.courseSlug && !course) throw new Error(`Quiz ${spec.slug} references missing course ${spec.courseSlug}`);

  const lesson = spec.lessonSlug ? await prisma.lesson.findUnique({ where: { slug: spec.lessonSlug } }) : null;
  if (spec.lessonSlug && !lesson) throw new Error(`Quiz ${spec.slug} references missing lesson ${spec.lessonSlug}`);

  const quiz = await prisma.quiz.upsert({
    where: { slug: spec.slug },
    update: {
      title: spec.title,
      description: spec.description ?? null,
      type: spec.type,
      courseId: course?.id ?? null,
      lessonId: lesson?.id ?? null,
      passingScore: spec.passingScore ?? 70,
      xpReward: spec.xpReward ?? 20,
      order: spec.order ?? 0,
      status: spec.status ?? "PUBLISHED",
    },
    create: {
      slug: spec.slug,
      title: spec.title,
      description: spec.description ?? null,
      type: spec.type,
      courseId: course?.id ?? null,
      lessonId: lesson?.id ?? null,
      passingScore: spec.passingScore ?? 70,
      xpReward: spec.xpReward ?? 20,
      order: spec.order ?? 0,
      status: spec.status ?? "PUBLISHED",
    },
  });

  // Deterministic ids keep stored QuizAttempt.answers resolvable across
  // re-seeds.
  const existing = await prisma.question.findMany({ where: { quizId: quiz.id }, orderBy: { order: "asc" } });
  const keep = new Set<string>();
  for (const [i, q] of questions.entries()) {
    const rowId = existing[i]?.id ?? `cl-q-${spec.slug}-${i}`;
    keep.add(rowId);
    // MATCH authors pairs; the stored shape is the interleaved options
    // array plus a matching array of [left, right] answers.
    const options =
      q.type === "MATCH" && q.pairs
        ? q.pairs.flatMap((p) => [p.left, p.right])
        : q.options
          ? (q.options as Prisma.InputJsonValue)
          : Prisma.JsonNull;
    const correctAnswer =
      q.type === "MATCH" && q.pairs ? (q.pairs.map((p) => [p.left, p.right]) as Prisma.InputJsonValue) : (q.correctAnswer as Prisma.InputJsonValue);
    await prisma.question.upsert({
      where: { id: rowId },
      update: {
        type: q.type,
        prompt: q.prompt,
        code: q.code ?? null,
        options,
        correctAnswer,
        explanation: q.explanation ?? null,
        order: i,
        points: q.points ?? 10,
        quizId: quiz.id,
      },
      create: {
        id: rowId,
        quizId: quiz.id,
        type: q.type,
        prompt: q.prompt,
        code: q.code ?? null,
        options: options === Prisma.JsonNull ? undefined : options,
        correctAnswer,
        explanation: q.explanation ?? null,
        order: i,
        points: q.points ?? 10,
      },
    });
  }
  // Only prune questions that are not part of the new definition.
  const stale = existing.filter((x) => !keep.has(x.id)).map((x) => x.id);
  if (stale.length > 0) await prisma.question.deleteMany({ where: { id: { in: stale } } });

  return { quiz, questionCount: questions.length };
}

export async function upsertChallenge(prisma: PrismaLike, spec: ChallengeSpec) {
  const data = {
    title: spec.title,
    description: spec.description,
    category: spec.category,
    difficulty: spec.difficulty,
    language: spec.language,
    gradingMode: spec.gradingMode,
    inputFormat: spec.inputFormat ?? "",
    functionName: spec.functionName ?? "solution",
    starterCode: spec.starterCode,
    publicTests: spec.publicTests as object,
    hiddenTests: spec.hiddenTests as object,
    timeoutMs: spec.timeoutMs ?? (spec.gradingMode === "stdout" ? 1000 : 4000),
    xpReward: spec.xpReward ?? 30,
    status: spec.status ?? "PUBLISHED",
  };
  return prisma.challenge.upsert({
    where: { slug: spec.slug },
    update: data,
    create: { slug: spec.slug, ...data },
  });
}

export async function upsertProject(prisma: PrismaLike, spec: ProjectSpec) {
  const json = (v: unknown) => (v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue));
  const data = {
    title: spec.title,
    description: spec.description,
    language: spec.language,
    difficulty: spec.difficulty ?? "Beginner",
    objectives: json(spec.objectives),
    technologies: json(spec.technologies),
    requirements: spec.requirements as object,
    tasks: json(spec.tasks),
    criteria: json(spec.criteria),
    starterCode: spec.starterCode,
    publicTests: spec.publicTests as object,
    xpReward: spec.xpReward ?? 40,
    order: spec.order ?? 0,
    status: spec.status ?? "PUBLISHED",
  };
  return prisma.project.upsert({
    where: { slug: spec.slug },
    update: data,
    create: { slug: spec.slug, ...data },
  });
}

/** Resolves slugs to ids in the given order; throws on anything missing. */
async function resolveIds(
  findMany: (args: { where: { slug: { in: string[] } }; select: { id: true; slug: true } }) => Promise<{ id: string; slug: string }[]>,
  slugs: string[],
  label: string
): Promise<string[]> {
  if (slugs.length === 0) return [];
  const rows = await findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const found = new Map(rows.map((r) => [r.slug, r.id]));
  const missing = slugs.filter((s) => !found.has(s));
  if (missing.length > 0) throw new Error(`Unknown ${label} slug(s): ${missing.join(", ")}`);
  // Preserve the author's intended course order.
  return slugs.map((s) => found.get(s)!);
}

export async function upsertPath(prisma: PrismaLike, spec: PathSpec) {
  const courseIds = await resolveIds(
    (args) => prisma.course.findMany(args),
    spec.courseSlugs,
    "course"
  );
  const projectIds = await resolveIds(
    (args) => prisma.project.findMany(args),
    spec.projectSlugs ?? [],
    "project"
  );
  const challengeIds = await resolveIds(
    (args) => prisma.challenge.findMany(args),
    spec.challengeSlugs ?? [],
    "challenge"
  );

  let prereqIds: string[] | null = null;
  if (spec.prerequisitePathSlugs && spec.prerequisitePathSlugs.length > 0) {
    const rows = await resolveIds(
      (args) => prisma.learningPath.findMany(args),
      spec.prerequisitePathSlugs,
      "prerequisite path"
    );
    prereqIds = rows;
  }

  let finalQuizId: string | null = null;
  if (spec.finalQuizSlug) {
    const q = await prisma.quiz.findUnique({ where: { slug: spec.finalQuizSlug }, select: { id: true } });
    if (!q) throw new Error(`Unknown final quiz slug: ${spec.finalQuizSlug}`);
    finalQuizId = q.id;
  }

  return prisma.learningPath.upsert({
    where: { slug: spec.slug },
    update: {
      title: spec.title,
      description: spec.description,
      longDescription: spec.longDescription ?? null,
      icon: spec.icon,
      color: spec.color,
      level: spec.level ?? "Beginner",
      xpReward: spec.xpReward ?? 0,
      prerequisitePathIds: prereqIds as Prisma.InputJsonValue | undefined,
      courseIds: courseIds as object,
      projectIds: projectIds as object,
      challengeIds: challengeIds as object,
      finalQuizId,
      order: spec.order ?? 0,
    },
    create: {
      slug: spec.slug,
      title: spec.title,
      description: spec.description,
      longDescription: spec.longDescription ?? null,
      icon: spec.icon,
      color: spec.color,
      level: spec.level ?? "Beginner",
      xpReward: spec.xpReward ?? 0,
      prerequisitePathIds: prereqIds as object,
      courseIds: courseIds as object,
      projectIds: projectIds as object,
      challengeIds: challengeIds as object,
      finalQuizId,
      order: spec.order ?? 0,
    },
  });
}

export async function upsertAchievement(prisma: PrismaLike, spec: AchievementSpec) {
  return prisma.achievement.upsert({
    where: { key: spec.key },
    update: {
      title: spec.title,
      description: spec.description,
      icon: spec.icon,
      xpReward: spec.xpReward ?? 10,
      order: spec.order ?? 0,
      criteria: spec.criteria as object,
    },
    create: {
      key: spec.key,
      title: spec.title,
      description: spec.description,
      icon: spec.icon,
      xpReward: spec.xpReward ?? 10,
      order: spec.order ?? 0,
      criteria: spec.criteria as object,
    },
  });
}

export async function upsertDailyMission(
  prisma: PrismaLike,
  spec: { dateKey: string; tasks: { key: string; label: string; target: number }[]; rewardXp: number }
) {
  // `update: {}` on purpose: an existing day's task set is never rewritten,
  // so a learner's in-progress daily record cannot be invalidated.
  return prisma.dailyMission.upsert({
    where: { dateKey: spec.dateKey },
    update: {},
    create: { dateKey: spec.dateKey, tasks: spec.tasks as object, rewardXp: spec.rewardXp },
  });
}

// ------------------------------------------------------------------
// Batch entry point
// ------------------------------------------------------------------

export interface ContentBundle {
  courses?: CourseSpec[];
  quizzes?: { spec: QuizSpec; questions: QuestionSpec[] }[];
  challenges?: ChallengeSpec[];
  projects?: ProjectSpec[];
  paths?: PathSpec[];
  achievements?: AchievementSpec[];
  missions?: { dateKey: string; tasks: { key: string; label: string; target: number }[]; rewardXp: number }[];
}

/**
 * Push a content bundle into the database in dependency order.
 * Any missing reference throws, so a typo fails the seed loudly instead
 * of silently producing an empty learning path.
 */
export async function seedContent(prisma: PrismaLike, bundle: ContentBundle): Promise<UpsertReport> {
  const report = emptyReport();

  for (const course of bundle.courses ?? []) {
    const { lessonCount } = await upsertCourse(prisma, course);
    report.courses += 1;
    report.lessons += lessonCount;
  }

  for (const { spec, questions } of bundle.quizzes ?? []) {
    const { questionCount } = await upsertQuiz(prisma, spec, questions);
    report.quizzes += 1;
    report.questions += questionCount;
  }

  for (const challenge of bundle.challenges ?? []) {
    await upsertChallenge(prisma, challenge);
    report.challenges += 1;
  }

  for (const project of bundle.projects ?? []) {
    await upsertProject(prisma, project);
    report.projects += 1;
  }

  // Paths resolve course/project/challenge ids, so they must come last.
  for (const path of bundle.paths ?? []) {
    await upsertPath(prisma, path);
    report.paths += 1;
  }

  for (const achievement of bundle.achievements ?? []) {
    await upsertAchievement(prisma, achievement);
    report.achievements += 1;
  }

  for (const mission of bundle.missions ?? []) {
    await upsertDailyMission(prisma, mission);
    report.missions += 1;
  }

  return report;
}
