import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { submitChallenge } from "@/services/challenges";
import { freshUser } from "./helpers";

type Fail = { ok: false; error: string };

function expectSuccess<T extends object>(res: T | Fail): Exclude<T, Fail> {
  expect(res).not.toMatchObject({ ok: false, error: expect.any(String) });
  return res as unknown as Exclude<T, Fail>;
}

describe("submitChallenge", () => {
  it("solves a python challenge and rewards XP once", async () => {
    await freshUser(async (userId) => {
      const challenge = await prisma.challenge.findUnique({ where: { slug: "python-fizzbuzz" } });
      expect(challenge).toBeTruthy();

      const code = `def solution(n):
    if n % 15 == 0:
        return "FizzBuzz"
    if n % 3 == 0:
        return "Fizz"
    if n % 5 == 0:
        return "Buzz"
    return str(n)`;

      const res = await submitChallenge(userId, { challengeId: challenge!.id, code, language: "python" }, "10.0.3.1");
      const ok = expectSuccess(res);
      expect(ok.passed).toBe(true);
      expect(ok.rewardedXp).toBe(challenge!.xpReward);
      expect(ok.results.length).toBe((challenge!.hiddenTests as unknown[]).length);
      // First solve also unlocks the "challenge-first" achievement (+20 XP).
      const xpAfter = (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp;
      expect(xpAfter).toBe(ok.rewardedXp + 20);

      const attempt = await prisma.challengeAttempt.findFirst({ where: { userId, challengeId: challenge!.id } });
      expect(attempt?.hiddenPassed).toBe(true);
      expect(attempt?.rewarded).toBe(true);

      // Repeat solve: no second reward and no new XP.
      const again = await submitChallenge(userId, { challengeId: challenge!.id, code, language: "python" }, "10.0.3.1");
      expect(expectSuccess(again).rewardedXp).toBe(0);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(xpAfter);
    });
  });

  it("fails an incorrect python solution", async () => {
    await freshUser(async (userId) => {
      const challenge = await prisma.challenge.findUnique({ where: { slug: "python-fizzbuzz" } });
      const res = await submitChallenge(
        userId,
        { challengeId: challenge!.id, code: "def solution(n):\n    return n", language: "python" },
        "10.0.3.2"
      );
      const ok = expectSuccess(res);
      expect(ok.passed).toBe(false);
      expect(ok.rewardedXp).toBe(0);
    });
  });

  it("grades javascript challenges in QuickJS", async () => {
    await freshUser(async (userId) => {
      const challenge = await prisma.challenge.findUnique({ where: { slug: "js-even-sum" } });
      if (!challenge) return;
      const code = `function solution(numbers) {
  return numbers.reduce((sum, n) => n % 2 === 0 ? sum + n : sum, 0);
}`;
      const res = await submitChallenge(userId, { challengeId: challenge.id, code, language: "javascript" }, "10.0.3.3");
      expect(expectSuccess(res).passed).toBe(true);
    });
  });

  it("grades javascript log output", async () => {
    await freshUser(async (userId) => {
      const challenge = await prisma.challenge.findUnique({ where: { slug: "js-even-sum" } });
      if (!challenge) return;
      const code = `function solution(numbers) {
  if (!numbers.length) console.log("empty");
  return numbers.reduce((sum, n) => n % 2 === 0 ? sum + n : sum, 0);
}`;
      const res = await submitChallenge(userId, { challengeId: challenge.id, code, language: "javascript" }, "10.0.3.5");
      expect(expectSuccess(res).passed).toBe(true);
    });
  });

  it("grades sql challenges", async () => {
    await freshUser(async (userId) => {
      const challenge = await prisma.challenge.findUnique({ where: { slug: "sql-active-users" } });
      if (!challenge) return;
      const res = await submitChallenge(
        userId,
        { challengeId: challenge.id, code: "SELECT name FROM users WHERE age >= 30;", language: "sql" },
        "10.0.3.4"
      );
      expect(expectSuccess(res).passed).toBe(true);
    });
  });
});