import { prisma } from "@/lib/db";
import { createHash, randomBytes } from "node:crypto";
import { rateLimit, actorKey } from "@/lib/rate-limit";
import { STRICT_RATE_LIMITS } from "@/lib/constants";
import { lessonProgressInput } from "@/lib/validation";
import { awardXp } from "@/services/xp";
import { recordDailyTask } from "@/services/daily";
import { recordActivity } from "@/services/streak";
import { checkAchievements } from "@/services/achievements";
import { notify } from "@/services/notifications";
import { track } from "@/lib/events";

export interface LessonCompleteResult {
  ok: boolean;
  lessonCompleted: boolean;
  lessonRewarded: boolean;
  courseCompleted: boolean;
  courseRewarded: boolean;
  courseId: string;
  xp: number;
}

/** Server-authoritative lesson completion accounting. */
export async function completeLesson(
  userId: string,
  lessonId: string,
  input: unknown,
  ip: string
): Promise<LessonCompleteResult | { ok: false; error: string }> {
  const parsed = lessonProgressInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const rl = await rateLimit(actorKey("lesson", `${userId}:${ip}`), { limit: 60, windowSec: 60 });
  if (!rl.ok) return { ok: false, error: "Too many actions. Slow down." };

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson) return { ok: false, error: "Lesson not found." };
  const courseId = lesson.module.courseId;
  const course = lesson.module.course;

  const pct = Math.max(0, Math.min(100, parsed.data.progressPct));
  const completed = parsed.data.completed;

  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    update: {
      status: completed ? "completed" : pct >= 100 ? "completed" : "in_progress",
      progressPct: pct,
      completedAt: completed || pct >= 100 ? new Date() : undefined,
    },
    create: {
      userId,
      lessonId,
      status: completed || pct >= 100 ? "completed" : "in_progress",
      progressPct: pct,
      completedAt: completed || pct >= 100 ? new Date() : undefined,
    },
  });

  const alreadyCompleted = progress.status === "completed" && (completed || pct >= 100);
  let lessonRewarded = false;
  let xpEarned = 0;

  if (alreadyCompleted) {
    const res = await awardXp(userId, "lesson", lesson.id, lesson.xpReward, {
      lesson: lesson.title,
    });
    lessonRewarded = res.granted;
    xpEarned += lessonRewarded ? lesson.xpReward : 0;
    await recordActivity(userId);
    await recordDailyTask(userId, "lesson", true);
    void track("lesson_complete", { lessonId }, userId);
  }

  // Course progress accounting (idempotent).
  const totalLessons = await prisma.lesson.count({
    where: { module: { courseId } },
  });
  const completedCount = await prisma.lessonProgress.count({
    where: { userId, status: "completed", lesson: { module: { courseId } } },
  });

  const cp = await prisma.courseProgress.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {
      completedLessons: completedCount,
      totalLessons,
      completed: completedCount >= totalLessons,
      completedAt: completedCount >= totalLessons ? new Date() : undefined,
      lastLessonId: lessonId,
    },
    create: {
      userId,
      courseId,
      completedLessons: completedCount,
      totalLessons,
      completed: completedCount >= totalLessons,
      completedAt: completedCount >= totalLessons ? new Date() : undefined,
      lastLessonId: lessonId,
    },
  });

  const courseCompleted = cp.completed;
  let courseRewarded = false;
  if (courseCompleted) {
    const cres = await awardXp(userId, "course", courseId, 100, { course: course.title });
    courseRewarded = cres.granted;
    if (cres.granted) {
      await notify({
        userId,
        type: "course_completion",
        title: `Course completed: ${course.title}`,
        body: "+100 XP",
        link: `/courses/${course.slug}`,
      });
      await checkAchievements(userId);
    }
  }

  void track("lesson_complete", { lessonId }, userId);

  return {
    ok: true,
    lessonCompleted: alreadyCompleted,
    lessonRewarded,
    courseCompleted,
    courseRewarded,
    courseId,
    xp: xpEarned + (courseRewarded ? 100 : 0),
  };
}

/** Course completion percentage for a user. */
export async function courseProgressFor(userId: string, courseId: string) {
  return prisma.courseProgress.findUnique({ where: { userId_courseId: { userId, courseId } } });
}

// ------------------------------------------------------------------
// Learning paths + certificates
// ------------------------------------------------------------------

export async function updatePathProgress(userId: string, pathId: string) {
  const path = await prisma.learningPath.findUnique({ where: { id: pathId } });
  if (!path) return;

  const courseIds = (path.courseIds as string[]) ?? [];
  const challengeIds = (path.challengeIds as string[]) ?? [];
  const projectIds = (path.projectIds as string[]) ?? [];

  const [courseProgress, challenges, projects] = await Promise.all([
    prisma.courseProgress.findMany({
      where: { userId, courseId: { in: courseIds }, completed: true },
      select: { courseId: true },
    }),
    prisma.challengeAttempt.findMany({
      where: { userId, challengeId: { in: challengeIds }, hiddenPassed: true },
      select: { challengeId: true },
      distinct: ["challengeId"],
    }),
    prisma.projectSubmission.findMany({
      where: { userId, projectId: { in: projectIds }, passed: true },
      select: { projectId: true },
      distinct: ["projectId"],
    }),
  ]);

  const total = courseIds.length + challengeIds.length + projectIds.length || 1;
  const done =
    courseProgress.length + challenges.length + projects.length;
  const progress = Math.round((done / total) * 100);
  const completed = done >= total;

  const prev = await prisma.userPathProgress.findUnique({
    where: { userId_pathId: { userId, pathId } },
  });
  const now = new Date();

  await prisma.userPathProgress.upsert({
    where: { userId_pathId: { userId, pathId } },
    update: {
      progress,
      completed,
      completedAt: completed && !prev?.completed ? now : prev?.completedAt,
    },
    create: { userId, pathId, progress, completed, completedAt: completed ? now : undefined },
  });

  if (completed && !prev?.completed) {
    await issueCertificate(userId, path);
  }
  return { progress, completed };
}

/** Issue a verifiable, unforgeable certificate. */
export async function issueCertificate(userId: string, path: { id: string; title: string; slug: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const existing = await prisma.certificate.findFirst({ where: { userId, pathId: path.id } });
  if (existing) return existing;

  const code = generateCertificateCode(user.id, path.id);
  const cert = await prisma.certificate.create({
    data: {
      userId,
      pathId: path.id,
      code,
      userName: user.displayName,
      pathTitle: path.title,
    },
  });
  await awardXp(userId, "achievement", `certificate:${path.id}`, 50, { path: path.title });
  await notify({
    userId,
    type: "course_completion",
    title: `Certificate earned: ${path.title}`,
    body: "View your certificate",
    link: `/certificates`,
  });
  return cert;
}

export function generateCertificateCode(userId: string, pathId: string): string {
  const digest = createHash("sha256").update(`${userId}:${pathId}:${randomBytes(8).toString("hex")}`).digest("hex");
  return `CL-${digest.slice(0, 8).toUpperCase()}-${digest.slice(8, 16).toUpperCase()}-${digest.slice(16, 24).toUpperCase()}`;
}

export async function getCertificateByCode(code: string) {
  return prisma.certificate.findUnique({
    where: { code },
    include: { user: { select: { username: true, displayName: true, avatarUrl: true } }, path: true },
  });
}

export async function verifyCertificate(code: string) {
  const cert = await getCertificateByCode(code);
  if (!cert) return null;
  return {
    valid: true,
    code: cert.code,
    userName: cert.userName,
    pathTitle: cert.pathTitle,
    completedAt: cert.completedAt,
  };
}