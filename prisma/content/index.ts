// ============================================================
// Expansion content bundle.
//
// Everything the platform adds on top of the original six-course seed
// lives here, grouped by kind. `seed.ts` pushes this through the
// idempotent pipeline, so running the seed twice never duplicates a
// course, lesson, challenge, project or path.
//
// Course / challenge / project / path files are added to this index as
// the content stages land.
// ============================================================

import type { ContentBundle } from "./pipeline";
import { typescriptFundamentals } from "./courses/typescript-fundamentals";
import { cFundamentals } from "./courses/c-programming-fundamentals";
import { TYPESCRIPT_QUIZZES } from "./quizzes/typescript";
import { C_QUIZZES } from "./quizzes/c-programming";
import { TYPESCRIPT_CHALLENGES } from "./challenges/typescript";
import { C_CHALLENGES } from "./challenges/c-programming";
import { typescriptTaskTracker } from "./projects/typescript-task-tracker";
import { cCliCalculator } from "./projects/c-cli-calculator";
import { softwareEngineeringFoundations } from "./paths/software-engineering-foundations";
import { ACHIEVEMENTS } from "./achievements";
import { buildMissions } from "./missions";

export const EXPANSION: ContentBundle = {
  courses: [typescriptFundamentals, cFundamentals],
  quizzes: [...TYPESCRIPT_QUIZZES, ...C_QUIZZES],
  challenges: [...TYPESCRIPT_CHALLENGES, ...C_CHALLENGES],
  projects: [typescriptTaskTracker, cCliCalculator],
  paths: [softwareEngineeringFoundations],
  achievements: ACHIEVEMENTS,
  // Two weeks of rotating missions; longer horizons are topped up by
  // src/services/daily.ts, which falls back to the core three tasks.
  missions: buildMissions(50),
};
