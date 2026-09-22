import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { submitQuiz } from "@/services/quiz";
import { freshUser } from "./helpers";

type Fail = { ok: false; error: string };

function expectSuccess<T extends object>(res: T | Fail): Exclude<T, Fail> {
  expect(res).not.toMatchObject({ ok: false, error: expect.any(String) });
  return res as unknown as Exclude<T, Fail>;
}

function expectFailure(res: unknown): asserts res is Fail {
  expect(res).toMatchObject({ ok: false });
}

function correctAnswers(quizId: string) {
  return prisma.question.findMany({ where: { quizId }, orderBy: { order: "asc" } });
}

describe("submitQuiz", () => {
  it("grades a perfect score and awards XP once", async () => {
    await freshUser(async (userId) => {
      const quiz = await prisma.quiz.findUnique({ where: { slug: "js-quiz" } });
      expect(quiz).toBeTruthy();

      const questions = await correctAnswers(quiz!.id);
      const answers: Record<string, string> = {};
      for (const q of questions) {
        const correct = (q.correctAnswer as unknown[])[0] ?? "";
        answers[q.id] = String(correct);
      }

      const res = await submitQuiz(
        userId,
        { quizId: quiz!.id, answers, durationSec: 60 },
        "10.0.0.1"
      );
      const ok = expectSuccess(res);
      expect(ok.passed).toBe(true);
      expect(ok.score).toBe(ok.maxScore);
      expect(ok.rewardedXp).toBe(quiz!.xpReward);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(quiz!.xpReward);

      const attempt = await prisma.quizAttempt.findFirst({ where: { userId, quizId: quiz!.id } });
      expect(attempt?.passed).toBe(true);
      expect(attempt?.passRewarded).toBe(true);

      // Second pass must not double-reward.
      const again = await submitQuiz(
        userId,
        { quizId: quiz!.id, answers, durationSec: 60 },
        "10.0.0.1"
      );
      expect(expectSuccess(again).rewardedXp).toBe(0);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(quiz!.xpReward);
    });
  });

  it("fails a wrong-answer run without rewarding", async () => {
    await freshUser(async (userId) => {
      const quiz = await prisma.quiz.findUnique({ where: { slug: "js-quiz" } });
      const questions = await correctAnswers(quiz!.id);
      const answers: Record<string, string> = {};
      for (const q of questions) answers[q.id] = "_wrong_";

      const res = await submitQuiz(userId, { quizId: quiz!.id, answers, durationSec: 60 }, "10.0.0.2");
      const ok = expectSuccess(res);
      expect(ok.passed).toBe(false);
      expect(ok.score).toBe(0);
      expect(ok.rewardedXp).toBe(0);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(0);
    });
  });

  it("flags implausibly fast submissions", async () => {
    await freshUser(async (userId) => {
      const quiz = await prisma.quiz.findUnique({ where: { slug: "js-quiz" } });
      const questions = await correctAnswers(quiz!.id);
      const answers: Record<string, string> = {};
      for (const q of questions) answers[q.id] = String((q.correctAnswer as unknown[])[0] ?? "");

      const res = await submitQuiz(
        userId,
        { quizId: quiz!.id, answers, startedAt: new Date().toISOString() },
        "10.0.0.3"
      );
      const ok = expectSuccess(res);
      expect(ok.suspicious).toBe(true);
      expect(ok.rewardedXp).toBe(0);
    });
  });

  it("rejects unknown quizzes", async () => {
    await freshUser(async (userId) => {
      const res = await submitQuiz(userId, { quizId: "nope", answers: {}, durationSec: 60 }, "10.0.0.4");
      expectFailure(res);
    });
  });
});