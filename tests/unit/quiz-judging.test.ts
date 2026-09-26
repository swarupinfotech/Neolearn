import { describe, it, expect } from "vitest";
import { isQuestionCorrect } from "@/services/quiz";

function q(overrides: Partial<{ id: string; type: string; correctAnswer: unknown; points: number }>) {
  return {
    id: "q1",
    type: "MCQ",
    correctAnswer: [] as unknown[],
    points: 10,
    ...overrides,
  };
}

describe("isQuestionCorrect", () => {
  it("MCQ answers use option index strings", () => {
    const question = q({ type: "MCQ", correctAnswer: ["1"] });
    expect(isQuestionCorrect(question, "1")).toBe(true);
    expect(isQuestionCorrect(question, "0")).toBe(false);
  });

  it("TRUE_FALSE is index-based, not boolean word", () => {
    const trueStatement = q({ type: "TRUE_FALSE", correctAnswer: ["0"] }); // options: ["true","false"]
    expect(isQuestionCorrect(trueStatement, "0")).toBe(true);
    expect(isQuestionCorrect(trueStatement, "1")).toBe(false);
    expect(isQuestionCorrect(trueStatement, "true")).toBe(false);
  });

  it("accepts a single scalar correctAnswer", () => {
    const question = q({ type: "MCQ", correctAnswer: "3" });
    expect(isQuestionCorrect(question, "3")).toBe(true);
  });

  it("FILL tolerates whitespace and case", () => {
    const question = q({ type: "FILL", correctAnswer: ["def"] });
    expect(isQuestionCorrect(question, "  DEF ")).toBe(true);
  });

  it("FILL/OUTPUT tolerate numeric differences within 1e-9", () => {
    const question = q({ type: "OUTPUT", correctAnswer: ["3"] });
    expect(isQuestionCorrect(question, "3.0")).toBe(true);
    expect(isQuestionCorrect(question, "3.0000000001")).toBe(true);
    expect(isQuestionCorrect(question, "4")).toBe(false);
  });

  it("FILL/OUTPUT accept any of several accepted values", () => {
    const question = q({ type: "FILL", correctAnswer: ["2fa", "two-factor", "two factor", "mfa"] });
    expect(isQuestionCorrect(question, "MFA")).toBe(true);
    expect(isQuestionCorrect(question, "TWO FACTOR")).toBe(true);
    expect(isQuestionCorrect(question, "TWO-FACTOR")).toBe(true);
    expect(isQuestionCorrect(question, "pin")).toBe(false);
  });

  it("CORRECT accepts the index of the correct line", () => {
    const question = q({ type: "CORRECT", correctAnswer: ["2"] });
    expect(isQuestionCorrect(question, "2")).toBe(true);
    expect(isQuestionCorrect(question, "1")).toBe(false);
  });

  it("MATCH accepts object pairs and arrays", () => {
    const pairs: [string, string][] = [
      ["print()", "Output to console"],
      ["len()", "Length"],
    ];
    const question = q({ type: "MATCH", correctAnswer: pairs });
    expect(isQuestionCorrect(question, { "print()": "Output to console", "len()": "Length" })).toBe(true);
    expect(
      isQuestionCorrect(question, [
        ["len()", "Length"],
        ["print()", "Output to console"],
      ])
    ).toBe(true);
    expect(isQuestionCorrect(question, { "print()": "Length", "len()": "Output to console" })).toBe(false);
  });

  it("missing answer fails", () => {
    const question = q({ type: "MCQ", correctAnswer: ["1"] });
    expect(isQuestionCorrect(question, undefined)).toBe(false);
    expect(isQuestionCorrect(question, "")).toBe(false);
    expect(isQuestionCorrect(question, null)).toBe(false);
  });

  it("unknown types fail closed", () => {
    expect(isQuestionCorrect(q({ type: "WEIRD", correctAnswer: ["1"] }), "1")).toBe(false);
  });
});

describe("isQuestionCorrect — expanded question types", () => {
  it("DEBUGGING grades as single-answer index", () => {
    const question = q({ type: "DEBUGGING", correctAnswer: ["2"] });
    expect(isQuestionCorrect(question, "2")).toBe(true);
    expect(isQuestionCorrect(question, "0")).toBe(false);
  });

  it("SCENARIO grades as single-answer index", () => {
    const question = q({ type: "SCENARIO", correctAnswer: ["1"] });
    expect(isQuestionCorrect(question, "1")).toBe(true);
    expect(isQuestionCorrect(question, "3")).toBe(false);
  });

  it("MULTI_SELECT requires every correct option and no extras", () => {
    const question = q({ type: "MULTI_SELECT", correctAnswer: ["0", "2"] });
    expect(isQuestionCorrect(question, ["0", "2"])).toBe(true);
    expect(isQuestionCorrect(question, ["2", "0"])).toBe(true);
    expect(isQuestionCorrect(question, ["0"])).toBe(false);
    expect(isQuestionCorrect(question, ["0", "1", "2"])).toBe(false);
  });

  it("MULTI_SELECT fails closed on an empty selection", () => {
    const question = q({ type: "MULTI_SELECT", correctAnswer: ["0"] });
    expect(isQuestionCorrect(question, [])).toBe(false);
    expect(isQuestionCorrect(question, undefined)).toBe(false);
  });

  it("MULTI_SELECT accepts a single scalar correctAnswer", () => {
    const question = q({ type: "MULTI_SELECT", correctAnswer: "3" });
    expect(isQuestionCorrect(question, ["3"])).toBe(true);
  });

  it("MULTI_SELECT dedupes repeated selections", () => {
    const question = q({ type: "MULTI_SELECT", correctAnswer: ["0"] });
    expect(isQuestionCorrect(question, ["0", "0"])).toBe(true);
  });
});

describe("isQuestionCorrect — MATCH as the runner actually submits it", () => {
  // The runner's dropdown UI holds one pick per left-hand item, so submit
  // reconstructs [left, right] pairs from the interleaved options. These
  // cases pin that exact wire shape; before this, the client sent a bare
  // list of rights, which normalized to ["", right] and could never match.
  const pairs: [string, string][] = [
    ["Interface", "Exact object shape"],
    ["Union", "One of several types"],
    ["Narrowing", "Reduces to one branch"],
  ];
  const question = q({ type: "MATCH", correctAnswer: pairs });

  it("accepts the [left, right] pair list the runner now sends", () => {
    expect(
      isQuestionCorrect(question, [
        ["Interface", "Exact object shape"],
        ["Union", "One of several types"],
        ["Narrowing", "Reduces to one branch"],
      ])
    ).toBe(true);
  });

  it("accepts the same pairs in a different order", () => {
    expect(
      isQuestionCorrect(question, [
        ["Narrowing", "Reduces to one branch"],
        ["Interface", "Exact object shape"],
        ["Union", "One of several types"],
      ])
    ).toBe(true);
  });

  it("rejects a right value paired with the wrong left", () => {
    expect(
      isQuestionCorrect(question, [
        ["Interface", "One of several types"],
        ["Union", "Exact object shape"],
        ["Narrowing", "Reduces to one branch"],
      ])
    ).toBe(false);
  });

  it("rejects a partially filled dropdown (one left still blank)", () => {
    expect(
      isQuestionCorrect(question, [
        ["Interface", "Exact object shape"],
        ["Union", "One of several types"],
        ["Narrowing", ""],
      ])
    ).toBe(false);
  });

  it("rejects the old rights-only wire shape rather than crediting it", () => {
    expect(isQuestionCorrect(question, ["Exact object shape", "One of several types", "Reduces to one branch"])).toBe(
      false
    );
  });
});