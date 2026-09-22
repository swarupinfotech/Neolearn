import { describe, it, expect } from "vitest";
import { gradedEqual } from "@/services/sandbox";

describe("gradedEqual", () => {
  it("compares numbers with tolerance", () => {
    expect(gradedEqual(3, 3)).toBe(true);
    expect(gradedEqual(3, 3.0000000005)).toBe(true);
    expect(gradedEqual(3, 3.5)).toBe(false);
  });

  it("compares nested arrays", () => {
    expect(gradedEqual([1, [2, 3]], [1, [2, 3]])).toBe(true);
    expect(gradedEqual([1, [2, 3]], [1, [2, 4]])).toBe(false);
    expect(gradedEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("compares objects key-by-key", () => {
    expect(gradedEqual({ a: 1, b: "x" }, { b: "x", a: 1 })).toBe(true);
    expect(gradedEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(gradedEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("compares scalars and null strictly", () => {
    expect(gradedEqual("abc", "abc")).toBe(true);
    expect(gradedEqual("abc", "abd")).toBe(false);
    expect(gradedEqual(null, null)).toBe(true);
    expect(gradedEqual(null, undefined)).toBe(false);
  });
});