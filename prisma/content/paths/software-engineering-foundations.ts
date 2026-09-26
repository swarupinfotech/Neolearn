// ============================================================
// Learning path: Software Engineering Foundations.
//
// Stage 1 slice: this path currently spans the four foundation courses
// that exist in the catalog. Later content stages append to
// `courseSlugs` / `challengeSlugs` / `projectSlugs` in the order a
// learner should take them — the pipeline resolves the slugs to ids on
// every seed, so growing the path is a data-only change.
// ============================================================

import type { PathSpec } from "../pipeline";

export const softwareEngineeringFoundations: PathSpec = {
  slug: "software-engineering-foundations",
  title: "Software Engineering Foundations",
  description:
    "The core habits every engineer needs: a language, a second language, data storage, and typed code.",
  longDescription:
    "Most of what separates a working demo from maintainable software is not talent, it is fundamentals: one language learned properly, a second one for breadth, confidence in SQL, and a typed toolchain. This path walks through exactly that, in order, and finishes with a graded project so the knowledge has to be used rather than just read.",
  icon: "Compass",
  color: "#22c55e",
  level: "Beginner",
  xpReward: 500,
  prerequisitePathSlugs: [],
  courseSlugs: [
    "python-fundamentals",
    "js-essentials",
    "sql-and-databases",
    "typescript-fundamentals",
  ],
  projectSlugs: ["typescript-task-tracker"],
  challengeSlugs: ["ts-count-done", "ts-group-by-status", "ts-summarize-tasks"],
  finalQuizSlug: "software-engineering-foundations-final",
  order: 1,
};
