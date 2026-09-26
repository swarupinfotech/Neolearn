import { describe, it, expect } from "vitest";
import { CATALOG, NEW_COURSES, EXECUTABLE_TECH } from "../../prisma/content/catalog";
import { EXPANSION } from "../../prisma/content";

// ============================================================
// Blueprint guardrails.
//
// The catalog is the plan of record for the expansion, so the claims it
// makes — 43 courses, 36 new, every category populated, and above all
// "this course's practice work really runs" — are checked here rather
// than trusted. A course labelled `executable` when nothing on the
// platform can execute it is a promise the product cannot keep.
// ============================================================

const EXISTING_SLUGS = [
  "html-css-foundations",
  "python-fundamentals",
  "js-essentials",
  "typescript-fundamentals",
  "sql-and-databases",
  "cybersecurity-basics",
  "devops-crash-course",
];

describe("catalog blueprint", () => {
  it("plans 43 courses, of which 36 are new", () => {
    expect(CATALOG).toHaveLength(43);
    expect(NEW_COURSES).toHaveLength(36);
    expect(CATALOG.filter((c) => c.existing)).toHaveLength(7);
  });

  it("has no duplicate slugs", () => {
    const slugs = CATALOG.map((c) => c.slug);
    expect(new Set(slugs).size, "duplicate course slug(s) in the blueprint").toBe(slugs.length);
  });

  it("keeps every existing course in the blueprint, untouched", () => {
    const bySlug = new Map(CATALOG.map((c) => [c.slug, c]));
    for (const slug of EXISTING_SLUGS) {
      const course = bySlug.get(slug);
      expect(course, `${slug} is missing from the blueprint`).toBeTruthy();
      expect(course?.existing, `${slug} is not marked as an existing course`).toBe(true);
    }
  });

  it("gives every course the metadata the catalog filters need", () => {
    for (const c of CATALOG) {
      expect(c.title.trim().length, `${c.slug} has no title`).toBeGreaterThan(0);
      expect(c.category, `${c.slug} has no category`).toBeTruthy();
      expect(c.technology, `${c.slug} has no technology`).toBeTruthy();
      expect(["Beginner", "Intermediate", "Advanced"], `${c.slug} difficulty`).toContain(c.difficulty);
      expect(c.xpReward, `${c.slug} has no XP reward`).toBeGreaterThan(0);
      expect(c.icon.trim().length, `${c.slug} has no icon`).toBeGreaterThan(0);
      expect(c.color, `${c.slug} has no color`).toMatch(/^#[0-9a-f]{6}$/i);
      expect(c.blurb.trim().length, `${c.slug} has no blurb`).toBeGreaterThan(0);
    }
  });

  it("plans module titles for every new course, and only for new courses", () => {
    // The 7 existing courses are authored in the baseline seed and are not
    // touched by this expansion, so the blueprint deliberately carries no
    // module list for them. Every course the expansion adds must have one.
    const missing = CATALOG.filter((c) => !c.existing && c.modules.length === 0).map((c) => c.slug);
    expect(missing, "new courses with no planned modules").toEqual([]);
  });

  it("only labels a course executable when the sandbox can run it", () => {
    const lying = CATALOG.filter((c) => c.practice === "executable" && !EXECUTABLE_TECH.has(c.technology)).map((c) => ({
      slug: c.slug,
      technology: c.technology,
    }));
    expect(lying, "these courses claim executable practice but no runtime exists for them").toEqual([]);
  });

  it("covers every category and every difficulty", () => {
    const categories = new Set(CATALOG.map((c) => c.category));
    for (const expected of [
      "Programming",
      "Web Development",
      "Database",
      "Cybersecurity",
      "DevOps",
      "Cloud",
      "Data & AI",
    ]) {
      expect(categories.has(expected as never), `no courses in ${expected}`).toBe(true);
    }
    const difficulties = new Set(CATALOG.map((c) => c.difficulty));
    expect(difficulties.size, "the catalog is missing a difficulty band").toBe(3);
  });
});

describe("authored content matches the blueprint", () => {
  const authored = EXPANSION.courses ?? [];
  const bySlug = new Map(CATALOG.map((c) => [c.slug, c]));

  it("every authored course exists in the blueprint with the same shape", () => {
    for (const course of authored) {
      const planned = bySlug.get(course.slug);
      expect(planned, `${course.slug} is authored but not in the blueprint`).toBeTruthy();
      expect(course.difficulty, `${course.slug} difficulty differs from the blueprint`).toBe(planned!.difficulty);
      expect(course.category, `${course.slug} category differs from the blueprint`).toBe(planned!.category);
      // Module titles are only planned for courses this expansion adds.
      if (planned!.modules.length > 0) {
        expect(
          course.modules.map((m) => m.title),
          `${course.slug} module titles differ from the blueprint`
        ).toEqual(planned!.modules);
      }
    }
  });

  it("C keeps the blueprint's module list and its Beginner lesson budget", () => {
    const c = authored.find((x) => x.slug === "c-programming-fundamentals");
    expect(c, "C course is not authored").toBeTruthy();
    expect(c!.difficulty).toBe("Beginner");
    expect(c!.modules.map((m) => m.title), "C module titles differ from the blueprint").toEqual(
      bySlug.get("c-programming-fundamentals")!.modules
    );
    const lessons = c!.modules.flatMap((m) => m.lessons);
    expect(lessons.length, "a Beginner course must have 12-15 lessons").toBeGreaterThanOrEqual(12);
    expect(lessons.length, "a Beginner course must have 12-15 lessons").toBeLessThanOrEqual(15);
  });

  it("C ships a course assessment, three graded challenges and a project", () => {
    const quizzes = (EXPANSION.quizzes ?? []).filter((b) => b.spec.courseSlug === "c-programming-fundamentals");
    expect(quizzes.some((b) => b.spec.type === "COURSE"), "C has no COURSE assessment").toBe(true);

    const challenges = (EXPANSION.challenges ?? []).filter((c) => c.language === "c");
    const difficulties = challenges.map((c) => c.difficulty).sort();
    expect(difficulties, "C needs an Easy, Medium and Hard challenge").toEqual(["Easy", "Hard", "Medium"]);

    const projects = (EXPANSION.projects ?? []).filter((p) => p.language === "c");
    expect(projects.length, "C has no project").toBeGreaterThan(0);
  });
});
