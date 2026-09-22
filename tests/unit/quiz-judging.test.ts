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