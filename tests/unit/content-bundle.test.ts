import { describe, it, expect } from "vitest";
import { EXPANSION } from "../../prisma/content";
import type { QuestionSpec } from "../../prisma/content/pipeline";

// ============================================================
// Authoring guardrails for the expansion content bundle.
//
// These run in the pure unit suite, with no database, and they check
// the mistakes that are easy to make when hand-writing content and
// expensive to discover: an answer index that points past the end of
// the options array, a MATCH question stored in the wrong shape, a
// duplicate slug that would silently overwrite content on re-seed.
// ============================================================

const quizzes = EXPANSION.quizzes ?? [];
const allQuestions: { quiz: string; index: number; q: QuestionSpec }[] = [];
for (const { spec, questions } of quizzes) {
  questions.forEach((q, index) => allQuestions.push({ quiz: spec.slug, index, q }));
}

const INDEX_ANSWERED = new Set(["MCQ", "TRUE_FALSE", "DEBUGGING", "SCENARIO", "CORRECT"]);

/**
 * TRUE_FALSE has no stored options: the runner renders a hardcoded
 * ["true", "false"] pair, so the grading key is an index into that.
 */
const IMPLICIT_OPTIONS: Record<string, string[]> = { TRUE_FALSE: ["true", "false"] };

const optionCount = (q: QuestionSpec): number => (q.options ?? IMPLICIT_OPTIONS[q.type] ?? []).length;

describe("expansion content bundle", () => {
  it("declares courses, challenges, projects, a path and quizzes", () => {
    expect(EXPANSION.courses?.length ?? 0).toBeGreaterThan(0);
    expect(EXPANSION.challenges?.length ?? 0).toBeGreaterThan(0);
    expect(EXPANSION.projects?.length ?? 0).toBeGreaterThan(0);
    expect(EXPANSION.paths?.length ?? 0).toBeGreaterThan(0);
    expect(quizzes.length).toBeGreaterThan(0);
  });

  it("has no duplicate slugs within each content kind", () => {
    const check = (label: string, slugs: (string | undefined)[]) => {
      const seen = new Set<string>();
      const dupes = slugs.filter((s) => (s === undefined ? false : seen.has(s!) || !seen.add(s!)));
      expect(dupes, `duplicate ${label} slug(s)`).toEqual([]);
    };
    check("course", (EXPANSION.courses ?? []).map((c) => c.slug));
    check("challenge", (EXPANSION.challenges ?? []).map((c) => c.slug));
    check("project", (EXPANSION.projects ?? []).map((p) => p.slug));
    check("path", (EXPANSION.paths ?? []).map((p) => p.slug));
    check("quiz", quizzes.map((b) => b.spec.slug));
    check("achievement", (EXPANSION.achievements ?? []).map((a) => a.key));
  });

  it("gives every course at least one lesson and a unique lesson slug", () => {
    const slugs: string[] = [];
    for (const course of EXPANSION.courses ?? []) {
      const lessons = course.modules.flatMap((m) => m.lessons);
      expect(lessons.length, `${course.slug} has no lessons`).toBeGreaterThan(0);
      for (const lesson of lessons) {
        expect(lesson.slug).toBeTruthy();
        expect(lesson.blocks.length, `${lesson.slug} has no blocks`).toBeGreaterThan(0);
        slugs.push(lesson.slug);
      }
    }
    expect(new Set(slugs).size, "duplicate lesson slug(s)").toBe(slugs.length);
  });
});

describe("expansion quiz questions", () => {
  it("every index-answered question's correct index is within its options", () => {
    for (const { quiz, index, q } of allQuestions) {
      if (!INDEX_ANSWERED.has(q.type)) continue;
      const count = optionCount(q);
      expect(count, `${quiz} #${index} (${q.type}) has no options`).toBeGreaterThan(0);
      for (const answer of q.correctAnswer) {
        const n = Number(answer);
        expect(Number.isInteger(n), `${quiz} #${index} answer "${String(answer)}" is not an index`).toBe(true);
        expect(
          n >= 0 && n < count,
          `${quiz} #${index} (${q.type}) answer index ${n} is outside 0..${count - 1}`
        ).toBe(true);
      }
    }
  });

  it("TRUE_FALSE keys are 0 (true) or 1 (false)", () => {
    for (const { quiz, index, q } of allQuestions) {
      if (q.type !== "TRUE_FALSE") continue;
      expect(q.correctAnswer, `${quiz} #${index} TRUE_FALSE must have exactly one key`).toHaveLength(1);
      expect(["0", "1"]).toContain(String(q.correctAnswer[0]));
    }
  });

  it("MULTI_SELECT answers are valid indices and select more than one option", () => {
    for (const { quiz, index, q } of allQuestions) {
      if (q.type !== "MULTI_SELECT") continue;
      const options = q.options ?? [];
      expect(q.correctAnswer.length, `${quiz} #${index} MULTI_SELECT needs 2+ correct options`).toBeGreaterThan(1);
      for (const answer of q.correctAnswer) {
        const n = Number(answer);
        expect(Number.isInteger(n) && n >= 0 && n < options.length, `${quiz} #${index} bad index ${String(answer)}`).toBe(
          true
        );
      }
      expect(new Set(q.correctAnswer).size, `${quiz} #${index} has duplicate correct indices`).toBe(q.correctAnswer.length);
    }
  });

  it("FILL and OUTPUT questions have a non-empty correct answer", () => {
    for (const { quiz, index, q } of allQuestions) {
      if (q.type !== "FILL" && q.type !== "OUTPUT") continue;
      expect(q.correctAnswer.length, `${quiz} #${index} (${q.type}) has no correct answer`).toBeGreaterThan(0);
      for (const answer of q.correctAnswer) {
        expect(String(answer).trim().length, `${quiz} #${index} has a blank accepted answer`).toBeGreaterThan(0);
      }
    }
  });

  it("MATCH questions are authored as pairs so the pipeline can flatten them", () => {
    for (const { quiz, index, q } of allQuestions) {
      if (q.type !== "MATCH") continue;
      expect(q.pairs?.length ?? 0, `${quiz} #${index} MATCH has no pairs`).toBeGreaterThanOrEqual(2);
      const lefts = (q.pairs ?? []).map((p) => p.left);
      expect(new Set(lefts).size, `${quiz} #${index} has duplicate left-hand items`).toBe(lefts.length);
      const rights = (q.pairs ?? []).map((p) => p.right);
      expect(new Set(rights).size, `${quiz} #${index} has duplicate right-hand items`).toBe(rights.length);
      for (const p of q.pairs ?? []) {
        expect(p.left.trim().length, `${quiz} #${index} blank left`).toBeGreaterThan(0);
        expect(p.right.trim().length, `${quiz} #${index} blank right`).toBeGreaterThan(0);
      }
    }
  });

  it("OUTPUT questions ship the code they ask about", () => {
    for (const { quiz, index, q } of allQuestions) {
      if (q.type !== "OUTPUT") continue;
      expect(q.code?.trim().length ?? 0, `${quiz} #${index} OUTPUT has no code snippet`).toBeGreaterThan(0);
    }
  });

  it("every question has an explanation worth reading", () => {
    for (const { quiz, index, q } of allQuestions) {
      expect(q.explanation?.trim().length ?? 0, `${quiz} #${index} has no explanation`).toBeGreaterThan(20);
    }
  });

  it("every quiz has a passing score, an XP reward and at least five questions", () => {
    for (const { spec, questions } of quizzes) {
      expect(questions.length, `${spec.slug} has too few questions`).toBeGreaterThanOrEqual(5);
      expect(spec.passingScore ?? 0).toBeGreaterThan(0);
      expect(spec.passingScore ?? 0).toBeLessThanOrEqual(100);
      expect(spec.xpReward ?? 0).toBeGreaterThan(0);
    }
  });

  it("exercises every question type the runner and grader support", () => {
    // Guards against the assessment silently narrowing to plain MCQ as
    // more content lands.
    const used = new Set(allQuestions.map((x) => x.q.type));
    for (const type of ["MCQ", "TRUE_FALSE", "OUTPUT", "FILL", "MULTI_SELECT", "MATCH", "DEBUGGING"]) {
      expect(used.has(type), `no question uses ${type}`).toBe(true);
    }
  });
});

describe("expansion challenges and projects", () => {
  it("challenges declare a grading mode consistent with their tests", () => {
    for (const c of EXPANSION.challenges ?? []) {
      expect(["function", "stdout"]).toContain(c.gradingMode);
      if (c.gradingMode === "function") {
        expect(c.functionName, `${c.slug} is function-graded but has no functionName`).toBeTruthy();
        expect((c.publicTests ?? []).length, `${c.slug} has no public tests`).toBeGreaterThan(0);
        expect((c.hiddenTests ?? []).length, `${c.slug} has no hidden tests`).toBeGreaterThan(0);
      } else {
        // stdout challenges are graded from pasted program output, so each
        // test must state the exact stdin the program receives.
        expect(c.inputFormat?.trim().length ?? 0, `${c.slug} is stdout-graded but has no inputFormat`).toBeGreaterThan(0);
        for (const t of c.hiddenTests ?? []) {
          expect(typeof t.stdin, `${c.slug} hidden test "${t.name}" has no stdin`).toBe("string");
        }
      }
    }
  });

  it("hidden tests are not accidentally identical to public ones", () => {
    for (const c of EXPANSION.challenges ?? []) {
      const pub = new Set((c.publicTests ?? []).map((t) => JSON.stringify([t.input ?? null, t.expected])));
      for (const h of c.hiddenTests ?? []) {
        const key = JSON.stringify([h.input ?? null, h.expected]);
        expect(pub.has(key), `${c.slug} hidden test "${h.name}" duplicates a public test`).toBe(false);
      }
    }
  });

  it("projects declare requirements, criteria and public tests", () => {
    for (const p of EXPANSION.projects ?? []) {
      expect(p.requirements.length, `${p.slug} has no requirements`).toBeGreaterThan(0);
      expect((p.criteria ?? []).length, `${p.slug} has no grading criteria`).toBeGreaterThan(0);
      expect((p.publicTests ?? []).length, `${p.slug} has no public tests`).toBeGreaterThan(0);
    }
  });

  it("projects with no runtime are specified as stdin/output cases", () => {
    // `submitProject` grades a non-executable language from the output the
    // learner reports, one per case. A case without stdin, or with a
    // non-string expectation, cannot be graded or displayed.
    const executable = new Set(["python", "javascript", "js", "typescript", "ts", "sql"]);
    for (const p of EXPANSION.projects ?? []) {
      if (executable.has(p.language.toLowerCase())) continue;
      for (const t of p.publicTests ?? []) {
        expect(typeof t.stdin, `${p.slug} case "${t.name}" has no stdin`).toBe("string");
        expect(typeof t.expected, `${p.slug} case "${t.name}" expected output must be a string`).toBe("string");
      }
      expect(
        p.starterCode.trim().length,
        `${p.slug} has no starter code for a language the sandbox cannot run`
      ).toBeGreaterThan(0);
    }
  });
});

describe("expansion paths", () => {
  it("reference only slugs the bundle or baseline provides", () => {
    // The bundle's own slugs plus the known baseline slugs the Stage 1
    // path was built on. A typo here would throw at seed time, so this
    // catches it before a database is involved.
    const baselineCourses = new Set(["python-fundamentals", "js-essentials", "sql-and-databases", "html-css-basics"]);
    const courseSlugs = new Set([...(EXPANSION.courses ?? []).map((c) => c.slug), ...baselineCourses]);
    const challengeSlugs = new Set((EXPANSION.challenges ?? []).map((c) => c.slug));
    const projectSlugs = new Set((EXPANSION.projects ?? []).map((p) => p.slug));
    const quizSlugs = new Set(quizzes.map((b) => b.spec.slug));
    const pathSlugs = new Set((EXPANSION.paths ?? []).map((p) => p.slug));

    for (const path of EXPANSION.paths ?? []) {
      for (const s of path.courseSlugs) {
        expect(courseSlugs.has(s), `path ${path.slug} references unknown course "${s}"`).toBe(true);
      }
      for (const s of path.challengeSlugs ?? []) {
        expect(challengeSlugs.has(s), `path ${path.slug} references unknown challenge "${s}"`).toBe(true);
      }
      for (const s of path.projectSlugs ?? []) {
        expect(projectSlugs.has(s), `path ${path.slug} references unknown project "${s}"`).toBe(true);
      }
      for (const s of path.prerequisitePathSlugs ?? []) {
        expect(pathSlugs.has(s), `path ${path.slug} references unknown prerequisite path "${s}"`).toBe(true);
      }
      if (path.finalQuizSlug) {
        expect(quizSlugs.has(path.finalQuizSlug), `path ${path.slug} references unknown quiz "${path.finalQuizSlug}"`).toBe(
          true
        );
      }
    }
  });

  it("has no prerequisite cycles", () => {
    const bySlug = new Map((EXPANSION.paths ?? []).map((p) => [p.slug, p]));
    const state = new Map<string, "visiting" | "done">();
    const visit = (slug: string, trail: string[]): void => {
      if (state.get(slug) === "done") return;
      if (state.get(slug) === "visiting") {
        throw new Error(`prerequisite cycle: ${[...trail, slug].join(" -> ")}`);
      }
      state.set(slug, "visiting");
      for (const prereq of bySlug.get(slug)?.prerequisitePathSlugs ?? []) visit(prereq, [...trail, slug]);
      state.set(slug, "done");
    };
    for (const slug of bySlug.keys()) visit(slug, []);
  });
});
