import { prisma } from "@/lib/db";
import { rateLimit, actorKey } from "@/lib/rate-limit";
import { STRICT_RATE_LIMITS, SAFETY } from "@/lib/constants";
import { projectSubmitInput } from "@/lib/validation";
import { gradeTest } from "@/services/challenges";
import { awardXp } from "@/services/xp";
import { recordActivity } from "@/services/streak";
import { checkAchievements } from "@/services/achievements";
import { notify } from "@/services/notifications";
import { track } from "@/lib/events";

export interface ProjectSubmissionResult {
  passed: boolean;
  results: { name: string; passed: boolean; error?: string | null }[];
  rewardedXp: number;
  submission: { id: string; passed: boolean; submittedAt: Date };
}

/** Grade a project against its full public test suite (server-side, WASM sandbox). */
export async function submitProject(
  userId: string,
  input: unknown,
  ip: string
): Promise<ProjectSubmissionResult | { ok: false; error: string }> {
  const parsed = projectSubmitInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission" };
  const rl = await rateLimit(actorKey("projectSubmit", `${userId}:${ip}`), STRICT_RATE_LIMITS.challengeSubmit);
  if (!rl.ok) return { ok: false, error: "Too many submissions. Slow down." };

  const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
  if (!project || project.status !== "PUBLISHED") return { ok: false, error: "Project not found." };

  const code = parsed.data.code.slice(0, SAFETY.MAX_CODE_LENGTH);
  const lang = parsed.data.language;
  const tests = (project.publicTests as unknown as { name: string; input?: unknown; setup?: string; expected: unknown }[]) ?? [];

  const results: { name: string; passed: boolean; error?: string | null }[] = [];
  for (const t of tests) {
    const r = await gradeTest(lang, code, "main", t, 6000);
    results.push({ name: t.name, passed: r.passed, error: r.error ?? null });
    if (!r.passed) break;
  }
  const passed = tests.length > 0 && results.every((r) => r.passed);

  const prevRewarded = await prisma.projectSubmission.findFirst({
    where: { userId, projectId: project.id, rewarded: true },
  });

  const submission = await prisma.projectSubmission.create({
    data: {
      userId,
      projectId: project.id,
      code,
      passed,
      testsResult: results as object,
      rewarded: passed && !prevRewarded,
    },
  });

  let rewardedXp = 0;
  if (passed) {
    rewardedXp = prevRewarded ? 0 : project.xpReward;
    await recordActivity(userId);
    if (!prevRewarded) {
      await awardXp(userId, "project", project.id, project.xpReward, { slug: project.slug });
      await checkAchievements(userId);
      await notify({
        userId,
        type: "course_completion",
        title: `Project complete: ${project.title}`,
        body: `+${project.xpReward} XP`,
        link: `/projects/${project.slug}`,
      });
    }
  }

  void track("project_submit", { projectId: project.id, passed }, userId);

  return {
    passed,
    results,
    rewardedXp,
    submission: { id: submission.id, passed: submission.passed, submittedAt: submission.submittedAt },
  };
}

export async function getProjectBySlug(slug: string) {
  return prisma.project.findUnique({ where: { slug } });
}

export async function listProjects() {
  return prisma.project.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { order: "asc" },
  });
}