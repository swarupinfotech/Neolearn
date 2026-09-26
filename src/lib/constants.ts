export const XP_REWARDS = {
  lesson: 10,
  quiz: 20,
  challenge: 30,
  daily_mission: 50,
  course: 100,
  project: 40,
} as const;

export const XP_TRANSACTION_TYPES = [
  "lesson",
  "quiz",
  "challenge",
  "daily_mission",
  "course",
  "project",
  "achievement",
] as const;

export const COURSE_CATEGORIES = [
  "Programming",
  "Web Development",
  "Database",
  "Cybersecurity",
  "DevOps & Cloud",
  "Data & AI",
] as const;

/**
 * Backwards-compatible short labels. Older courses were seeded with
 * "DevOps" as their category, so the discovery filters accept both.
 */
export const COURSE_CATEGORY_ALIASES: Record<string, string> = {
  DevOps: "DevOps & Cloud",
};

export const COURSE_DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;

export const COURSE_SORTS = [
  { value: "popular", label: "Most popular" },
  { value: "newest", label: "Newest" },
  { value: "beginner", label: "Beginner friendly" },
  { value: "xp", label: "Highest XP" },
  { value: "rating", label: "Top rated" },
] as const;

export type CourseSort = (typeof COURSE_SORTS)[number]["value"];

export const LANGUAGES = [
  "Python",
  "JavaScript",
  "Java",
  "C",
  "C++",
  "C#",
  "PHP",
  "TypeScript",
  "Go",
  "Rust",
  "HTML",
  "CSS",
  "SQL",
  "React",
  "Node.js",
] as const;

export const CHALLENGE_CATEGORIES = [
  "Algorithms",
  "Data Structures",
  "Arrays",
  "Strings",
  "Loops",
  "Functions",
  "OOP",
  "Debugging",
  "SQL",
  "Web",
  "React",
  "Security",
  "Secure Coding",
] as const;

export const CHALLENGE_LANGUAGES = [
  "python",
  "javascript",
  "typescript",
  "sql",
  "html",
  "c",
  "cpp",
  "java",
  "php",
  "go",
] as const;

export const CHALLENGE_DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export const LEVEL_CAP = 100;
export const DEFAULT_MAX_LEVEL = 100;

export const ONBOARDING_TOPICS = [
  "Python",
  "JavaScript",
  "Java",
  "C",
  "C++",
  "PHP",
  "TypeScript",
  "HTML/CSS",
  "SQL",
  "Cybersecurity",
] as const;

export const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

/**
 * Question types the grader understands. Rendered by
 * components/quiz/quiz-runner.tsx and graded server-side in
 * services/quiz.ts.
 */
export const QUESTION_TYPES = [
  "MCQ", // single answer
  "MULTI_SELECT", // several correct options
  "TRUE_FALSE",
  "OUTPUT", // what does this code print
  "DEBUGGING", // find the bug / pick the fix
  "SCENARIO", // security / real-world judgement call
  "FILL",
  "MATCH",
] as const;

export const GOALS = [
  "Career",
  "College",
  "Interview",
  "Projects",
  "Hobby",
  "Cybersecurity",
] as const;

export const SAFETY = {
  MAX_ANSWER_LENGTH: 200000,
  MAX_CODE_LENGTH: 100000,
  MAX_BODY_LENGTH: 20000,
  MAX_TITLE_LENGTH: 200,
  DEFAULT_RATE_LIMIT: 20,
};

export const SESSION_COOKIE = "cl_session";
export const CSRF_COOKIE = "cl_csrf";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const STRICT_RATE_LIMITS = {
  login: { limit: 10, windowSec: 60 * 15 },
  // Applied per target account in addition to the per-IP login limit, so
  // rotating source addresses cannot be used to brute force one account.
  // Kept tighter than the IP limit because real users mistype far less
  // often than a script cycles addresses.
  loginAccount: { limit: 8, windowSec: 60 * 15 },
  register: { limit: 5, windowSec: 60 * 60 },
  forgot: { limit: 5, windowSec: 60 * 60 },
  reset: { limit: 5, windowSec: 60 * 60 },
  quizSubmit: { limit: 30, windowSec: 60 },
  challengeSubmit: { limit: 30, windowSec: 60 },
  community: { limit: 20, windowSec: 60 * 10 },
  default: { limit: 30, windowSec: 60 },
} as const;