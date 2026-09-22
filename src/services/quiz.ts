import { prisma } from "@/lib/db";
import { rateLimit, actorKey } from "@/lib/rate-limit";
import { STRICT_RATE_LIMITS } from "@/lib/constants";
import { quizSubmitInput } from "@/lib/validation";
import { awardXp } from "@/services/xp";
import { recordDailyTask } from "@/services/daily";
import { recordActivity } from "@/services/streak";
import { checkAchievements } from "@/services/achievements";
import { notify } from "@/services/notifications";
import { track } from "@/lib/events";

interface QuestionShape {
  id: string;
  type: string;
  correctAnswer: unknown;
  explanation?: string | null;
  points: number;
}

function norm(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Server-side answer correctness. Never trusts the client. */
export function isQuestionCorrect(q: QuestionShape, answer: unknown): boolean {
  const correct = (q.correctAnswer ?? []) as unknown[];
  const list = Array.isArray(correct) ? correct : [correct];

  switch (q.type) {
    case "MCQ":
    case "TRUE_FALSE":
    case "CORRECT": {
      const a = norm(answer);
      return list.some((c) => norm(c) === a);
    }
    case "FILL":
    case "OUTPUT": {
      const a = norm(answer);
      return list.some((c) => {
        const acc = norm(c);
        if (acc === a) return true;
        // numeric tolerance
        const an = Number(a);
        const cn = Number(acc);
        if (Number.isFinite(an) && Number.isFinite(cn)) return Math.abs(an - cn) < 1e-9;
        return false;
      });
    }
    case "MATCH": {
      try {
        const answerPairs = normalizePairs(answer);
        const correctPairs = normalizePairs(list);
        const ok = (p: [string, string], pairs: [string, string][]) =>
          pairs.some(([k, v]) => norm(k) === norm(p[0]) && norm(v) === norm(p[1]));
        return answerPairs.length === correctPairs.length && answerPairs.every((p) => ok(p, correctPairs));
      } catch {
        return false;
      }
    }
    default:
      return false;
  }
}

function normalizePairs(value: unknown): [string, string][] {
  if (Array.isArray(value)) {
    return value.map((p) => {
      if (Array.isArray(p)) return [String(p[0] ?? ""), String(p[1] ?? "")];
      if (p && typeof p === "object") {
        const entries = Object.entries(p);
        return [String(entries[0]?.[0] ?? ""), String(entries[0]?.[1] ?? "")];
      }
      return ["", String(p)];
    });
  }
  if (value && typeof value === "object") {
    return Object.entries(value).map(([k, v]) => [String(k), String(v)]);
  }
  return [];
}

export interface QuizResult {
  score: number;
  maxScore: number;
  percent: number;
  passed: boolean;
  rewardedXp: number;
  suspicious: boolean;
  feedback: { questionId: string; correct: boolean; explanation?: string | null }[];
  attempt: { id: string; attemptNo: number; score: number; maxScore: number; passed: boolean };
}

const MIN_MS_PER_QUESTION = 500;

export async function submitQuiz(userId: string, input: unknown, ip: string): Promise<QuizResult | { ok: false; error: string }> {
  const parsed = quizSubmitInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const rl = await rateLimit(actorKey("quizSubmit", `${userId}:${ip}`), STRICT_RATE_LIMITS.quizSubmit);
  if (!rl.ok) return { ok: false, error: "Too many submissions. Slow down." };

  const quiz = await prisma.quiz.findUnique({
    where: { id: parsed.data.quizId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz || quiz.questions.length === 0) return { ok: false, error: "Quiz not found." };

  const answers: Record<string, unknown> =
    (parsed.data.answers as Record<string, unknown>) ?? parsed.data.answersAny ?? {};

  let score = 0;
  let maxScore = 0;
  const feedback: QuizResult["feedback"] = [];
  for (const q of quiz.questions) {
    maxScore += q.points;
    const userAnswer = answers[q.id];
    const correct = isQuestionCorrect(q, userAnswer);
    if (correct) score += q.points;
    feedback.push({ questionId: q.id, correct, explanation: q.explanation });
  }

  const percent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed = percent >= quiz.passingScore;

  // Anti-cheat: reject implausibly fast completions.
  const durationMs =
    parsed.data.startedAt
      ? Math.max(0, Date.now() - new Date(parsed.data.startedAt).getTime())
      : (parsed.data.durationSec ?? 0) * 1000;
  const minimumMs = quiz.questions.length * MIN_MS_PER_QUESTION;
  const suspicious = durationMs > 0 && durationMs < minimumMs;

  const attemptNo = (await prisma.quizAttempt.count({ where: { userId, quizId: quiz.id } })) + 1;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      quizId: quiz.id,
      attemptNo,
      answers: answers as object,
      score,
      maxScore,
      passed,
      passRewarded: false,
      completedAt: new Date(),
    },
  });

  const prevRewarded = await prisma.quizAttempt.findFirst({
    where: { userId, quizId: quiz.id, passRewarded: true },
  });

  let rewardedXp = 0;
  if (passed && !suspicious) {
    if (!prevRewarded) {
      rewardedXp = quiz.xpReward;
      await awardXp(userId, "quiz", quiz.id, quiz.xpReward, { quizTitle: quiz.title });
      await prisma.quizAttempt.update({ where: { id: attempt.id }, data: { passRewarded: true } });
    }
    await recordActivity(userId);
    await recordDailyTask(userId, "quiz", passed);
    await checkAchievements(userId);
    await notify({
      userId,
      type: "challenge_result",
      title: `Quiz passed: ${quiz.title}`,
      body: prevRewarded ? "Practice makes perfect!" : `+${quiz.xpReward} XP`,
      link: `/quiz/${quiz.id}`,
    });
  }

  void track("quiz_attempt", { quizId: quiz.id, passed, score: percent }, userId);

  return {
    score,
    maxScore,
    percent,
    passed,
    rewardedXp,
    suspicious,
    feedback,
    attempt: {
      id: attempt.id,
      attemptNo: attempt.attemptNo,
      score,
      maxScore,
      passed,
    },
  };
}