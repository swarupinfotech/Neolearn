// ============================================================
// Achievement catalog.
//
// Every criterion is evaluated server-side in services/achievements.ts
// from real user activity — nothing here is awarded on a client claim.
// Criteria vocabulary:
//   lessons_completed | quizzes_passed | challenges_passed
//   courses_completed | projects_passed | paths_completed
//   xp_total | streak_days
//   technology_lessons (field = technology)
//   language_challenges (field = challenge language)
//   category_courses   (field = course category)
//
// Keys that already shipped (`first-lesson`, `challenge-first`, …) are
// reused on purpose: the row is updated in place, so anyone who already
// unlocked one keeps the credit, and no two achievements can fire on the
// same event. `icon` is rendered verbatim, so it holds an emoji.
// ============================================================

import type { AchievementSpec } from "./pipeline";

export const ACHIEVEMENTS: AchievementSpec[] = [
  // --- first actions -------------------------------------------------
  {
    key: "first-lesson",
    title: "First Lesson",
    description: "Complete your very first lesson.",
    icon: "🎯",
    xpReward: 10,
    order: 1,
    criteria: { type: "lessons_completed", value: 1 },
  },
  {
    key: "first_quiz",
    title: "First Quiz",
    description: "Pass your first quiz.",
    icon: "🧠",
    xpReward: 10,
    order: 2,
    criteria: { type: "quizzes_passed", value: 1 },
  },
  {
    key: "challenge-first",
    title: "First Challenge",
    description: "Solve your first coding challenge.",
    icon: "⚔️",
    xpReward: 20,
    order: 3,
    criteria: { type: "challenges_passed", value: 1 },
  },

  // --- streaks -------------------------------------------------------
  {
    key: "streak-7",
    title: "7 Day Streak",
    description: "Learn something every day for a week.",
    icon: "🔥",
    xpReward: 50,
    order: 4,
    criteria: { type: "streak_days", value: 7 },
  },
  {
    key: "streak_30",
    title: "30 Day Streak",
    description: "Keep a full month of learning alive.",
    icon: "🔥",
    xpReward: 300,
    order: 5,
    criteria: { type: "streak_days", value: 30 },
  },

  // --- XP milestones -------------------------------------------------
  {
    key: "xp_1000",
    title: "1,000 XP",
    description: "Accumulate 1,000 experience points.",
    icon: "🏆",
    xpReward: 100,
    order: 6,
    criteria: { type: "xp_total", value: 1000 },
  },
  {
    key: "xp_5000",
    title: "5,000 XP",
    description: "Accumulate 5,000 experience points.",
    icon: "🏆",
    xpReward: 250,
    order: 7,
    criteria: { type: "xp_total", value: 5000 },
  },
  {
    key: "xp_10000",
    title: "10,000 XP",
    description: "Accumulate 10,000 experience points.",
    icon: "🏆",
    xpReward: 500,
    order: 8,
    criteria: { type: "xp_total", value: 10000 },
  },

  // --- language and category milestones -------------------------------
  {
    key: "python_beginner",
    title: "Python Beginner",
    description: "Complete 3 lessons in a Python course.",
    icon: "🐍",
    xpReward: 50,
    order: 9,
    criteria: { type: "technology_lessons", field: "Python", value: 3 },
  },
  {
    key: "javascript_beginner",
    title: "JavaScript Beginner",
    description: "Complete 3 lessons in a JavaScript course.",
    icon: "⚡",
    xpReward: 50,
    order: 10,
    criteria: { type: "technology_lessons", field: "JavaScript", value: 3 },
  },
  {
    key: "web_developer",
    title: "Web Developer",
    description: "Complete 3 web development courses.",
    icon: "🌐",
    xpReward: 150,
    order: 11,
    criteria: { type: "category_courses", field: "Web Development", value: 3 },
  },
  {
    key: "security_beginner",
    title: "Security Beginner",
    description: "Complete 3 cybersecurity courses.",
    icon: "🔐",
    xpReward: 150,
    order: 12,
    criteria: { type: "category_courses", field: "Cybersecurity", value: 3 },
  },
  {
    key: "devops_beginner",
    title: "DevOps Beginner",
    description: "Complete 3 DevOps & Cloud courses.",
    icon: "☁️",
    xpReward: 150,
    order: 13,
    criteria: { type: "category_courses", field: "DevOps & Cloud", value: 3 },
  },
  {
    key: "sql_explorer",
    title: "SQL Explorer",
    description: "Complete 3 lessons in a SQL course.",
    icon: "🗄️",
    xpReward: 50,
    order: 14,
    criteria: { type: "technology_lessons", field: "SQL", value: 3 },
  },

  // --- challenge volume -----------------------------------------------
  {
    key: "challenges_10",
    title: "10 Challenges",
    description: "Solve 10 coding challenges.",
    icon: "💻",
    xpReward: 100,
    order: 15,
    criteria: { type: "challenges_passed", value: 10 },
  },
  {
    key: "challenges_50",
    title: "50 Challenges",
    description: "Solve 50 coding challenges.",
    icon: "💻",
    xpReward: 400,
    order: 16,
    criteria: { type: "challenges_passed", value: 50 },
  },

  // --- finishing milestones ------------------------------------------
  {
    key: "project-first",
    title: "First Project",
    description: "Complete your first real-world project.",
    icon: "🛠️",
    xpReward: 30,
    order: 17,
    criteria: { type: "projects_passed", value: 1 },
  },
  {
    key: "course-first",
    title: "First Course Completed",
    description: "Finish a full course end to end.",
    icon: "🎓",
    xpReward: 100,
    order: 18,
    criteria: { type: "courses_completed", value: 1 },
  },
  {
    key: "first_path",
    title: "First Learning Path Completed",
    description: "Finish every course, challenge and project in a learning path.",
    icon: "🎓",
    xpReward: 300,
    order: 19,
    criteria: { type: "paths_completed", value: 1 },
  },
];
