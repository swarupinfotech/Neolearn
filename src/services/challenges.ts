import { prisma } from "@/lib/db";
import { rateLimit, actorKey } from "@/lib/rate-limit";
import { STRICT_RATE_LIMITS, SAFETY } from "@/lib/constants";
import { challengeSubmitInput } from "@/lib/validation";
import { pythonFn, runJavaScript, runSql, gradedEqual } from "@/services/sandbox";
import { awardXp } from "@/services/xp";
import { recordDailyTask } from "@/services/daily";
import { recordActivity } from "@/services/streak";
import { checkAchievements } from "@/services/achievements";
import { notify } from "@/services/notifications";

export interface GradedTest {
  name: string;
  passed: boolean;
  error?: string | null;
}

/** Run ONE test case through the appropriate WASM sandbox. */
export async function gradeTest(
  language: string,
  code: string,
  functionName: string,
  test: { input?: unknown; setup?: string; expected: unknown },
  timeoutMs: number
): Promise<{ passed: boolean; error?: string }> {
  try {
    if (language === "python" || language === "Python") {
      const res = await pythonFn(code, functionName, (test.input ?? []) as unknown[], timeoutMs);
      if (res.error) return { passed: false, error: res.error };
      return { passed: gradedEqual(res.value, test.expected) };
    }
    if (language === "javascript" || language === "JavaScript" || language === "js" || language === "typescript") {
      const res = await runJavaScript(code, functionName, (test.input ?? []) as unknown[], timeoutMs);
      if (res.error) return { passed: false, error: res.error };
      return { passed: gradedEqual(res.value, test.expected) };
    }
    if (language === "sql" || language === "SQL") {
      const setup = test.setup ? `${test.setup}\n` : "";
      const res = await runSql(`${setup}${code}`, timeoutMs);
      if (res.error) return { passed: false, error: res.error };
      const rows = expectedAsRows(test.expected);
      return { passed: rowsEqual(res.rows ?? [], rows) };
    }
    return { passed: false, error: `Unsupported challenge language: ${language}` };
  } catch (e) {
    return { passed: false, error: e instanceof Error ? e.message.slice(0, 300) : "Sandbox error" };
  }
}

function expectedAsRows(expected: unknown): unknown[][] {
  if (Array.isArray(expected) && expected.length > 0 && Array.isArray(expected[0])) return expected as unknown[][];
  if (Array.isArray(expected)) return expected.length === 0 ? [] : [expected];
  return [[expected]];
}

function rowsEqual(a: unknown[][], b: unknown[][], looseOrder = false): boolean {
  if (a.length !== b.length) return false;
  if (!looseOrder) return a.every((rowA, i) => rowArrayEqual(rowA, b[i]));
  const bCopy = b.map((r) => JSON.stringify(normalizeRow(r)));
  for (const rowA of a) {
    const key = JSON.stringify(normalizeRow(rowA));
    const idx = bCopy.indexOf(key);
    if (idx === -1) return false;
    bCopy.splice(idx, 1);
  }
  return true;
}

function rowArrayEqual(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => cellEqual(x, b[i]));
}

function cellEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
  return String(a ?? "") === String(b ?? "");
}

function normalizeRow(r: unknown[]): unknown[] {
  return r.map((c) => (typeof c === "number" ? c : String(c ?? "")));
}

export interface ChallengeSubmissionResult {
  passed: boolean;
  results: GradedTest[];
  rewardedXp: number;
  attempt: {
    id: string;
    publicPassed: boolean;
    hiddenPassed: boolean;
    passed: boolean;
    executionMs: number;
    createdAt: Date;
  };
}

export async function submitChallenge(
  userId: string,
  input: unknown,
  ip: string
): Promise<ChallengeSubmissionResult | { ok: false; error: string }> {
  const parsed = challengeSubmitInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid submission" };
  }
  const rl = await rateLimit(actorKey("challengeSubmit", `${userId}:${ip}`), STRICT_RATE_LIMITS.challengeSubmit);
  if (!rl.ok) return { ok: false, error: "Too many submissions. Slow down." };

  const challenge = await prisma.challenge.findUnique({
    where: { id: parsed.data.challengeId },
  });
  if (!challenge || challenge.status !== "PUBLISHED") return { ok: false, error: "Challenge not found." };

  const code = parsed.data.code.slice(0, SAFETY.MAX_CODE_LENGTH);
  const lang = parsed.data.language;

  const hiddenTests = (challenge.hiddenTests as unknown as { name: string; input?: unknown; setup?: string; expected: unknown }[]) ?? [];

  const graded: GradedTest[] = [];
  const started = Date.now();
  for (const t of hiddenTests) {
    const r = await gradeTest(lang, code, challenge.functionName, t, challenge.timeoutMs);
    graded.push({ name: t.name, passed: r.passed, error: r.error ?? null });
    if (!r.passed) break; // fail-fast; don't leak more hidden expectations than needed
  }
  const executionMs = Date.now() - started;
  const hiddenPassed = graded.length === hiddenTests.length && hiddenTests.length > 0
    ? graded.every((g) => g.passed)
    : false;

  // Public tests not re-executed server-side (visible anyway); we grade
  // the initial user-visible run client-side. Record publicPassed guess = true
  // only when code produced no error across every hidden run.
  const prevRewarded = await prisma.challengeAttempt.findFirst({
    where: { userId, challengeId: challenge.id, rewarded: true },
  });

  const attempt = await prisma.challengeAttempt.create({
    data: {
      userId,
      challengeId: challenge.id,
      code,
      publicPassed: hiddenPassed,
      hiddenPassed,
      passed: hiddenPassed,
      rewarded: hiddenPassed && !prevRewarded,
      error: hiddenPassed ? null : (graded.find((g) => !g.passed)?.error ?? "Test failed"),
      executionMs: Math.max(1, executionMs),
    },
  });

  let rewardedXp = 0;
  if (hiddenPassed) {
    rewardedXp = challenge.xpReward;
    await recordActivity(userId);
    await recordDailyTask(userId, "challenge", true);
  }
  if (hiddenPassed && !prevRewarded) {
    await awardXp(userId, "challenge", challenge.id, challenge.xpReward, { slug: challenge.slug });
    await checkAchievements(userId);
    await notify({
      userId,
      type: "challenge_result",
      title: `Challenge solved: ${challenge.title}`,
      body: `+${challenge.xpReward} XP`,
      link: `/challenges/${challenge.slug}`,
    });
  }

  // Prevent revealing hidden expected values — only test name + own-code error.
  const safeResults: GradedTest[] = graded.map((g) => ({
    name: g.name,
    passed: g.passed,
    error: g.passed ? null : (g.error ?? null),
  }));

  return {
    passed: hiddenPassed,
    results: safeResults,
    rewardedXp: hiddenPassed && !prevRewarded ? rewardedXp : 0,
    attempt: {
      id: attempt.id,
      publicPassed: attempt.publicPassed,
      hiddenPassed: attempt.hiddenPassed,
      passed: attempt.passed,
      executionMs: attempt.executionMs,
      createdAt: attempt.createdAt,
    },
  };
}

export async function getChallengeBySlug(slug: string) {
  return prisma.challenge.findUnique({ where: { slug } });
}

export async function listChallenges(filter?: { category?: string; difficulty?: string }) {
  const items = await prisma.challenge.findMany({
    where: {
      status: "PUBLISHED",
      ...(filter?.category ? { category: filter.category } : {}),
      ...(filter?.difficulty ? { difficulty: filter.difficulty } : {}),
    },
  });
  return sortByDifficulty(items);
}

function sortByDifficulty<T extends { difficulty: string }>(items: T[]): T[] {
  const rank: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2, Beginner: 0, Intermediate: 1, Advanced: 2 };
  return [...items].sort((a, b) => (rank[a.difficulty] ?? 9) - (rank[b.difficulty] ?? 9));
}