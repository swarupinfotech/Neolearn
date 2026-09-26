import { prisma } from "@/lib/db";
import { rateLimit, actorKey } from "@/lib/rate-limit";
import { STRICT_RATE_LIMITS, SAFETY } from "@/lib/constants";
import { challengeSubmitInput } from "@/lib/validation";
import { pythonFn, runJavaScript, runSql, gradedEqual, transpileTypeScript, stdoutMatches } from "@/services/sandbox";
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

/** Languages the browser WASM engines can execute. */
const EXECUTABLE_LANGUAGES = new Set([
  "python",
  "javascript",
  "js",
  "typescript",
  "ts",
  "sql",
]);

/** Normalize the many language spellings used across course content. */
export function normalizeLanguage(language: string): string {
  const l = language.trim().toLowerCase();
  if (l === "js") return "javascript";
  if (l === "ts") return "typescript";
  return l;
}

export function isExecutableLanguage(language: string): boolean {
  return EXECUTABLE_LANGUAGES.has(normalizeLanguage(language));
}

/**
 * Run ONE test case through the appropriate WASM sandbox.
 *
 * Only used for `gradingMode: "function"` challenges — i.e. languages the
 * platform can actually execute. Languages without a runtime (C, C++, Java,
 * PHP, Go) are graded by `gradeOutputTest` instead.
 */
export async function gradeTest(
  language: string,
  code: string,
  functionName: string,
  test: { input?: unknown; setup?: string; expected: unknown },
  timeoutMs: number
): Promise<{ passed: boolean; error?: string }> {
  const lang = normalizeLanguage(language);
  try {
    if (lang === "python") {
      const res = await pythonFn(code, functionName, (test.input ?? []) as unknown[], timeoutMs);
      if (res.error) return { passed: false, error: res.error };
      return { passed: gradedEqual(res.value, test.expected) };
    }
    if (lang === "javascript" || lang === "typescript") {
      // Real TypeScript sources are type-erased before execution.
      let source = code;
      if (lang === "typescript") {
        const compiled = transpileTypeScript(code);
        if (compiled.error) return { passed: false, error: compiled.error };
        source = compiled.code;
      }
      const res = await runJavaScript(source, functionName, (test.input ?? []) as unknown[], timeoutMs);
      if (res.error) return { passed: false, error: res.error };
      return { passed: gradedEqual(res.value, test.expected) };
    }
    if (lang === "sql") {
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

/**
 * Output-based grading for languages with no in-browser runtime.
 *
 * The learner compiles and runs the program in their own environment, then
 * submits the captured stdout. We compare it against the hidden expected
 * output here on the server. The expected value is never returned to the
 * client, and a failing test reports only its name.
 *
 * Trade-off (documented in the product copy): this validates the program's
 * output, not the program itself.
 */
export async function gradeOutputTest(
  test: { expected: unknown },
  outputs: string[]
): Promise<{ passed: boolean; error?: string }> {
  const expected = typeof test.expected === "string" ? test.expected : String(test.expected ?? "");
  if (outputs.length === 0) {
    return { passed: false, error: "Submit the output your program prints for each test input." };
  }
  for (const actual of outputs) {
    if (!stdoutMatches(actual, expected)) {
      return { passed: false, error: "Output does not match the expected result." };
    }
  }
  return { passed: true };
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
  gradingMode: GradingMode;
  attempt: {
    id: string;
    publicPassed: boolean;
    hiddenPassed: boolean;
    passed: boolean;
    executionMs: number;
    createdAt: Date;
  };
}

export type GradingMode = "function" | "stdout";

export function gradingModeFor(challenge: { gradingMode: string; language: string }): GradingMode {
  if (challenge.gradingMode === "stdout") return "stdout";
  if (challenge.gradingMode === "function") return "function";
  // Defensive default: a language we cannot execute is never sent to the
  // sandbox, because that would always fail with an unsupported-language error.
  return isExecutableLanguage(challenge.language) ? "function" : "stdout";
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
  const mode = gradingModeFor(challenge);

  const hiddenTests = (challenge.hiddenTests as unknown as {
    name: string;
    input?: unknown;
    setup?: string;
    stdin?: string;
    expected: unknown;
  }[]) ?? [];

  const graded: GradedTest[] = [];
  const started = Date.now();

  if (mode === "stdout") {
    // The learner supplies one captured output per hidden test input.
    const submitted = (parsed.data.outputs ?? []) as string[];
    if (submitted.length !== hiddenTests.length) {
      return {
        ok: false,
        error: `This challenge has ${hiddenTests.length} hidden test${hiddenTests.length === 1 ? "" : "s"}. Submit the output your program prints for each of them.`,
      };
    }
    for (const [i, t] of hiddenTests.entries()) {
      const r = await gradeOutputTest(t, [submitted[i]]);
      graded.push({ name: t.name, passed: r.passed, error: r.error ?? null });
      if (!r.passed) break;
    }
  } else {
    for (const t of hiddenTests) {
      const r = await gradeTest(lang, code, challenge.functionName, t, challenge.timeoutMs);
      graded.push({ name: t.name, passed: r.passed, error: r.error ?? null });
      if (!r.passed) break; // fail-fast; don't leak more hidden expectations than needed
    }
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
    gradingMode: mode,
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