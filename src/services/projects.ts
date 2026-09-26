import { prisma } from "@/lib/db";
import { rateLimit, actorKey } from "@/lib/rate-limit";
import { STRICT_RATE_LIMITS, SAFETY } from "@/lib/constants";
import { projectSubmitInput } from "@/lib/validation";
import { gradeTest, gradeOutputTest, isExecutableLanguage, normalizeLanguage } from "@/services/challenges";
import { awardXp } from "@/services/xp";
import { recordDailyTask } from "@/services/daily";
import { recordActivity } from "@/services/streak";
import { checkAchievements } from "@/services/achievements";
import { notify } from "@/services/notifications";
import { track } from "@/lib/events";

export interface ProjectSubmissionResult {
  passed: boolean;
  results: { name: string; passed: boolean; error?: string | null }[];
  rewardedXp: number;
  gradingMode: GradingMode;
  submission: { id: string; passed: boolean; submittedAt: Date };
}

export type GradingMode = "function" | "stdout";

/**
 * A project is graded from captured stdout whenever its language has no
 * in-browser runtime (C, C++, Java, PHP, Go, Rust, Kotlin). The learner
 * builds and runs it locally, then pastes the output for each required case;
 * the expected values stay on the server and are compared here.
 *
 * Same trade-off as challenges, and stated the same way in the UI: this
 * validates the recorded output, not the program itself.
 */
export function projectGradingMode(project: { language: string }): GradingMode {
  return isExecutableLanguage(project.language) ? "function" : "stdout";
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
  const mode = projectGradingMode(project);
  const tests = (project.publicTests as unknown as { name: string; input?: unknown; setup?: string; stdin?: string; expected: unknown }[]) ?? [];

  if (tests.length === 0) {
    return { ok: false, error: "This project has no required output cases. Nothing to grade." };
  }

  const results: { name: string; passed: boolean; error?: string | null }[] = [];

  if (mode === "stdout") {
    const submitted = (parsed.data.outputs ?? []) as string[];
    if (submitted.length !== tests.length) {
      return {
        ok: false,
        error: `This project has ${tests.length} required case${tests.length === 1 ? "" : "s"}. Submit the output your program prints for each of them.`,
      };
    }
    for (const [i, t] of tests.entries()) {
      const r = await gradeOutputTest(t, [submitted[i]]);
      results.push({ name: t.name, passed: r.passed, error: r.error ?? null });
      if (!r.passed) break;
    }
  } else {
    for (const t of tests) {
      const r = await gradeTest(normalizeLanguage(lang), code, "main", t, 6000);
      results.push({ name: t.name, passed: r.passed, error: r.error ?? null });
      if (!r.passed) break;
    }
  }

  const passed = results.length === tests.length && results.every((r) => r.passed);

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
    await recordDailyTask(userId, "project", true);
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

  void track("project_submit", { projectId: project.id, passed, gradingMode: mode }, userId);

  return {
    passed,
    results,
    rewardedXp,
    gradingMode: mode,
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