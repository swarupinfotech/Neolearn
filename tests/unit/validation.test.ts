import { describe, it, expect } from "vitest";
import {
  registerInput,
  quizSubmitInput,
  challengeSubmitInput,
  reportInput,
  lessonProgressInput,
  searchInput,
} from "@/lib/validation";

describe("registerInput", () => {
  const valid = {
    email: "ada@example.com",
    password: "Kangaroo99",
    username: "ada_lovelace",
    displayName: "Ada Lovelace",
  };

  it("accepts a valid payload", () => {
    expect(registerInput.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(registerInput.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("rejects short passwords", () => {
    expect(registerInput.safeParse({ ...valid, password: "short" }).success).toBe(false);
  });

  it("rejects passwords without a letter or a number", () => {
    expect(registerInput.safeParse({ ...valid, password: "12345678" }).success).toBe(false);
    expect(registerInput.safeParse({ ...valid, password: "abcdefgh" }).success).toBe(false);
  });

  it("rejects usernames with illegal characters", () => {
    expect(registerInput.safeParse({ ...valid, username: "bad name!" }).success).toBe(false);
    expect(registerInput.safeParse({ ...valid, username: "ab" }).success).toBe(false);
  });

  it("normalizes email casing", () => {
    const parsed = registerInput.parse({ ...valid, email: "ADA@Example.com" });
    expect(parsed.email).toBe("ada@example.com");
  });
});

describe("quizSubmitInput", () => {
  it("accepts a questions map and optional timing", () => {
    const ok = quizSubmitInput.safeParse({
      quizId: "q1",
      answers: { a: "1", b: "7" },
      startedAt: new Date().toISOString(),
    });
    expect(ok.success).toBe(true);
  });

  it("rejects when startedAt is not a valid datetime", () => {
    expect(quizSubmitInput.safeParse({ quizId: "q1", answers: {}, startedAt: "yesterday" }).success).toBe(false);
  });

  it("rejects negative durations", () => {
    expect(quizSubmitInput.safeParse({ quizId: "q1", answers: {}, durationSec: -1 }).success).toBe(false);
  });
});

describe("challengeSubmitInput", () => {
  it("rejects empty code", () => {
    expect(challengeSubmitInput.safeParse({ challengeId: "c1", code: "", language: "python" }).success).toBe(false);
  });
  it("accepts code within length limits", () => {
    expect(challengeSubmitInput.safeParse({ challengeId: "c1", code: "def f(): pass", language: "python" }).success).toBe(true);
  });
});

describe("reportInput", () => {
  it("only allows post/comment targets", () => {
    expect(reportInput.safeParse({ targetType: "post", targetId: "p1", reason: "spam spam spam" }).success).toBe(true);
    expect(reportInput.safeParse({ targetType: "user", targetId: "u1", reason: "nope" }).success).toBe(false);
  });
  it("requires meaningful reason", () => {
    expect(reportInput.safeParse({ targetType: "post", targetId: "p1", reason: "x" }).success).toBe(false);
  });
});

describe("lessonProgressInput", () => {
  it("bounds progress percentage", () => {
    expect(lessonProgressInput.safeParse({ progressPct: 101, completed: true }).success).toBe(false);
    expect(lessonProgressInput.safeParse({ progressPct: -1, completed: false }).success).toBe(false);
    expect(lessonProgressInput.safeParse({ progressPct: 100, completed: true }).success).toBe(true);
  });
});

describe("searchInput", () => {
  it("rejects empty queries and invalid filters", () => {
    expect(searchInput.safeParse({ q: " ", type: "all" }).success).toBe(false);
    expect(searchInput.safeParse({ q: "react", type: "bogus" }).success).toBe(false);
    expect(searchInput.safeParse({ q: "react", type: "courses" }).success).toBe(true);
  });
});