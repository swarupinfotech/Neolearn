import { z } from "zod";
import { SAFETY } from "@/lib/constants";

// ------------------------------------------------------------------
// Auth
// ------------------------------------------------------------------
export const emailSchema = z.string().trim().toLowerCase().email().max(320);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(/[a-zA-Z]/, "Must contain a letter")
  .regex(/\d/, "Must contain a number");

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username too long")
  .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores");

export const displayNameSchema = z.string().trim().min(1).max(60);

export const registerInput = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  displayName: displayNameSchema,
});

export const loginInput = z.object({
  identifier: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(200),
});

export const forgotInput = z.object({ email: emailSchema });
export const resetInput = z.object({ token: z.string().min(10).max(200), password: passwordSchema });

// ------------------------------------------------------------------
// Onboarding
// ------------------------------------------------------------------
export const onboardingInput = z.object({
  topics: z.array(z.string()).min(1, "Pick at least one topic").max(10),
  experienceLevel: z.enum(["Beginner", "Intermediate", "Advanced"]),
  goal: z.enum(["Career", "College", "Interview", "Projects", "Hobby", "Cybersecurity"]),
});

// ------------------------------------------------------------------
// Profile
// ------------------------------------------------------------------
export const updateProfileInput = z.object({
  displayName: displayNameSchema,
  bio: z.string().trim().max(400).optional().default(""),
  skills: z.array(z.string()).max(20).optional().default([]),
  avatarUrl: z.string().url().max(400).nullable().optional(),
  privacy: z.enum(["public", "friends", "private"]).optional(),
});

// ------------------------------------------------------------------
// Lessons / progress
// ------------------------------------------------------------------
export const lessonProgressInput = z.object({
  progressPct: z.number().int().min(0).max(100),
  completed: z.boolean(),
});

// ------------------------------------------------------------------
// Quizzes
// ------------------------------------------------------------------
export const quizSubmitInput = z.object({
  quizId: z.string().min(1),
  answers: z.record(z.string(), z.any()),
  answersAny: z.any().optional(),
  startedAt: z.string().datetime().optional(),
  durationSec: z.number().int().min(0).max(86400).optional(),
});

// ------------------------------------------------------------------
// Challenges
// ------------------------------------------------------------------
export const challengeSubmitInput = z.object({
  challengeId: z.string().min(1),
  code: z.string().min(1).max(SAFETY.MAX_CODE_LENGTH),
  language: z.string().min(1).max(40),
  // Output-based grading (languages with no in-browser runtime): one captured
  // stdout per hidden test, in hidden-test order.
  outputs: z.array(z.string().max(SAFETY.MAX_CODE_LENGTH)).max(20).optional(),
});

// ------------------------------------------------------------------
// Projects
// ------------------------------------------------------------------
export const projectSubmitInput = z.object({
  projectId: z.string().min(1),
  code: z.string().min(1).max(SAFETY.MAX_CODE_LENGTH),
  language: z.string().min(1).max(40),
});

// ------------------------------------------------------------------
// Community
// ------------------------------------------------------------------
export const postInput = z.object({
  title: z.string().trim().min(3).max(SAFETY.MAX_TITLE_LENGTH),
  body: z.string().trim().min(10).max(SAFETY.MAX_BODY_LENGTH),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  courseId: z.string().min(1).optional(),
  lessonId: z.string().min(1).optional(),
});

export const commentInput = z.object({
  postId: z.string().min(1),
  parentId: z.string().min(1).optional(),
  body: z.string().trim().min(1).max(SAFETY.MAX_BODY_LENGTH),
  isAnswer: z.boolean().optional(),
});

export const reportInput = z.object({
  targetType: z.enum(["post", "comment"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(3).max(1000),
});

// ------------------------------------------------------------------
// Friends
// ------------------------------------------------------------------
export const friendActionInput = z.object({
  userId: z.string().min(1),
});

// ------------------------------------------------------------------
// Search
// ------------------------------------------------------------------
export const searchInput = z.object({
  q: z.string().trim().min(1).max(120),
  type: z.enum(["all", "courses", "challenges", "projects", "users", "community"]).default("all"),
});