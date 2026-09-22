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
  "DevOps",
] as const;

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
  "Arrays",
  "Strings",
  "Loops",
  "Functions",
  "OOP",
  "Debugging",
  "SQL",
  "Web",
  "Security",
] as const;

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
  register: { limit: 5, windowSec: 60 * 60 },
  forgot: { limit: 5, windowSec: 60 * 60 },
  reset: { limit: 5, windowSec: 60 * 60 },
  quizSubmit: { limit: 30, windowSec: 60 },
  challengeSubmit: { limit: 30, windowSec: 60 },
  community: { limit: 20, windowSec: 60 * 10 },
  default: { limit: 30, windowSec: 60 },
} as const;