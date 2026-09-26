import { describe, it, expect } from "vitest";
import { normalizeStdout, stdoutMatches, transpileTypeScript } from "@/services/sandbox";
import { gradeOutputTest, isExecutableLanguage } from "@/services/challenges";
import { projectGradingMode } from "@/services/projects";

describe("normalizeStdout", () => {
  it("normalizes CRLF and lone CR to LF", () => {
    expect(normalizeStdout("a\r\nb")).toBe("a\nb");
    expect(normalizeStdout("a\rb")).toBe("a\nb");
  });

  it("strips trailing whitespace per line", () => {
    expect(normalizeStdout("a   \nb\t\t")).toBe("a\nb");
  });

  it("removes trailing blank lines but keeps interior ones", () => {
    // "a\n\n\nb" is `a`, a blank line, another blank line, then `b` — interior
    // blank lines are meaningful output and must survive normalization.
    expect(normalizeStdout("a\n\n\nb\n\n")).toBe("a\n\n\nb");
    expect(normalizeStdout("a\n\nb\n\n\n")).toBe("a\n\nb");
  });

  it("preserves leading whitespace, which is significant in output", () => {
    expect(normalizeStdout("  indented")).toBe("  indented");
  });

  it("treats an empty string as empty", () => {
    expect(normalizeStdout("")).toBe("");
    expect(normalizeStdout("\n\n")).toBe("");
  });
});

describe("stdoutMatches", () => {
  it("tolerates a single trailing newline difference", () => {
    expect(stdoutMatches("hello\n", "hello")).toBe(true);
    expect(stdoutMatches("hello", "hello\n")).toBe(true);
  });

  it("tolerates trailing spaces and line endings", () => {
    expect(stdoutMatches("a  \r\nb\r\n", "a\nb")).toBe(true);
  });

  it("still rejects genuinely different output", () => {
    expect(stdoutMatches("hello", "world")).toBe(false);
    expect(stdoutMatches("1 2 3", "1 2 4")).toBe(false);
  });

  it("is order sensitive for multi-line output", () => {
    expect(stdoutMatches("1\n2", "2\n1")).toBe(false);
  });

  it("distinguishes an empty program from one that prints a newline", () => {
    expect(stdoutMatches("", "\n")).toBe(true);
    expect(stdoutMatches("", "x")).toBe(false);
  });
});

describe("transpileTypeScript", () => {
  it("erases type annotations from a function", () => {
    const r = transpileTypeScript(
      "function add(a: number, b: number): number { return a + b; }"
    );
    expect(r.error).toBeNull();
    expect(r.code).not.toContain(": number");
    expect(r.code).toContain("function add");
  });

  it("erases interfaces, enums and generics", () => {
    const src = [
      "interface P { x: number }",
      "enum E { A = 1 }",
      "function first<T>(xs: T[]): T | undefined { return xs[0]; }",
    ].join("\n");
    const r = transpileTypeScript(src);
    expect(r.error).toBeNull();
    expect(r.code).not.toContain("interface P");
    expect(r.code).not.toContain("enum E");
  });

  it("erases `as` casts so QuickJS can parse the result", () => {
    const r = transpileTypeScript("const n = (document as any).x;");
    expect(r.error).toBeNull();
    expect(r.code).not.toContain("as any");
  });

  it("emits plain script output, never import/export syntax", () => {
    const r = transpileTypeScript("export const x: number = 1;");
    expect(r.error).toBeNull();
    expect(r.code).not.toMatch(/^\s*import\s/m);
    expect(r.code).not.toMatch(/^\s*export\s/m);
  });

  it("leaves plain JavaScript untouched apart from formatting", () => {
    const r = transpileTypeScript("const a = 1; console.log(a);");
    expect(r.error).toBeNull();
    expect(r.code).toContain("console.log");
  });
});

describe("gradeOutputTest", () => {
  it("accepts a program that prints nothing when nothing is expected", async () => {
    // The UI has an explicit "my program prints nothing" tick, so a
    // confirmed-empty submission has to be gradable rather than an error.
    const r = await gradeOutputTest({ expected: "" }, [""]);
    expect(r.passed).toBe(true);
  });

  it("still fails an empty submission when output was expected", async () => {
    const r = await gradeOutputTest({ expected: "42" }, [""]);
    expect(r.passed).toBe(false);
  });

  it("requires every submitted output to match", async () => {
    const r = await gradeOutputTest({ expected: "7" }, ["7", "8"]);
    expect(r.passed).toBe(false);
  });

  it("rejects an empty submission array as nothing submitted", async () => {
    const r = await gradeOutputTest({ expected: "7" }, []);
    expect(r.passed).toBe(false);
    expect(r.error).toMatch(/submit the output/i);
  });
});

describe("isExecutableLanguage", () => {
  it("covers exactly the sandbox's engines", () => {
    for (const lang of ["python", "javascript", "js", "typescript", "ts", "sql", "TypeScript", "Python"]) {
      expect(isExecutableLanguage(lang), `${lang} should be executable`).toBe(true);
    }
    for (const lang of ["c", "cpp", "java", "php", "go", "rust", "kotlin", "C++", "HTML"]) {
      expect(isExecutableLanguage(lang), `${lang} should not be executable`).toBe(false);
    }
  });
});

describe("projectGradingMode", () => {
  // Projects have no gradingMode column, so the mode is derived from the
  // language exactly as `gradingModeFor` does for challenges. Without this a
  // C project could never be completed: the sandbox would reject the code as
  // an unsupported language and no amount of correct work would pass.
  it("grades languages with no runtime from captured stdout", () => {
    for (const lang of ["c", "C", "cpp", "java", "php", "go", "rust", "kotlin"]) {
      expect(projectGradingMode({ language: lang }), `${lang} project`).toBe("stdout");
    }
  });

  it("grades sandbox languages in the sandbox", () => {
    for (const lang of ["python", "javascript", "typescript", "TypeScript", "sql"]) {
      expect(projectGradingMode({ language: lang }), `${lang} project`).toBe("function");
    }
  });
});
