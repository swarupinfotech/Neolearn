#!/usr/bin/env tsx
/* eslint-disable no-console */
// NeoLearn database seed.
// Run with: npm run db:seed   (idempotent — safe to re-run)

import "dotenv/config";
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const isVerbose = process.env.SEED_VERBOSE === "1";
function log(...args: unknown[]) {
  console.log("[seed]", ...args);
}

// ------------------------------------------------------------------
// Content block helpers (match LessonBlockRenderer Block types)
// ------------------------------------------------------------------
const text = (body: string, title?: string) => ({ kind: "text", title, body });
const example = (code: string, language: string, title?: string) => ({ kind: "example", title, code, language });
const code = (value: string, language: string, title?: string, instructions?: string) => ({
  kind: "code",
  title,
  instructions,
  code: value,
  language,
});
const tips = (items: string[]) => ({ kind: "tips", items });
const complete = (title: string, message: string) => ({ kind: "complete", title, message });

interface LessonSpec {
  slug: string;
  title: string;
  type?: string;
  blocks: Record<string, unknown>[];
  duration?: number;
  xpReward?: number;
  quizId?: string;
}
interface ModuleSpec {
  title: string;
  lessons: LessonSpec[];
}
interface CourseSpec {
  slug: string;
  title: string;
  description: string;
  category: string;
  language: string;
  difficulty: string;
  icon: string;
  color: string;
  students?: number;
  modules: ModuleSpec[];
}

async function upsertCourse(spec: CourseSpec) {
  const course = await prisma.course.upsert({
    where: { slug: spec.slug },
    update: {
      title: spec.title,
      description: spec.description,
      category: spec.category,
      language: spec.language,
      difficulty: spec.difficulty,
      icon: spec.icon,
      color: spec.color,
      status: "PUBLISHED",
      students: spec.students ?? 0,
    },
    create: {
      slug: spec.slug,
      title: spec.title,
      description: spec.description,
      category: spec.category,
      language: spec.language,
      difficulty: spec.difficulty,
      icon: spec.icon,
      color: spec.color,
      rating: 4.6,
      ratingCount: 120,
      students: spec.students ?? 340,
      duration: spec.modules.reduce((acc, m) => acc + m.lessons.length * 5, 0),
      status: "PUBLISHED",
    },
  });

  for (const [mi, moduleSpec] of spec.modules.entries()) {
    const courseModule = await prisma.courseModule.upsert({
      where: { courseId_order: { courseId: course.id, order: mi + 1 } },
      update: { title: moduleSpec.title },
      create: { courseId: course.id, title: moduleSpec.title, order: mi + 1 },
    });
    for (const [li, lesson] of moduleSpec.lessons.entries()) {
      const payload = {
        moduleId: courseModule.id,
        title: lesson.title,
        type: lesson.type ?? "text",
        content: lesson.blocks as object,
        order: li + 1,
        duration: lesson.duration ?? 5,
        xpReward: lesson.xpReward ?? 10,
        quizId: lesson.quizId ?? null,
      };
      await prisma.lesson.upsert({ where: { slug: lesson.slug }, update: payload, create: { slug: lesson.slug, ...payload } });
    }
  }
  isVerbose && log(`course ${spec.slug}: ${spec.modules.reduce((a, m) => a + m.lessons.length, 0)} lessons`);
  return course;
}

interface QuestionSpec {
  type: string;
  prompt: string;
  code?: string;
  options?: unknown[];
  correctAnswer: unknown[];
  explanation?: string;
  points?: number;
}
interface QuizSpec {
  slug: string;
  title: string;
  type: "PRACTICE" | "ASSESSMENT" | "COURSE";
  courseSlug?: string;
  passingScore?: number;
  xpReward?: number;
}

async function upsertQuiz(spec: QuizSpec, questions: QuestionSpec[]) {
  const course = spec.courseSlug ? await prisma.course.findUnique({ where: { slug: spec.courseSlug } }) : null;
  if (spec.courseSlug && !course) throw new Error(`Quiz ${spec.slug} references missing course ${spec.courseSlug}`);
  const quiz = await prisma.quiz.upsert({
    where: { slug: spec.slug },
    update: { title: spec.title, type: spec.type, courseId: course?.id ?? null, passingScore: spec.passingScore ?? 70, xpReward: spec.xpReward ?? 20 },
    create: {
      slug: spec.slug,
      title: spec.title,
      type: spec.type,
      courseId: course?.id ?? null,
      passingScore: spec.passingScore ?? 70,
      xpReward: spec.xpReward ?? 20,
    },
  });
  const existing = await prisma.question.findMany({ where: { quizId: quiz.id }, orderBy: { order: "asc" } });
  for (const [i, q] of questions.entries()) {
    // match by order: reuse existing row when present (keeps stable ids between runs)
    const rowId = existing[i]?.id ?? `seed-q-${spec.slug}-${i}`;
    await prisma.question.upsert({
      where: { id: rowId },
      update: {
        type: q.type,
        prompt: q.prompt,
        code: q.code ?? null,
        options: q.options ? (q.options as Prisma.InputJsonValue) : Prisma.JsonNull,
        correctAnswer: q.correctAnswer as Prisma.InputJsonValue,
        explanation: q.explanation ?? null,
        order: i,
        points: q.points ?? 10,
        quizId: quiz.id,
      },
      create: {
        id: rowId,
        quizId: quiz.id,
        type: q.type,
        prompt: q.prompt,
        code: q.code ?? null,
        options: q.options ? (q.options as Prisma.InputJsonValue) : undefined,
        correctAnswer: q.correctAnswer as Prisma.InputJsonValue,
        explanation: q.explanation ?? null,
        order: i,
        points: q.points ?? 10,
      },
    });
  }
  if (existing.length > questions.length) {
    const remove = existing.slice(questions.length).map((x) => x.id);
    await prisma.question.deleteMany({ where: { id: { in: remove } } });
  }
  isVerbose && log(`quiz ${spec.slug}: ${questions.length} questions`);
  return quiz;
}

// ------------------------------------------------------------------
// Level math (mirrors src/services/level.ts)
// ------------------------------------------------------------------
function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * (level + 2);
}
function levelFromXp(xp: number, maxLevel = 100): number {
  let level = 1;
  while (level < maxLevel && xp >= xpThresholdForLevel(level + 1)) level += 1;
  return level;
}

// ------------------------------------------------------------------
// Achievement + settings + plans + daily missions
// ------------------------------------------------------------------
const ACHIEVEMENTS = [
  { key: "first-lesson", title: "First Steps", description: "Complete your first lesson.", icon: "🎯", xpReward: 10, criteria: { type: "lessons_completed", value: 1 }, order: 1 },
  { key: "lesson-10", title: "Getting Into It", description: "Complete 10 lessons.", icon: "📚", xpReward: 25, criteria: { type: "lessons_completed", value: 10 }, order: 2 },
  { key: "lesson-50", title: "Learning Machine", description: "Complete 50 lessons.", icon: "🚀", xpReward: 100, criteria: { type: "lessons_completed", value: 50 }, order: 3 },
  { key: "quiz-master", title: "Quiz Whiz", description: "Pass 3 quizzes.", icon: "🧠", xpReward: 30, criteria: { type: "quizzes_passed", value: 3 }, order: 4 },
  { key: "challenge-first", title: "Problem Solver", description: "Solve your first challenge.", icon: "⚔️", xpReward: 20, criteria: { type: "challenges_passed", value: 1 }, order: 5 },
  { key: "challenge-5", title: "Challenge Crusher", description: "Solve 5 challenges.", icon: "🛡️", xpReward: 75, criteria: { type: "challenges_passed", value: 5 }, order: 6 },
  { key: "course-first", title: "Course Graduate", description: "Complete a full course.", icon: "🎓", xpReward: 100, criteria: { type: "courses_completed", value: 1 }, order: 7 },
  { key: "xp-500", title: "500 XP", description: "Earn 500 total XP.", icon: "⚡", xpReward: 25, criteria: { type: "xp_total", value: 500 }, order: 8 },
  { key: "xp-2000", title: "XP Hunter", description: "Earn 2,000 total XP.", icon: "💎", xpReward: 100, criteria: { type: "xp_total", value: 2000 }, order: 9 },
  { key: "streak-7", title: "Weekly Warrior", description: "Reach a 7-day streak.", icon: "🔥", xpReward: 50, criteria: { type: "streak_days", value: 7 }, order: 10 },
  { key: "project-first", title: "Builder", description: "Ship your first project.", icon: "🏗️", xpReward: 30, criteria: { type: "projects_passed", value: 1 }, order: 11 },
];

async function seedAchievements() {
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { key: a.key },
      update: { title: a.title, description: a.description, icon: a.icon, xpReward: a.xpReward, criteria: a.criteria as unknown as object },
      create: { key: a.key, title: a.title, description: a.description, icon: a.icon, xpReward: a.xpReward, criteria: a.criteria as unknown as object, order: a.order },
    });
  }
}

async function seedSettings() {
  await prisma.setting.upsert({ where: { key: "site.name" }, update: { value: "NeoLearn" }, create: { key: "site.name", value: "NeoLearn" } });
  await prisma.setting.upsert({ where: { key: "site.active" }, update: { value: true }, create: { key: "site.active", value: true } });
  await prisma.setting.upsert({ where: { key: "security.registrationOpen" }, update: { value: true }, create: { key: "security.registrationOpen", value: true } });
  await prisma.setting.upsert({ where: { key: "gamification.dailyRewardXp" }, update: { value: 50 }, create: { key: "gamification.dailyRewardXp", value: 50 } });
}

async function seedPlans() {
  await prisma.premiumPlan.upsert({
    where: { key: "premium-monthly" },
    update: { name: "Premium Monthly", priceMonthly: 9, features: ["AI mentor", "Unlimited attempts", "Ad-free learning"] as object },
    create: { key: "premium-monthly", name: "Premium Monthly", priceMonthly: 9, features: ["AI mentor", "Unlimited attempts", "Ad-free learning"] as object },
  });
}

const DAILY_TASKS = [
  { key: "lesson", label: "Complete 1 lesson", target: 1 },
  { key: "quiz", label: "Pass 1 quiz", target: 1 },
  { key: "challenge", label: "Solve 1 coding challenge", target: 1 },
];

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function seedDailyMissions() {
  for (let i = 0; i < 3; i++) {
    const key = dateKey(new Date(Date.now() + i * 24 * 60 * 60 * 1000));
    await prisma.dailyMission.upsert({
      where: { dateKey: key },
      update: { tasks: DAILY_TASKS as object, rewardXp: 50 },
      create: { dateKey: key, tasks: DAILY_TASKS as object, rewardXp: 50 },
    });
  }
}

// ------------------------------------------------------------------
// Courses
// ------------------------------------------------------------------
const COURSES: CourseSpec[] = [
  // ============================ 1. Python Fundamentals (24 lessons)
  {
    slug: "python-fundamentals",
    title: "Python Fundamentals",
    description: "Master the essentials of Python — the world's most approachable programming language. From print statements to classes, 24 hands-on lessons with a real inline editor.",
    category: "Programming",
    language: "Python",
    difficulty: "Beginner",
    icon: "Snake",
    color: "#3776ab",
    students: 1240,
    modules: [
      {
        title: "Getting Started",
        lessons: [
          {
            slug: "python-welcome",
            title: "Welcome to Python",
            blocks: [
              text("Python is a high-level, interpreted language known for clean, readable syntax. It powers everything from web apps to data science and AI.\n\nIn this course you'll write real Python right in the browser — no setup needed. Each lesson mixes short explanations with runnable examples.", "Why Python?"),
              tips(["You can run every example in the lesson.", "Try changing the values and re-running.", "Don't worry about making mistakes — that's how you learn."]),
              complete("Ready to start", "Python is waiting for you. Let's go!"),
            ],
          },
          {
            slug: "python-printing",
            title: "Printing in Python",
            type: "code",
            blocks: [
              text("The built-in print() function writes text to the output console. It's the simplest way to see results from your code.", "Say hello with print"),
              code('print("Hello, Python!")\nprint(2 + 3)\nprint("I am learning", "to code")', "python", "Try it", "Run the code and watch the output."),
              tips(["print() can take more than one value — separate them with commas.", "Text must go inside quotes.", "Numbers don't need quotes."]),
              complete("You've printed", "You just ran your first real Python code."),
            ],
          },
          {
            slug: "python-variables",
            title: "Variables & Types",
            type: "code",
            blocks: [
              text("A variable is a named box that stores a value. Python infers the type for you: integers (int), decimals (float), text (str) and true/false (bool).", "Variables store values"),
              code('name = "Ada"\nage = 36\nheight = 1.67\nis_happy = True\n\nprint(name, age, height, is_happy)\nprint(type(age))', "python", "Try it", "Assign variables and inspect their types."),
              text("Use snake_case names like user_count, not spaces. Reassigning a variable is allowed: the new value simply replaces the old one."),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-variables-1",
                  type: "mcq",
                  prompt: "Which of these is a valid Python variable name?",
                  options: ["my-variable", "my_variable", "my variable", "2myvariable"],
                  correct: "1",
                  explanation: "Snake_case with letters, numbers and underscores only — and cannot start with a number.",
                },
              },
              complete("Variables sorted", "You now know how to store data."),
            ],
            xpReward: 10,
          },
          {
            slug: "python-math",
            title: "Numbers & Math",
            type: "code",
            blocks: [
              text("Python supports the usual arithmetic: + - * / and // (floor division), % (modulo) and ** (power).", "Arithmetic operators"),
              code("a = 7\nb = 2\nprint(a + b)   # 9\nprint(a - b)   # 5\nprint(a * b)   # 14\nprint(a / b)   # 3.5\nprint(a // b)  # 3  (floor)\nprint(a % b)   # 1  (remainder)\nprint(a ** b)  # 49 (power)", "python", "Try it", "Run and observe each operator's result."),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-math-1",
                  type: "output",
                  prompt: "What does this print?",
                  code: "print(10 % 3)",
                  accept: ["1", "1.0"],
                  explanation: "10 divided by 3 leaves remainder 1.",
                },
              },
              complete("Math done", "Numbers are your friend."),
            ],
          },
          {
            slug: "python-strings",
            title: "Working with Strings",
            type: "code",
            blocks: [
              text("Strings are text values. You can combine them with + (concatenation) and repeat with *. len() returns how many characters a string has.", "Text manipulation"),
              example('greeting = "Hello" + " " + "World"\nprint(greeting)\nprint(len(greeting))\nprint("ha" * 3)', "python", "String basics"),
              code('word = input("Type a word: ")\nprint("You typed:", word)\nprint("Length:", len(word))', "python", "Try it", "input() reads a line typed by the user."),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-strings-1",
                  type: "mcq",
                  prompt: "What does the + operator do on two strings?",
                  options: ["Adds their lengths", "Concatenates them", "Compares them", "Repeats them"],
                  correct: "1",
                  explanation: "+ joins strings end to end.",
                },
              },
            ],
          },
          {
            slug: "python-comments",
            title: "Comments & Readability",
            blocks: [
              text("A comment starts with # and is ignored by Python. Comments explain why, not what — they keep your code understandable for your future self and teammates.", "Writing clear code"),
              example('# Tip: always say WHY you are doing something\ntotal = price * quantity  # price includes tax', "python", "Comments in action"),
              tips(["Use descriptive variable names.", "One idea per line.", "Comment non-obvious decisions."]),
              complete("Clear code", "Readable code is maintainable code."),
            ],
          },
          {
            slug: "python-input",
            title: "Taking User Input",
            type: "code",
            blocks: [
              text("input(prompt) waits for the user to type something. It always returns a string, so convert with int() or float() when you need numbers.", "Talk to your program"),
              code('name = input("What is your name? ")\nage = int(input("How old are you? "))\nprint(f"Hi {name}, you are {age} years old.")\nprint("Next year you will be", age + 1)', "python", "Try it", "Run, answer the prompts, and see the conversation."),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-input-1",
                  type: "mcq",
                  prompt: "What type does input() always return?",
                  options: ["int", "float", "str", "bool"],
                  correct: "2",
                  explanation: "input() returns a string — convert it if you need another type.",
                },
              },
              complete("Input mastered", "Your programs can now talk back."),
            ],
          },
          {
            slug: "python-basics-under-the-hood",
            title: "How Python Runs Your Code",
            blocks: [
              text("Python executes your file top to bottom. Statements run immediately; functions and classes are definitions that run only when called. Understanding execution order saves hours of debugging."),
              text("Errors are your friends. NameError means a name doesn't exist yet; TypeError means the wrong kind of value was used. Read the last line of an error first.", "Reading errors"),
              tips(["Read error messages from the bottom up.", "Check spelling of variable names.", "Make one change at a time."]),
              complete("Basics complete", "You've finished Module 1 — foundations laid."),
            ],
          },
        ],
      },
      {
        title: "Control Flow & Data Structures",
        lessons: [
          {
            slug: "python-booleans",
            title: "Booleans & Comparisons",
            type: "code",
            blocks: [
              text("Booleans are True or False. Comparisons like ==, !=, <, >, <=, >= produce booleans — the fuel for decisions.", "True or False?"),
              code('print(3 == 3)   # True\nprint(3 != 3)   # False\nprint(5 > 2)    # True\nprint(2 >= 3)   # False', "python", "Try it"),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-booleans-1",
                  type: "true_false",
                  prompt: "In Python the comparison operator for equality is =.",
                  correct: "1",
                  explanation: "= assigns, == compares.",
                },
              },
            ],
          },
          {
            slug: "python-if-else",
            title: "Making Decisions with if",
            type: "code",
            blocks: [
              text("if/elif/else lets your code choose a path. The condition decides which block runs — only one path ever executes.", "A fork in the road"),
              code('age = int(input("Age? "))\nif age >= 18:\n    print("You can vote.")\nelif age >= 16:\n    print("Almost there.")\nelse:\n    print("Too young yet.")', "python", "Try it", "Change the age and re-run."),
              text("Indentation matters! The block after a colon must be indented consistently — Python refuses to guess your structure."),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-if-1",
                  type: "mcq",
                  prompt: "What marks the start of a code block in Python?",
                  options: ["A closing brace", "An indented line", "The word begin", "A semicolon"],
                  correct: "1",
                  explanation: "Python uses indentation to define blocks.",
                },
              },
            ],
          },
          {
            slug: "python-while-loops",
            title: "Loops: while",
            type: "code",
            blocks: [
              text("A while loop repeats as long as its condition stays True. Always make sure the condition eventually becomes False — otherwise you've built an infinite loop.", "Repeat while true"),
              code("count = 1\nwhile count <= 5:\n    print(\"Count:\", count)\n    count = count + 1\nprint(\"Done!\")", "python", "Try it", "Watch the loop count up and finish."),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-while-1",
                  type: "output",
                  prompt: "How many times does this loop run?",
                  code: "x = 0\nwhile x < 3:\n    x = x + 1",
                  accept: ["3", "3 times"],
                  explanation: "x goes 0→1→2→3; at 3 the condition is false, so 3 iterations.",
                },
              },
            ],
          },
          {
            slug: "python-for-loops",
            title: "Loops: for",
            type: "code",
            blocks: [
              text("A for loop iterates over a sequence — a list, tuple, string or range. range(n) produces 0..n-1.", "Iterating with style"),
              code('for i in range(1, 6):\n    print("Square of", i, "is", i * i)\n\nfor letter in "code":\n    print(letter)', "python", "Try it"),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-for-1",
                  type: "mcq",
                  prompt: "What does range(3) produce?",
                  options: ["[1, 2, 3]", "[0, 1, 2]", "[3]", "[0 to 3]"],
                  correct: "1",
                  explanation: "range(n) yields 0,1,…,n-1.",
                },
              },
            ],
          },
          {
            slug: "python-lists",
            title: "Lists: Your First Collection",
            type: "code",
            blocks: [
              text("Lists store ordered values in square brackets. Index from 0; append() adds to the end; len() gives the size.", "Ordered collections"),
              code("scores = [90, 75, 88]\nprint(scores[0])      # 90\nscores.append(42)\nprint(scores)         # [90, 75, 88, 42]\nprint(len(scores))    # 4\nfor s in scores:\n    print(\"Score:\", s)", "python", "Try it", "Read, modify and iterate over a list."),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-lists-1",
                  type: "output",
                  prompt: "What is the value of scores[1] in this list?",
                  code: "scores = [10, 20, 30]",
                  accept: ["20"],
                  explanation: "Indexing starts at 0, so [1] is the second element.",
                },
              },
            ],
          },
          {
            slug: "python-tuples",
            title: "Tuples: Immutable Friends",
            blocks: [
              text("Tuples are like lists but can't be changed after creation — great for data that must stay constant, like coordinates or configuration."),
              example('point = (3, 4)\nx, y = point   # unpacking\nprint(x, y)\n# point[0] = 99  -> error!', "python", "Tuples are read-only"),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-tuples-1",
                  type: "true_false",
                  prompt: "Tuples can be modified after creation.",
                  correct: "1",
                  explanation: "Tuples are immutable — use a list if you need changes.",
                },
              },
            ],
          },
          {
            slug: "python-dictionaries",
            title: "Dictionaries: Key-Value Powers",
            type: "code",
            blocks: [
              text("Dictionaries (dict) map keys to values using {key: value}. Look up by key, add new pairs, and iterate over them.", "Lookup speed"),
              code('user = {"name": "Ada", "role": "admin", "xp": 120}\nprint(user["name"])\nuser["xp"] = 200\nuser["city"] = "London"\nfor key, value in user.items():\n    print(f"{key} -> {value}")', "python", "Try it"),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-dict-1",
                  type: "mcq",
                  prompt: "How do you get the value for key 'name' from dict d?",
                  options: ["d.name", "d['name']", "d(name)", "d->'name'"],
                  correct: "1",
                  explanation: "Use square brackets or .get() to read dict values.",
                },
              },
            ],
          },
          {
            slug: "python-control-flow-review",
            title: "Control Flow Review & Mini-Challenge",
            type: "code",
            blocks: [
              text("Time to combine everything: loops, conditions and collections to solve a real mini-problem."),
              code("# Challenge: print numbers 1..20,\n# but say \"Fizz\" for multiples of 3\n# and \"Buzz\" for multiples of 5.\nfor n in range(1, 21):\n    if n % 15 == 0:\n        print(\"FizzBuzz\")\n    elif n % 3 == 0:\n        print(\"Fizz\")\n    elif n % 5 == 0:\n        print(\"Buzz\")\n    else:\n        print(n)", "python", "Run the FizzBuzz solution", "This classic interview problem is your first test."),
              complete("Module 2 done", "You can now control the flow of any program."),
            ],
          },
        ],
      },
      {
        title: "Functions & Object-Oriented Python",
        lessons: [
          {
            slug: "python-functions",
            title: "Writing Functions",
            type: "code",
            blocks: [
              text("Functions package reusable logic. Define with def name(parameters): and call with arguments. Default parameters make arguments optional.", "Reusable building blocks"),
              code('def greet(name, greeting="Hello"):\n    return f"{greeting}, {name}!"\n\nprint(greet("Ada"))\nprint(greet("Alan", "Welcome"))', "python", "Try it"),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-fn-1",
                  type: "mcq",
                  prompt: "Which keyword defines a function?",
                  options: ["func", "define", "def", "function"],
                  correct: "2",
                  explanation: "Python uses def to define functions.",
                },
              },
            ],
          },
          {
            slug: "python-return",
            title: "Return Values & Scope",
            type: "code",
            blocks: [
              text("return sends a value back to the caller. Variables defined inside a function are local — they don't exist outside it.", "Getting results back"),
              code('def add(a, b):\n    return a + b\n\nresult = add(3, 5)\nprint(\"3 + 5 =\", result)  # 8', "python", "Try it"),
              text("Functions without a return statement return None implicitly — handy to remember when you see mysterious None values."),
            ],
          },
          {
            slug: "python-builtins",
            title: "Handy Built-in Functions",
            blocks: [
              text("Python ships with superpowers: len(), sum(), min(), max(), sorted(), range(), enumerate(), zip() and more."),
              example('nums = [5, 2, 9, 1]\nprint(sum(nums))       # 17\nprint(max(nums))       # 9\nprint(sorted(nums))    # [1, 2, 5, 9]\nfor i, n in enumerate(nums):\n    print(i, n)', "python", "Built-ins in action"),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-builtins-1",
                  type: "output",
                  prompt: "What does sum([2, 4, 6]) return?",
                  code: "print(sum([2, 4, 6]))",
                  accept: ["12"],
                  explanation: "sum() adds all items — 2+4+6=12.",
                },
              },
            ],
          },
          {
            slug: "python-list-comprehensions",
            title: "List Comprehensions",
            type: "code",
            blocks: [
              text("Comprehensions build new lists in one elegant line: [expr for item in iterable if condition].", "Pythonic one-liners"),
              code('numbers = [1, 2, 3, 4, 5]\nsquares = [n * n for n in numbers]\neven = [n for n in numbers if n % 2 == 0]\nprint(squares)  # [1, 4, 9, 16, 25]\nprint(even)     # [2, 4]', "python", "Try it"),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-comp-1",
                  type: "mcq",
                  prompt: "Which builds a list of even numbers from nums?",
                  options: ["[n for n in nums if n % 2 == 0]", "[n if n % 2 == 0 for n in nums]", "[n % 2 == 0 for n in nums]", "filter(nums, n % 2 == 0)"],
                  correct: "0",
                  explanation: "The filter goes at the end of a comprehension.",
                },
              },
            ],
          },
          {
            slug: "python-files",
            title: "Reading & Writing Files",
            type: "code",
            blocks: [
              text("The open() context manager reads and writes files safely — the with statement closes the file automatically even if an error happens.", "Persistent data"),
              code('with open("notes.txt", "w") as f:\n    f.write("Hello file!")\n\nwith open("notes.txt") as f:\n    content = f.read()\nprint(content)', "python", "Try it", "Write, read back, and print the file contents."),
            ],
          },
          {
            slug: "python-errors",
            title: "Handling Errors with try/except",
            type: "code",
            blocks: [
              text("try/except catches errors instead of crashing. This is how real programs stay alive in the face of bad input.", "Graceful failure"),
              code('try:\n    n = int(input("Number: "))\n    print(100 / n)\nexcept ValueError:\n    print("That was not a number!")\nexcept ZeroDivisionError:\n    print("Cannot divide by zero.")', "python", "Try it", "Type 'abc' or 0 to see graceful handling."),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-errors-1",
                  type: "true_false",
                  prompt: "A try block can have two different except clauses.",
                  correct: "0",
                  explanation: "Yes! Catch each specific error type separately.",
                },
              },
            ],
          },
          {
            slug: "python-modules",
            title: "Imports & Modules",
            blocks: [
              text("Modules bundle related code. import math gives you math.sqrt; from random import choice pulls out a single name; pip installs third-party packages."),
              example('import math\nfrom random import randint\n\nprint(math.sqrt(144))      # 12.0\nprint(randint(1, 6))        # a die roll', "python", "Importing power"),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-modules-1",
                  type: "mcq",
                  prompt: "Which imports only a specific name?",
                  options: ["import math", "from math import sqrt", "math.import(sqrt)", "import: math.sqrt"],
                  correct: "1",
                  explanation: "from module import name brings one name into scope.",
                },
              },
            ],
          },
          {
            slug: "python-classes",
            title: "Classes & Objects",
            type: "code",
            blocks: [
              text("Classes are blueprints. __init__ sets up a new instance; methods are functions attached to it; self refers to the instance.", "Object-oriented design"),
              code('class Dog:\n    def __init__(self, name):\n        self.name = name\n        self.xp = 0\n\n    def bark(self):\n        return f"{self.name} says woof!"\n\nd = Dog("Rex")\nprint(d.bark())\nprint(d.name)', "python", "Try it"),
              {
                kind: "quiz",
                question: {
                  id: "pq-python-classes-1",
                  type: "match",
                  prompt: "Match each term to its meaning.",
                  pairs: [
                    { left: "__init__", right: "constructor" },
                    { left: "self", right: "the instance" },
                    { left: "method", right: "a function in a class" },
                  ],
                  explanation: "These three concepts unlock OOP.",
                },
              },
            ],
          },
          {
            slug: "python-graduation",
            title: "Graduation: Build a Mini Program",
            type: "code",
            blocks: [
              text("Final project for this course: a tiny contact book. It combines loops, dicts and functions into one coherent program."),
              code('contacts = {}\n\ndef add(name, phone):\n    contacts[name] = phone\n\ndef show():\n    for name, phone in contacts.items():\n        print(f"{name}: {phone}")\n\nadd("Ada", "123456")\nadd("Alan", "654321")\nshow()', "python", "Run the contact book", "Then try extending it with a remove() function."),
              tips(["Refactor: split behavior into functions.", "Test each function in isolation.", "You've built a real program — congratulations!"]),
              complete("Course complete!", "You finished Python Fundamentals. Next stop: challenges and the assessment quiz."),
            ],
            xpReward: 20,
          },
        ],
      },
    ],
  },

  // ============================ 2. JavaScript Essentials (16 lessons)
  {
    slug: "js-essentials",
    title: "JavaScript Essentials",
    description: "Learn the language of the web: variables, functions, the DOM, and modern array methods. Perfect for building interactive pages.",
    category: "Web Development",
    language: "JavaScript",
    difficulty: "Beginner",
    icon: "CodeXml",
    color: "#f7df1e",
    students: 980,
    modules: [
      {
        title: "JavaScript Basics",
        lessons: [
          {
            slug: "js-intro",
            title: "What is JavaScript?",
            blocks: [
              text("JavaScript is the programming language of the browser. Together with HTML (structure) and CSS (styling), it makes web pages interactive.", "The web's third pillar"),
              example('console.log("Hello from JS!");\nlet count = 0;\ncount = count + 1;\nconsole.log(count);', "javascript", "First script"),
              complete("JS unlocked", "You've run JavaScript for the first time."),
            ],
          },
          {
            slug: "js-variables",
            title: "Variables: let & const",
            type: "code",
            blocks: [
              text("let declares a changeable variable; const declares a constant that cannot be reassigned. Prefer const unless you must reassign.", "Two ways to declare"),
              code('let score = 10;\nscore = 15;        // allowed\nconst name = "Ada";\n// name = "Bob";   // error!\nconsole.log(score, name);', "javascript", "Try it"),
              {
                kind: "quiz",
                question: {
                  id: "pq-js-vars-1",
                  type: "mcq",
                  prompt: "Which declares a variable that CANNOT be reassigned?",
                  options: ["let score = 1;", "const score = 1;", "var score = 1;", "score = 1;"],
                  correct: "1",
                  explanation: "const prevents reassignment.",
                },
              },
            ],
          },
          {
            slug: "js-operators",
            title: "Operators & Types",
            type: "code",
            blocks: [
              text("JavaScript has the usual + - * / and ** , plus string concatenation with +. typeof tells you the type of a value.", "Math and more"),
              code('console.log(2 ** 3);        // 8\nconsole.log(10 / 4);        // 2.5\nconsole.log("hello" + "!");  // hello!\nconsole.log(typeof 42);      // number\nconsole.log(typeof "hi");    // string', "javascript", "Try it"),
            ],
          },
          {
            slug: "js-strings",
            title: "Strings & Template Literals",
            type: "code",
            blocks: [
              text("Template literals use backticks and let you embed expressions with ${...} — far cleaner than concatenation.", "Fancy text"),
              code('const name = "Emmy";\nconst points = 120;\nconst line = `${name} earned ${points} XP`;\nconsole.log(line);\nconsole.log(line.length);\nconsole.log(line.toUpperCase());', "javascript", "Try it"),
              {
                kind: "quiz",
                question: {
                  id: "pq-js-strings-1",
                  type: "output",
                  prompt: "What prints?",
                  code: 'console.log(`2 + 3 = ${2 + 3}`);',
                  accept: ["2 + 3 = 5"],
                  explanation: "The expression inside ${} is evaluated.",
                },
              },
            ],
          },
          {
            slug: "js-functions",
            title: "Functions & Arrow Functions",
            type: "code",
            blocks: [
              text("Functions bundle logic for reuse. Modern code favors arrow functions: (params) => result.", "Two syntaxes"),
              code('function add(a, b) {\n  return a + b;\n}\n\nconst multiply = (a, b) => a * b;\n\nconsole.log(add(2, 3));\nconsole.log(multiply(2, 3));', "javascript", "Try it"),
              {
                kind: "quiz",
                question: {
                  id: "pq-js-fn-1",
                  type: "mcq",
                  prompt: "What does an arrow function always return if written as (a, b) => a + b?",
                  options: ["undefined", "a + b", "an object", "a function"],
                  correct: "1",
                  explanation: "Concise arrow bodies return the expression implicitly.",
                },
              },
            ],
          },
          {
            slug: "js-basics-review",
            title: "Basics Review & Mini-Challenge",
            type: "code",
            blocks: [
              text("Combine variables, strings and functions into a greeting machine."),
              code('const greet = (name) => `Hello, ${name}!`;\nfor (let i = 0; i < 3; i++) {\n  console.log(greet("Friend " + (i + 1)));\n}', "javascript", "Run it"),
              complete("Fundamentals done", "You understand the core of JavaScript."),
            ],
          },
        ],
      },
      {
        title: "The DOM & Browser",
        lessons: [
          {
            slug: "js-dom",
            title: "Selecting Elements",
            blocks: [
              text("The DOM (Document Object Model) is your map of the page. document.getElementById() and document.querySelector() find elements to manipulate.", "Your page, as objects"),
              example('// In a browser page:\nconst title = document.getElementById("app");\ntitle.textContent = "Hello DOM!";', "javascript", "Selecting nodes"),
              tips(["querySelector('.card') gets the first match.", "setAttribute() changes attributes.", "classList.add() toggles classes."]),
            ],
          },
          {
            slug: "js-events",
            title: "Events & Listeners",
            blocks: [
              text("addEventListener('click', handler) runs your code when something happens. Handlers are functions that fire in response to user actions."),
              example('const btn = document.getElementById("btn");\nbtn.addEventListener("click", () => {\n  alert("You clicked me!");\n});', "javascript", "Reacting to users"),
            ],
          },
          {
            slug: "js-css-manipulation",
            title: "Changing Styles",
            blocks: [
              text("Use element.style for inline styles or classList toggles for cleaner control — keep presentation in CSS classes.", "Make it move"),
              example('const box = document.getElementById("box");\nbox.classList.add("highlight");\nbox.style.transition = "all 300ms";', "javascript", "Style changes"),
            ],
          },
          {
            slug: "js-timers",
            title: "Timers & Animation",
            type: "code",
            blocks: [
              text("setTimeout runs once after a delay; setInterval repeats. Always store and clear them to avoid memory leaks.", "Time-based code"),
              code('setTimeout(() => console.log("3 seconds later..."), 3000);\nconst count = setInterval(() => console.log("tick"), 1000);\n// clearInterval(count) stops the ticks', "javascript", "Try it"),
            ],
          },
          {
            slug: "js-dom-button-catcher",
            title: "Build: Button Catcher Game",
            type: "code",
            blocks: [
              text("Final DOM project for this module: a button that runs away when you hover. It ties together selection, events and style."),
              code('const btn = document.getElementById("btn");\nbtn.addEventListener("mouseenter", () => {\n  btn.style.transform =\n    `translate(${Math.random() * 100}px, ${Math.random() * 100}px)`;\n});', "javascript", "Run the catcher", "A tiny game from just a few lines of DOM code."),
              complete("DOM mastered", "You can now bring any page to life."),
            ],
          },
        ],
      },
      {
        title: "Arrays & Modern JavaScript",
        lessons: [
          {
            slug: "js-arrays",
            title: "Array Essentials",
            type: "code",
            blocks: [
              text("Arrays order values. Common tools: push(), pop(), length, and bracket access starting at index 0.", "Ordered data"),
              code('const items = [1, 2, 3];\nitems.push(4);\nconsole.log(items[0]);      // 1\nconsole.log(items.length);  // 4', "javascript", "Try it"),
            ],
          },
          {
            slug: "js-array-methods",
            title: "map, filter & reduce",
            type: "code",
            blocks: [
              text("map transforms every element, filter keeps matches, reduce collapses to a single value. These replace clunky loops.", "Functional toolbox"),
              code('const nums = [1, 2, 3, 4];\nconst doubled = nums.map(n => n * 2);\nconst evens = nums.filter(n => n % 2 === 0);\nconst total = nums.reduce((sum, n) => sum + n, 0);\nconsole.log(doubled); // [2, 4, 6, 8]\nconsole.log(evens);   // [2, 4]\nconsole.log(total);   // 10', "javascript", "Try it"),
              {
                kind: "quiz",
                question: {
                  id: "pq-js-array-1",
                  type: "output",
                  prompt: "What does [1,2,3].map(n => n * n) return?",
                  code: 'console.log([1, 2, 3].map(n => n * n));',
                  accept: ["1,4,9", "[1,4,9]"],
                  explanation: "map returns a new array of squares.",
                },
              },
            ],
          },
          {
            slug: "js-objects",
            title: "Objects & Destructuring",
            type: "code",
            blocks: [
              text("Objects group related values. Destructuring pulls values out into named variables in one step.", "Key-value powers"),
              code('const user = { name: "Ada", xp: 320 };\nconst { name, xp } = user;\nconsole.log(name, xp);\nconst tag = `User ${name} has ${xp} XP`;\nconsole.log(tag);', "javascript", "Try it"),
            ],
          },
          {
            slug: "js-async",
            title: "Async: Promises & await",
            blocks: [
              text("async/await makes asynchronous code read like linear code. await pauses until a promise settles — essential for fetch() and servers."),
              example('async function load() {\n  const res = await fetch("/api/user");\n  const data = await res.json();\n  console.log(data);\n}\nload();', "javascript", "Async in action"),
              { kind: "quiz", question: { id: "pq-js-async-1", type: "true_false", prompt: "await can only be used inside an async function.", correct: "0", explanation: "Await must live within a function declared async." } },
            ],
          },
          {
            slug: "js-graduation",
            title: "Graduation: Build & Ship",
            type: "code",
            blocks: [
              text("Your grand finale: a small in-page quiz app skeleton using everything you've learned — arrays, DOM, events and functions."),
              code('const questions = ["1+1?", "2+2?"];\nconst answers = ["2", "4"];\nlet score = 0;\nquestions.forEach((q, i) => {\n  const reply = prompt(q);\n  if (reply === answers[i]) score++;\n});\nconsole.log(`You scored ${score}/${questions.length}`);', "javascript", "Run the quiz", "Level up from learner to builder."),
              complete("JavaScript course complete", "You can now build interactive web experiences."),
            ],
            xpReward: 20,
          },
        ],
      },
    ],
  },

  // ============================ 3. HTML & CSS Foundations (14 lessons)
  {
    slug: "html-css-foundations",
    title: "HTML & CSS Foundations",
    description: "The building blocks of every website: semantic HTML for structure and modern CSS for beauty — including Flexbox and Grid.",
    category: "Web Development",
    language: "HTML",
    difficulty: "Beginner",
    icon: "Layout",
    color: "#e34c26",
    students: 1410,
    modules: [
      {
        title: "HTML: Structure",
        lessons: [
          {
            slug: "html-intro",
            title: "What is HTML?",
            blocks: [
              text("HTML (HyperText Markup Language) gives a page its structure using tags like <h1>, <p> and <div>. Tags open and close, wrapping content between them.", "The skeleton of the web"),
              example('<h1>My first page</h1>\n<p>This is a paragraph of text.</p>\n<a href="https://example.com">A link</a>', "html", "Minimal HTML"),
              complete("Page structure", "You've seen the tags that build every website."),
            ],
          },
          {
            slug: "html-headings",
            title: "Headings & Paragraphs",
            blocks: [
              text("Use one <h1> per page for the title, then h2→h6 for sections of descending importance. <p> wraps paragraphs of text."),
              example('<h1>Site title</h1>\n<h2>Section</h2>\n<h3>Sub-section</h3>\n<p>Paragraph text goes here.</p>', "html", "Heading hierarchy"),
              {
                kind: "quiz",
                question: {
                  id: "pq-html-headings-1",
                  type: "mcq",
                  prompt: "Which tag is the largest heading?",
                  options: ["<h6>", "<h1>", "<header>", "<head>"],
                  correct: "1",
                  explanation: "h1 is the top-level heading.",
                },
              },
            ],
          },
          {
            slug: "html-text",
            title: "Formatting Text",
            blocks: [
              text("<strong> for importance, <em> for emphasis, <code> for code, and <br> for line breaks. Semantic tags tell the browser (and search engines) what text means."),
              example('<p><strong>Bold</strong> and <em>italic</em>.</p>\n<p>Inline <code>code</code> snippet.</p>\n<p>Line one<br>Line two</p>', "html", "Rich text"),
            ],
          },
          {
            slug: "html-links-images",
            title: "Links & Images",
            blocks: [
              text("<a href> navigates; <img src> embeds images. Both are inline elements — alt text on images matters for accessibility."),
              example('<a href="https://example.com" target="_blank">Open in new tab</a>\n<img src="https://picsum.photos/200" alt="Random photo" width="200">', "html", "Navigate and show"),
              { kind: "quiz", question: { id: "pq-html-img-1", type: "fill", prompt: "Which attribute of <img> holds the image URL?", accept: ["src"], explanation: "src = source." } },
            ],
          },
          {
            slug: "html-lists-tables",
            title: "Lists & Tables",
            blocks: [
              text("<ul>/<ol> with <li> items, and <table> with <tr> rows and <th>/<td> cells. Tables are for data — never layout."),
              example('<ul>\n  <li>Coffee</li>\n  <li>Tea</li>\n</ul>\n<table>\n  <tr><th>Name</th><th>Age</th></tr>\n  <tr><td>Ada</td><td>36</td></tr>\n</table>', "html", "Structured content"),
            ],
          },
          {
            slug: "html-forms",
            title: "Forms & Inputs",
            blocks: [
              text("<form> collects user input. Common controls: <input>, <textarea>, <select>, and <button>. Every input should have a <label>."),
              example('<form>\n  <label>Name</label>\n  <input type="text" name="name">\n  <label>Choice</label>\n  <select name="level">\n    <option>Beginner</option>\n    <option>Advanced</option>\n  </select>\n  <button type="submit">Send</button>\n</form>', "html", "Collecting input"),
            ],
          },
          {
            slug: "html-semantic",
            title: "Semantic HTML",
            blocks: [
              text("Semantic tags describe meaning: header, nav, main, article, section, aside, footer. Screen readers and SEO thrive on clean structure."),
              { kind: "quiz", question: { id: "pq-html-semantic-1", type: "mcq", prompt: "Which tag wraps the page's main content?", options: ["<aside>", "<main>", "<footer>", "<head>"], correct: "1", explanation: "<main> contains the page's unique content.", } },
              complete("HTML foundation", "Structure is the hardest part — and you've got it."),
            ],
          },
        ],
      },
      {
        title: "CSS: Styling",
        lessons: [
          {
            slug: "css-intro",
            title: "CSS Selectors",
            blocks: [
              text("CSS targets elements with selectors and applies declarations: selector { property: value; }. Class (.box) beats tag (div) specificity."),
              example('/* style.css */\n.title {\n  color: #3776ab;\n  font-size: 24px;\n}\nmain p {\n  line-height: 1.6;\n}', "css", "Styling rules"),
            ],
          },
          {
            slug: "css-box-model",
            title: "The Box Model",
            blocks: [
              text("Every element is a box: content, padding (inside), border, margin (outside). box-sizing: border-box makes widths predictable."),
              example('.card {\n  padding: 16px;      /* space inside */\n  margin: 12px;       /* space outside */\n  border: 1px solid #ddd;\n  border-radius: 8px;\n  box-sizing: border-box;\n}', "css", "Boxes everywhere"),
              {
                kind: "quiz",
                question: {
                  id: "pq-css-box-1",
                  type: "mcq",
                  prompt: "Which property creates space INSIDE a box, between content and border?",
                  options: ["margin", "padding", "border-width", "spacing"],
                  correct: "1",
                  explanation: "Padding sits between content and border.",
                },
              },
            ],
          },
          {
            slug: "css-colors-text",
            title: "Colors & Typography",
            blocks: [
              text("font-family, font-size, and color style text. Google Fonts and CSS variables (--brand) keep designs consistent."),
              example(':root {\n  --brand: #22c55e;\n}\nbody {\n  font-family: sans-serif;\n  color: #222;\n}\n.cta {\n  background: var(--brand);\n  color: white;\n}', "css", "Look and feel"),
            ],
          },
          {
            slug: "css-flexbox",
            title: "Layout with Flexbox",
            blocks: [
              text("display: flex lays items in a row; flex-direction swaps to column; justify-content and align-items position them. The workhorse of modern layout."),
              example('.navbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}', "css", "Flexbox"),
              {
                kind: "quiz",
                question: {
                  id: "pq-css-flex-1",
                  type: "true_false",
                  prompt: "display: flex can lay items out in either a row or a column.",
                      correct: "0",
                      explanation: "flex-direction: column flips the axis.",
                },
              },
            ],
          },
          {
            slug: "css-grid",
            title: "Layout with Grid",
            blocks: [
              text("Grid does 2D layout: define columns with grid-template-columns and rows with grid-template-rows, then place items in cells."),
              example('.grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 12px;\n}', "css", "Grid basics"),
            ],
          },
          {
            slug: "css-responsive",
            title: "Responsive Design",
            blocks: [
              text("Media queries adapt design to screen width; flexible units (fr, %, clamp) avoid brittle fixed sizes."),
              example('@media (max-width: 600px) {\n  .grid {\n    grid-template-columns: 1fr;\n  }\n}', "css", "Mobile first"),
              complete("CSS foundations done", "Structure plus style — you can build real pages."),
            ],
          },
        ],
      },
    ],
  },

  // ============================ 4. SQL & Databases (12 lessons)
  {
    slug: "sql-and-databases",
    title: "SQL & Databases",
    description: "Query and shape data like a pro: SELECT, WHERE, JOINs, aggregates, schema design and transactions — with a working SQL console.",
    category: "Database",
    language: "SQL",
    difficulty: "Beginner",
    icon: "Database",
    color: "#f29111",
    students: 760,
    modules: [
      {
        title: "Querying Data",
        lessons: [
          {
            slug: "sql-intro",
            title: "Why Databases?",
            blocks: [
              text("Databases store data reliably and answer questions with queries. SQL is the standard query language — used everywhere from tiny apps to global platforms.", "Where data lives"),
              example('CREATE TABLE users (id INTEGER, name TEXT);\nINSERT INTO users VALUES (1, "Ada"), (2, "Alan");', "sql", "A tiny table"),
              complete("Databases 101", "Time to write your first query."),
            ],
          },
          {
            slug: "sql-select",
            title: "Your First SELECT",
            type: "code",
            blocks: [
              text("SELECT picks columns, FROM names the table. SELECT * returns all columns.", "Read data"),
              code('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, age INTEGER);\nINSERT INTO users VALUES (1, "Ada", 36), (2, "Alan", 41), (3, "Grace", 28);\nSELECT name FROM users;', "sql", "Run it", "SQL console: run statements against an in-browser database."),
              {
                kind: "quiz",
                question: {
                  id: "pq-sql-select-1",
                  type: "mcq",
                  prompt: "Which clause specifies which rows to fetch?",
                  options: ["SELECT", "FROM", "WHERE", "TABLE"],
                  correct: "2",
                  explanation: "WHERE filters rows.",
                },
              },
            ],
          },
          {
            slug: "sql-where",
            title: "Filtering with WHERE",
            blocks: [
              text("WHERE keeps only matching rows. Combine conditions with AND/OR and use IN, LIKE, BETWEEN for richer filters."),
              example('SELECT name FROM users\nWHERE age >= 30 AND city = "London";', "sql", "Filtering"),
              { kind: "quiz", question: { id: "pq-sql-where-1", type: "output", prompt: "How many rows match: age >= 30 in a table with ages 20, 35, 30?", code: "SELECT COUNT(*) FROM users WHERE age >= 30;      -- ages: 20, 35, 30", accept: ["2"], explanation: "35 and 30 are ≥ 30 → 2 rows.", } },
            ],
          },
          {
            slug: "sql-order-limit",
            title: "Ordering & Limiting",
            blocks: [
              text("ORDER BY sorts results; LIMIT truncates the row count. Combined they power pagination and top-N charts."),
              example('SELECT name, xp FROM users\nORDER BY xp DESC\nLIMIT 3;', "sql", "Top three"),
            ],
          },
          {
            slug: "sql-aggregates",
            title: "Aggregates: COUNT, SUM, AVG",
            blocks: [
              text("Aggregate functions collapse rows into summaries. NULLs are ignored by SUM and AVG — always worth remembering."),
              example('SELECT COUNT(*) AS total,\n       AVG(price) AS avg_price,\n       MAX(price) AS most_expensive\nFROM products;', "sql", "Summaries"),
            ],
          },
          {
            slug: "sql-group",
            title: "GROUP BY",
            blocks: [
              text("GROUP BY forms groups; each aggregate then applies per group. The classic report pattern: GROUP BY with COUNT/SUM."),
              example('SELECT country, COUNT(*) AS users\nFROM users\nGROUP BY country;', "sql", "Per-group totals"),
            ],
          },
        ],
      },
      {
        title: "Design & Joins",
        lessons: [
          {
            slug: "sql-join",
            title: "Joining Two Tables",
            blocks: [
              text("JOIN combines rows from two tables on a key. The classic: records JOIN users ON records.user_id = users.id.", "Combining data"),
              example('SELECT users.name, orders.total\nFROM orders\nJOIN users ON orders.user_id = users.id;', "sql", "Join users to orders"),
              { kind: "quiz", question: { id: "pq-sql-join-1", type: "mcq", prompt: "Which JOIN returns only rows matching in BOTH tables?", options: ["LEFT JOIN", "INNER JOIN", "FULL JOIN", "CROSS JOIN"], correct: "1", explanation: "INNER JOIN keeps only matches.", } },
            ],
          },
          {
            slug: "sql-multijoin",
            title: "Joining Many Tables",
            blocks: [
              text("Chain joins to pull data across three tables — users, orders, order_items, say. Give tables short aliases for readability."),
              example('SELECT u.name, p.title\nFROM orders o\nJOIN users u  ON o.user_id = u.id\nJOIN items  i ON i.order_id = o.id\nJOIN products p ON p.id = i.product_id;', "sql", "Three-table join"),
            ],
          },
          {
            slug: "sql-insert-update",
            title: "INSERT, UPDATE, DELETE",
            type: "code",
            blocks: [
              text("Modifying data uses INSERT (add), UPDATE (change), DELETE (remove). Always double-check your WHERE on UPDATE/DELETE!", "Write data"),
              code('CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT, qty INTEGER);\nINSERT INTO items (name, qty) VALUES ("pencil", 3);\nUPDATE items SET qty = 5 WHERE name = "pencil";\nDELETE FROM items WHERE qty = 0;\nSELECT * FROM items;', "sql", "Run it"),],
          },
          {
            slug: "sql-schema",
            title: "Designing Tables",
            blocks: [
              text("Good schema: primary keys for identity, foreign keys for relations, sensible types, and indexes on hot columns. Normalize to avoid duplicated data."),
              example('CREATE TABLE projects (\n  id INTEGER PRIMARY KEY,\n  slug TEXT UNIQUE NOT NULL,\n  title TEXT NOT NULL,\n  owner_id INTEGER REFERENCES users(id)\n);', "sql", "Designing"),
            ],
          },
          {
            slug: "sql-transactions",
            title: "Transactions & Concurrency",
            blocks: [
              text("BEGIN TRANSACTION groups statements that must all succeed together — atomic, consistent. If anything fails, ROLLBACK undoes everything."),
              { kind: "quiz", question: { id: "pq-sql-tx-1", type: "true_false", prompt: "A transaction rolls back unless you COMMIT.", correct: "0", explanation: "Uncommitted changes are rolled back.", } },
            ],
          },
          {
            slug: "sql-graduation",
            title: "Graduation Query",
            type: "code",
            blocks: [
              text("Bring it together: a report of top customers and their order totals."),
              code('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);\nCREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, total REAL);\nINSERT INTO users VALUES (1, "Ada"), (2, "Alan");\nINSERT INTO orders VALUES (1, 1, 100), (2, 1, 50), (3, 2, 25);\nSELECT u.name, SUM(o.total) AS spent\nFROM users u\nJOIN orders o ON o.user_id = u.id\nGROUP BY u.name\nORDER BY spent DESC;', "sql", "Run the report", "Querying + joining + grouping — you did it."),
              complete("SQL course complete", "You speak the language of data."),
            ],
            xpReward: 20,
          },
        ],
      },
    ],
  },

  // ============================ 5. Cybersecurity Basics (12 lessons)
  {
    slug: "cybersecurity-basics",
    title: "Cybersecurity Basics",
    description: "Think like an attacker to defend like a pro: threats, passwords, phishing, network security, crypto essentials and incident response.",
    category: "Cybersecurity",
    language: "Python",
    difficulty: "Beginner",
    icon: "Shield",
    color: "#eb4d4b",
    students: 660,
    modules: [
      {
        title: "Understanding Threats",
        lessons: [
          {
            slug: "cyber-intro",
            title: "The Threat Landscape",
            blocks: [
              text("Security is about protecting confidentiality, integrity and availability (the CIA triad). Threats come from criminals, insiders and accidents alike.", "Why security matters"),
              tips(["Confidentiality: only authorized eyes.", "Integrity: data isn't altered.", "Availability: systems stay up."]),
              complete("Security mindset", "You now think like a defender."),
            ],
          },
          {
            slug: "cyber-threats",
            title: "Malware & Attack Types",
            blocks: [
              text("Malware spans viruses, worms, trojans, ransomware and spyware. Attackers also exploit weak passwords, unpatched software and human trust."),
              { kind: "quiz", question: { id: "pq-cyber-threats-1", type: "mcq", prompt: "Which locks your files and demands money?", options: ["Spyware", "Ransomware", "Adware", "Rootkit"], correct: "1", explanation: "Ransomware encrypts and ransoms.", } },
            ],
          },
          {
            slug: "cyber-passwords",
            title: "Password Security",
            type: "code",
            blocks: [
              text("Long beats complex. Use passphrases, a password manager, and unique passwords everywhere. Enable MFA wherever possible.", "Your first defense"),
              code('# Check how quickly a weak password falls\nimport re\ncommon = {"password", "123456", "qwerty"}\ndef strength(pw):\n    if pw in common or len(pw) < 8:\n        return "Weak"\n    if re.search(r"[A-Z]", pw) and re.search(r"\\d", pw):\n        return "Strong"\n    return "Medium"\nfor pw in ["123456", "sunshine2024!", "Tr0ub4dor&3"]:\n    print(pw, "->", strength(pw))', "python", "Test passwords", "Run to see how a checker would score them."),
            ],
          },
          {
            slug: "cyber-phishing",
            title: "Phishing & Social Engineering",
            blocks: [
              text("Phishing tricks people via fake emails/sites. Senses: urgency, impersonation, and links to impostor domains. Verify before you click — always."),
              example('legit = "paypal.com"\nspoof = "paypa1.com"\nprint("Legit" if spoof == legit else "SUSPICIOUS: lookalike domain!")', "python", "Spotting lookalikes"),
              { kind: "quiz", question: { id: "pq-cyber-phish-1", type: "true_false", prompt: "A message that creates panic and asks you to act immediately is a classic phishing signal.", correct: "0", explanation: "Urgency short-circuits careful thinking.", } },
            ],
          },
          {
            slug: "cyber-network",
            title: "Network Security Basics",
            blocks: [
              text("Firewalls filter traffic, VPNs encrypt remote connections, and segmentation limits blast radius. Layer these controls, don't rely on one."),
              example('def firewall(ip, allowlist):\n    return ip in allowlist\n\nallowlist = {"192.168.1.10", "192.168.1.20"}\nprint(firewall("203.0.113.5", allowlist))  # False', "python", "Default deny"),
            ],
          },
          {
            slug: "cyber-crypto",
            title: "Cryptography Essentials",
            blocks: [
              text("Hashing verifies integrity (SHA-256), encryption protects secrecy (AES), and HTTPS uses both in transit. Never roll your own crypto."),
              { kind: "quiz", question: { id: "pq-cyber-crypto-1", type: "fill", prompt: "Which primitive is used to verify a file wasn't tampered with?", accept: ["hash", "hashing", "hash function", "hash function"], explanation: "Hashes detect changes to data.", } },
            ],
          },
        ],
      },
      {
        title: "Defending Systems",
        lessons: [
          {
            slug: "cyber-perimeter",
            title: "Defense in Depth",
            blocks: [
              text("Layered controls — network, host, application, data — mean a single failure doesn't mean a breach. This is Defense in Depth."),
              tips(["Network layer: firewall + IDS", "Host layer: patching + AV", "App layer: input validation", "Data: encryption + backups"]),
            ],
          },
          {
            slug: "cyber-app-security",
            title: "Securing Web Apps",
            type: "code",
            blocks: [
              text("Top risks are injection, broken auth, and exposed sensitive data (OWASP Top 10). The #1 fix: validate and parameterize ALL input.", "Write safe code"),
              code('import html, sqlite3\ndef safe_render(user_input):\n    return html.escape(user_input)\n\ndef safe_query(db, user_id):\n    # parameterized — never string-concatenate SQL\n    return db.execute("SELECT * FROM users WHERE id = ?", (user_id,))', "python", "Run the safe patterns", "Escape output, parameterize queries."),
            ],
          },
          {
            slug: "cyber-incident",
            title: "Incident Response",
            blocks: [
              text("When something happens: Identify, Contain, Eradicate, Recover, then Learn. Speed of containment matters more than speed of fixing."),
              { kind: "quiz", question: { id: "pq-cyber-ir-1", type: "mcq", prompt: "What is the FIRST priority during a breach?", options: ["Patching the root cause", "Containing the blast radius", "Notifying customers", "Writing a press release"], correct: "1", explanation: "Contain first, then eradicate and recover.", } },
            ],
          },
          {
            slug: "cyber-compliance",
            title: "Privacy & Compliance",
            blocks: [
              text("GDPR, HIPAA, PCI-DSS... they share themes: know your data, minimize what you keep, get consent, and be ready to prove it."),
              { kind: "quiz", question: { id: "pq-cyber-privacy-1", type: "true_false", prompt: "Storing data you never use is a compliance risk.", correct: "0", explanation: "Data minimization is a core privacy principle.", } },
            ],
          },
          {
            slug: "cyber-graduation",
            title: "Graduation: Security Audit",
            type: "code",
            blocks: [
              text("Run a mini audit checklist across a sample config — your first security review."),
              code('checks = {\n  "mfa_enforced": False,\n  "password_min_length": 6,\n  "tls_enforced": True,\n  "backups_tested_30d": True,\n}\n\nfails = [k for k, v in checks.items() if not v]\nif fails:\n    print("Open findings:", fails)\nelse:\n    print("Baseline looks healthy.")', "python", "Run the audit", "Identify the gaps and fix the config mentally."),
              complete("Cybersecurity course complete", "You can assess and harden systems."),
            ],
            xpReward: 20,
          },
        ],
      },
    ],
  },

  // ============================ 6. DevOps Crash Course (10 lessons)
  {
    slug: "devops-crash-course",
    title: "DevOps Crash Course",
    description: "Automate everything: version control, CI/CD pipelines, containers, cloud infrastructure, secrets management and observability.",
    category: "DevOps",
    language: "JavaScript",
    difficulty: "Intermediate",
    icon: "Workflow",
    color: "#0ea5e9",
    students: 420,
    modules: [
      {
        title: "Core Practices",
        lessons: [
          {
            slug: "devops-intro",
            title: "Why DevOps?",
            blocks: [
              text("DevOps unites development and operations: ship faster, more reliably through automation, monitoring and culture. It's a practice, not a role label."),
              complete("DevOps mindset", "Automation beats toil."),
            ],
          },
          {
            slug: "devops-git",
            title: "Version Control with Git",
            blocks: [
              text("Git tracks every change. The loop: clone → branch → commit → push → pull-request → merge. Small, frequent commits beat huge ones."),
              example('git checkout -b fix/login\n# make changes\ngit add .\ngit commit -m "fix: redirect after login"\ngit push -u origin fix/login', "bash", "Git workflow"),
              { kind: "quiz", question: { id: "pq-devops-git-1", type: "mcq", prompt: "Which git command stages your changes?", options: ["git commit", "git add", "git push", "git status"], correct: "1", explanation: "add moves changes to the staging area.", } },
            ],
          },
          {
            slug: "devops-cicd",
            title: "CI/CD Pipelines",
            blocks: [
              text("CI (Continuous Integration) builds and tests every push. CD (Continuous Delivery/Deployment) ships to staging/prod automatically. Fail fast, ship small."),
              example('name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci\n      - run: npm test', "yaml", "A CI pipeline"),
            ],
          },
          {
            slug: "devops-containers",
            title: "Containers & Docker",
            blocks: [
              text("Containers package code + runtime so it runs anywhere. Images are built from Dockerfiles; layers make builds fast and cached."),
              example('FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nCMD ["node", "server.js"]', "dockerfile", "A Dockerfile"),
            ],
          },
          {
            slug: "devops-cloud",
            title: "Cloud Fundamentals",
            blocks: [
              text("IaaS, PaaS, SaaS... Cloud gives you compute, storage and networking on demand. Manage resources as code (IaC) with Terraform or CloudFormation."),
              { kind: "quiz", question: { id: "pq-devops-cloud-1", type: "mcq", prompt: "Which is Infrastructure as Code?", options: ["Writing YAML/markup that provisions resources", "Clicking buttons in a console", "SSHing into servers", "Buying hardware"], correct: "0", explanation: "IaC describes infrastructure in files you can review.", } },
            ],
          },
        ],
      },
      {
        title: "Ship & Operate",
        lessons: [
          {
            slug: "devops-secrets",
            title: "Secrets Management",
            blocks: [
              text("Never commit secrets. Use environment variables and secret managers (Vault, cloud secret stores) — rotate them regularly and audit access."),
              { kind: "quiz", question: { id: "pq-devops-secrets-1", type: "true_false", prompt: "Committing an API key to a public repo is always a problem, even if the repo is deleted later.", correct: "0", explanation: "Assume leaked secrets are public forever — rotate immediately.", } },
            ],
          },
          {
            slug: "devops-monitoring",
            title: "Observability: Logs, Metrics, Traces",
            blocks: [
              text("Observe with logs (what happened), metrics (how much), and traces (through what path). Alert on symptoms users feel, not on every noise."),
              example('// a tiny structured log\nconsole.log(JSON.stringify({\n  level: "info",\n  service: "checkout",\n  event: "order_placed",\n  orderId: "ord_123",\n  ms: 34\n}));', "javascript", "Structured logs"),
            ],
          },
          {
            slug: "devops-infra",
            title: "Infrastructure Patterns",
            blocks: [
              text("Design for failure: replicas, health checks, and rolling deploys. A load balancer spreads traffic; autoscaling matches capacity to demand."),
              tips(["Always run ≥2 replicas in prod.", "Health checks gate new instances.", "Rolling deploys update without downtime."]),
            ],
          },
          {
            slug: "devops-sre",
            title: "Site Reliability & SLOs",
            blocks: [
              text("SRE applies engineering to operations: error budgets (SLOs) balance reliability against shipping speed. Measure reliability, then automate the boring parts."),
              { kind: "quiz", question: { id: "pq-devops-slo-1", type: "mcq", prompt: "What does an error budget represent?", options: ["Money lost on outages", "Allowed downtime before you slow releases", "Number of bugs allowed", "Team hiring quota"], correct: "1", explanation: "Error budgets decide when to prioritize reliability over features.", } },
            ],
          },
          {
            slug: "devops-graduation",
            title: "Graduation: Ship Day",
            blocks: [
              text("A healthy pipeline from push to production: lint → test → build → deploy → monitor. You understand the whole loop now."),
              example('pipeline:\n  stages: [lint, test, build, deploy, smoke]\n  on_failure: stop\n  smoke: curl --fail https://prod.example.com/health', "yaml", "Full pipeline"),
              complete("DevOps course complete", "You can automate, ship and operate."),
            ],
            xpReward: 20,
          },
        ],
      },
    ],
  },
];

// ------------------------------------------------------------------
// Quizzes
// ------------------------------------------------------------------
const QUIZZES: { spec: QuizSpec; questions: QuestionSpec[] }[] = [
  {
    spec: { slug: "python-assessment", title: "Python Fundamentals Assessment", type: "ASSESSMENT", courseSlug: "python-fundamentals", passingScore: 70, xpReward: 20 },
    questions: [
      { type: "MCQ", prompt: "Which function writes text to the console?", options: ["echo()", "print()", "console.log()", "display()"], correctAnswer: ["1"], explanation: "print() outputs to the console in Python." },
      { type: "OUTPUT", prompt: "What is the output?", code: "x = 5\nprint(x + 2)", correctAnswer: ["7"], explanation: "5 + 2 = 7." },
      { type: "MCQ", prompt: "Which type represents a whole number in Python?", options: ["int", "float", "str", "bool"], correctAnswer: ["0"], explanation: "Whole numbers are int." },
      { type: "TRUE_FALSE", prompt: "len(\"hello\") equals 5.", correctAnswer: ["0"], explanation: "Five characters → length 5." },
      { type: "MCQ", prompt: "Which creates an empty list?", options: ["[]", "{}", "()", "set()"], correctAnswer: ["0"], explanation: "Square brackets are lists." },
      { type: "FILL", prompt: "Complete: define a function named greet that takes one parameter name.", code: "____ greet(name):", correctAnswer: ["def"], explanation: "Functions start with def." },
    ],
  },
  {
    spec: { slug: "python-practice", title: "Python Practice Set", type: "PRACTICE", passingScore: 70, xpReward: 10 },
    questions: [
      { type: "MCQ", prompt: "What is the result of 7 // 2?", options: ["3.5", "3", "4", "2"], correctAnswer: ["1"], explanation: "// is floor division." },
      { type: "MCQ", prompt: "Which slice returns \"lo\" from s = \"hello\"?", options: ["s[3:5]", "s[-2:]", "s[2:3]", "s[3:]"], correctAnswer: ["1"], explanation: "Negative indexing counts from the end." },
      { type: "OUTPUT", prompt: "What prints?", code: "fruits = [\"apple\", \"banana\", \"cherry\"]\nprint(fruits[-1])", correctAnswer: ["cherry"], explanation: "-1 is the last element." },
      { type: "TRUE_FALSE", prompt: "A dictionary key can be any integer.", correctAnswer: ["0"], explanation: "Ints are hashable, so they're valid dictionary keys." },
      { type: "FILL", prompt: "Which loop keyword iterates over a sequence?", correctAnswer: ["for"], explanation: "for item in sequence: …" },
    ],
  },
  {
    spec: { slug: "js-quiz", title: "JavaScript Essentials Check", type: "COURSE", courseSlug: "js-essentials", passingScore: 70, xpReward: 20 },
    questions: [
      { type: "MCQ", prompt: "Which declares a block-scoped variable that can be reassigned?", options: ["let", "const", "var", "static"], correctAnswer: ["0"], explanation: "let is block-scoped and reassignable." },
      { type: "OUTPUT", prompt: "What prints?", code: "const a = [1, 2, 3];\nconsole.log(a.length);", correctAnswer: ["3"], explanation: "Three elements → 3." },
      { type: "MCQ", prompt: "Which statement about const is TRUE?", options: ["It can be hoisted", "It cannot be reassigned", "It must be declared with var", "It creates a new function"], correctAnswer: ["1"], explanation: "const = constant binding." },
      { type: "TRUE_FALSE", prompt: "filter() returns a new array with only matching elements.", correctAnswer: ["0"], explanation: "filter keeps elements the callback returns truthy for." },
      { type: "FILL", prompt: "Keyword to gracefully handle errors in try/catch? Complete: catch (e) … — what does (e) hold?", correctAnswer: ["error", "exception", "the error", "an error"], explanation: "The catch binding holds the error object." },
    ],
  },
  {
    spec: { slug: "web-quiz", title: "Web Basics Quiz", type: "COURSE", courseSlug: "html-css-foundations", passingScore: 70, xpReward: 20 },
    questions: [
      { type: "MCQ", prompt: "Which tag is the largest heading?", options: ["<h6>", "<h1>", "<header>", "<head>"], correctAnswer: ["1"], explanation: "<h1> is top-level." },
      { type: "FILL", prompt: "Which attribute of <img> holds the image URL?", correctAnswer: ["src"], explanation: "src = source." },
      { type: "MCQ", prompt: "Which CSS property changes text color?", options: ["font-color", "text-color", "color", "background"], correctAnswer: ["2"], explanation: "color sets foreground color." },
      { type: "TRUE_FALSE", prompt: "Flexbox lays items out along one axis (row or column).", correctAnswer: ["0"], explanation: "Flex is 1D; Grid is 2D." },
      { type: "MCQ", prompt: "Which CSS selector targets an element with id=\"main\"?", options: [".main", "#main", "main", "id(main)"], correctAnswer: ["1"], explanation: "# selects by id, . by class." },
    ],
  },
  {
    spec: { slug: "sql-quiz", title: "SQL Query Mastery", type: "COURSE", courseSlug: "sql-and-databases", passingScore: 70, xpReward: 20 },
    questions: [
      { type: "MCQ", prompt: "Which clause filters rows?", options: ["WHERE", "GROUP BY", "SELECT", "ORDER BY"], correctAnswer: ["0"], explanation: "WHERE filters, GROUP BY groups." },
      { type: "MCQ", prompt: "Which JOIN returns only rows present in BOTH tables?", options: ["LEFT JOIN", "INNER JOIN", "FULL JOIN", "CROSS JOIN"], correctAnswer: ["1"], explanation: "INNER JOIN keeps matches only." },
      { type: "OUTPUT", prompt: "What does this return?", code: "SELECT 8 + 4;", correctAnswer: ["12"], explanation: "SQL can compute expressions." },
      { type: "TRUE_FALSE", prompt: "A primary key uniquely identifies each row.", correctAnswer: ["0"], explanation: "Primary keys are unique and non-null." },
      { type: "FILL", prompt: "Wildcard for selecting ALL columns?", correctAnswer: ["*"], explanation: "SELECT * FROM …" },
    ],
  },
  {
    spec: { slug: "cyber-quiz", title: "Cybersecurity Essentials Quiz", type: "COURSE", courseSlug: "cybersecurity-basics", passingScore: 70, xpReward: 20 },
    questions: [
      { type: "MCQ", prompt: "Which is the strongest password practice?", options: ["A 4-digit PIN", "A long unique passphrase", "Your pet's name", "'Password123!'"], correctAnswer: ["1"], explanation: "Length and uniqueness win." },
      { type: "TRUE_FALSE", prompt: "HTTPS encrypts web traffic in transit.", correctAnswer: ["0"], explanation: "TLS inside HTTPS encrypts the connection." },
      { type: "MCQ", prompt: "An email that impersonates a trusted service to steal credentials is called…", options: ["Phishing", "DDoS", "SQL injection", "Fuzzing"], correctAnswer: ["0"], explanation: "Phishing uses social engineering." },
      { type: "FILL", prompt: "Name the authentication type requiring a second factor.", correctAnswer: ["2fa", "two-factor", "two factor", "mfa", "2 factor"], explanation: "MFA/2FA needs a second proof." },
      { type: "MCQ", prompt: "The security principle of giving only necessary access is called least…", options: ["privilege", "effort", "access", "visibility"], correctAnswer: ["0"], explanation: "Least privilege minimizes damage." },
    ],
  },
];

// ------------------------------------------------------------------
// Challenges (hidden tests must pass for the intended solution)
// ------------------------------------------------------------------
interface ChallengeSpec {
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  language: string;
  starterCode: string;
  functionName: string;
  publicTests: { name: string; input?: unknown; setup?: string; expected: unknown }[];
  hiddenTests: { name: string; input?: unknown; setup?: string; expected: unknown }[];
  xpReward?: number;
}

async function upsertChallenge(spec: ChallengeSpec) {
  await prisma.challenge.upsert({
    where: { slug: spec.slug },
    update: {
      title: spec.title,
      description: spec.description,
      category: spec.category,
      difficulty: spec.difficulty,
      language: spec.language,
      starterCode: spec.starterCode,
      functionName: spec.functionName,
      publicTests: spec.publicTests as object,
      hiddenTests: spec.hiddenTests as object,
      xpReward: spec.xpReward ?? 30,
      status: "PUBLISHED",
    },
    create: {
      slug: spec.slug,
      title: spec.title,
      description: spec.description,
      category: spec.category,
      difficulty: spec.difficulty,
      language: spec.language,
      starterCode: spec.starterCode,
      functionName: spec.functionName,
      publicTests: spec.publicTests as object,
      hiddenTests: spec.hiddenTests as object,
      timeoutMs: 4000,
      xpReward: spec.xpReward ?? 30,
      status: "PUBLISHED",
    },
  });
  isVerbose && log(`challenge ${spec.slug}`);
}

const CHALLENGES: ChallengeSpec[] = [
  {
    slug: "python-fizzbuzz",
    title: "FizzBuzz",
    description: "Return \"Fizz\" for multiples of 3, \"Buzz\" for multiples of 5, \"FizzBuzz\" for multiples of both, otherwise the number as a string.",
    category: "Loops",
    difficulty: "Easy",
    language: "python",
    functionName: "solution",
    starterCode: 'def solution(n: int) -> str:\n    # your code here\n    return ""',
    publicTests: [
      { name: "Multiple of 3", input: [3], expected: "Fizz" },
      { name: "Multiple of 5", input: [5], expected: "Buzz" },
      { name: "Multiple of both", input: [15], expected: "FizzBuzz" },
      { name: "Not a multiple", input: [7], expected: "7" },
    ],
    hiddenTests: [
      { name: "One", input: [1], expected: "1" },
      { name: "Two", input: [2], expected: "2" },
      { name: "Nine", input: [9], expected: "Fizz" },
      { name: "Ten", input: [10], expected: "Buzz" },
      { name: "Thirty", input: [30], expected: "FizzBuzz" },
    ],
    xpReward: 30,
  },
  {
    slug: "python-sum-of-squares",
    title: "Sum of Squares",
    description: "Return the sum of the squares of every number in the list.",
    category: "Arrays",
    difficulty: "Easy",
    language: "python",
    functionName: "solution",
    starterCode: 'def solution(numbers: list) -> int:\n    # your code here\n    return 0',
    publicTests: [
      { name: "Basic", input: [[1, 2, 3]], expected: 14 },
      { name: "Empty list", input: [[]], expected: 0 },
    ],
    hiddenTests: [
      { name: "Pair", input: [[4, 5]], expected: 41 },
      { name: "Zeros", input: [[0, 0, 0]], expected: 0 },
      { name: "Ones", input: [[1, 1, 1, 1]], expected: 4 },
      { name: "Single", input: [[7]], expected: 49 },
    ],
  },
  {
    slug: "python-is-palindrome",
    title: "Palindrome Check",
    description: "Return True if the string reads the same forwards and backwards (exact, case-sensitive).",
    category: "Strings",
    difficulty: "Medium",
    language: "python",
    functionName: "solution",
    starterCode: 'def solution(s: str) -> bool:\n    # your code here\n    return False',
    publicTests: [
      { name: "Palindrome", input: ["racecar"], expected: true },
      { name: "Not palindrome", input: ["hello"], expected: false },
    ],
    hiddenTests: [
      { name: "Single char", input: ["a"], expected: true },
      { name: "Empty", input: [""], expected: true },
      { name: "Case sensitive", input: ["Aba"], expected: false },
      { name: "Word", input: ["tacocat"], expected: true },
      { name: "With spaces", input: ["never odd or even"], expected: false },
    ],
  },
  {
    slug: "python-count-vowels",
    title: "Count Vowels",
    description: "Return how many vowels (a, e, i, o, u — case-insensitive) appear in the string.",
    category: "Strings",
    difficulty: "Easy",
    language: "python",
    functionName: "solution",
    starterCode: 'def solution(s: str) -> int:\n    # your code here\n    return 0',
    publicTests: [
      { name: "Hello", input: ["hello"], expected: 2 },
      { name: "No vowels", input: ["xyz"], expected: 0 },
    ],
    hiddenTests: [
      { name: "Empty", input: [""], expected: 0 },
      { name: "Upper case", input: ["AEIOU"], expected: 5 },
      { name: "Phrase", input: ["python rocks"], expected: 2 },
      { name: "code", input: ["code"], expected: 2 },
    ],
  },
  {
    slug: "python-find-duplicate",
    title: "Detect Duplicates",
    description: "Return True if any value appears more than once in the list of integers.",
    category: "Arrays",
    difficulty: "Medium",
    language: "python",
    functionName: "solution",
    starterCode: 'def solution(nums: list) -> bool:\n    # your code here\n    return False',
    publicTests: [
      { name: "Has duplicate", input: [[1, 2, 3, 1]], expected: true },
      { name: "All unique", input: [[1, 2, 3]], expected: false },
    ],
    hiddenTests: [
      { name: "Empty", input: [[]], expected: false },
      { name: "Single", input: [[1]], expected: false },
      { name: "Double", input: [[1, 1]], expected: true },
      { name: "Long tail", input: [[1, 2, 3, 4, 5, 6, 7, 8, 9, 9]], expected: true },
    ],
  },
  {
    slug: "python-reverse-string",
    title: "Reverse String",
    description: "Return the string with its characters in reverse order.",
    category: "Strings",
    difficulty: "Easy",
    language: "python",
    functionName: "solution",
    starterCode: 'def solution(s: str) -> str:\n    # your code here\n    return ""',
    publicTests: [{ name: "Hello", input: ["hello"], expected: "olleh" }],
    hiddenTests: [
      { name: "Empty", input: [""], expected: "" },
      { name: "Single char", input: ["a"], expected: "a" },
      { name: "Capital", input: ["Python"], expected: "nohtyP" },
      { name: "Digits", input: ["12345"], expected: "54321" },
    ],
  },
  {
    slug: "python-max-element",
    title: "Find the Maximum",
    description: "Return the largest number in the list.",
    category: "Arrays",
    difficulty: "Easy",
    language: "python",
    functionName: "solution",
    starterCode: 'def solution(nums: list) -> int:\n    # your code here\n    return 0',
    publicTests: [{ name: "Basic", input: [[3, 1, 2]], expected: 3 }],
    hiddenTests: [
      { name: "Single", input: [[1]], expected: 1 },
      { name: "Negatives", input: [[-1, -5, -2]], expected: -1 },
      { name: "Ties", input: [[5, 5, 5]], expected: 5 },
      { name: "Mixed", input: [[10, 9, 8]], expected: 10 },
    ],
  },
  {
    slug: "js-even-sum",
    title: "Even Sum",
    description: "Given an array of integers, return the sum of the even numbers.",
    category: "Arrays",
    difficulty: "Easy",
    language: "javascript",
    functionName: "solution",
    starterCode: "function solution(numbers) {\n  // your code here\n  return 0;\n}",
    publicTests: [
      { name: "Basic", input: [[1, 2, 3, 4]], expected: 6 },
      { name: "Empty", input: [[]], expected: 0 },
      { name: "No evens", input: [[1, 3, 5]], expected: 0 },
    ],
    hiddenTests: [
      { name: "All even", input: [[2, 4, 6]], expected: 12 },
      { name: "Zero", input: [[0]], expected: 0 },
      { name: "Large mixed", input: [[1, 8, 10, 2, 3]], expected: 20 },
      { name: "Negative even", input: [[-4, 3, 2]], expected: -2 },
    ],
  },
  {
    slug: "js-count-characters",
    title: "Character Counter",
    description: "Return the number of occurrences of a given character (case-sensitive) in a string.",
    category: "Strings",
    difficulty: "Easy",
    language: "javascript",
    functionName: "solution",
    starterCode: "function solution(text, char) {\n  // your code here\n  return 0;\n}",
    publicTests: [
      { name: "Hello 'l'", input: ["hello", "l"], expected: 2 },
      { name: "Missing", input: ["hello", "z"], expected: 0 },
    ],
    hiddenTests: [
      { name: "Empty text", input: ["", "a"], expected: 0 },
      { name: "Case sensitive", input: ["Apple", "p"], expected: 2 },
      { name: "All same", input: ["aaaa", "a"], expected: 4 },
      { name: "Char present once", input: ["banana", "b"], expected: 1 },
    ],
  },
  {
    slug: "sql-active-users",
    title: "Active Users",
    description: "Write a query returning the names of users who are age 30 or older (column order: name).",
    category: "SQL",
    difficulty: "Easy",
    language: "sql",
    functionName: "solution",
    starterCode: "SELECT name FROM users WHERE age >= 30;",
    publicTests: [
      {
        name: "Over 30",
        setup: "CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, age INTEGER); INSERT INTO users VALUES (1, 'Ada', 36), (2, 'Alan', 41), (3, 'Grace', 28);",
        expected: [["Ada"], ["Alan"]],
      },
    ],
    hiddenTests: [
      {
        name: "Dataset B",
        setup: "CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, age INTEGER); INSERT INTO users VALUES (1, 'Bob', 30), (2, 'Eve', 22), (3, 'Zoe', 55);",
        expected: [["Bob"], ["Zoe"]],
      },
      {
        name: "Dataset C",
        setup: "CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, age INTEGER); INSERT INTO users VALUES (1, 'Kid', 9), (2, 'Teen', 16);",
        expected: [],
      },
    ],
  },
  {
    slug: "sql-products-count",
    title: "Products Overview",
    description: "Return all rows (id, name, price) from the products table, ordered by price descending.",
    category: "SQL",
    difficulty: "Easy",
    language: "sql",
    functionName: "solution",
    starterCode: "SELECT id, name, price FROM products ORDER BY price DESC;",
    publicTests: [
      {
        name: "Ordering",
        setup: "CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT, price REAL); INSERT INTO products VALUES (1, 'Book', 9.99), (2, 'Course', 49.00), (3, 'Poster', 4.50);",
        expected: [[2, "Course", 49], [1, "Book", 9.99], [3, "Poster", 4.5]],
      },
    ],
    hiddenTests: [
      {
        name: "Dataset B",
        setup: "CREATE TABLE products(id INTEGER PRIMARY KEY, name TEXT, price REAL); INSERT INTO products VALUES (10, 'Pen', 1), (11, 'Notebook', 2.5), (12, 'Mouse', 15);",
        expected: [[12, "Mouse", 15], [11, "Notebook", 2.5], [10, "Pen", 1]],
      },
    ],
  },
];

// ------------------------------------------------------------------
// Projects (graded via function/main)
// ------------------------------------------------------------------
interface ProjectSpec {
  slug: string;
  title: string;
  description: string;
  language: string;
  requirements: object;
  starterCode: string;
  publicTests: { name: string; input?: unknown; expected: unknown }[];
  xpReward?: number;
}

async function upsertProject(spec: ProjectSpec) {
  await prisma.project.upsert({
    where: { slug: spec.slug },
    update: {
      title: spec.title,
      description: spec.description,
      language: spec.language,
      requirements: spec.requirements,
      starterCode: spec.starterCode,
      publicTests: spec.publicTests as object,
      xpReward: spec.xpReward ?? 40,
      status: "PUBLISHED",
    },
    create: {
      slug: spec.slug,
      title: spec.title,
      description: spec.description,
      language: spec.language,
      requirements: spec.requirements,
      starterCode: spec.starterCode,
      publicTests: spec.publicTests as object,
      xpReward: spec.xpReward ?? 40,
      order: 0,
      status: "PUBLISHED",
    },
  });
  isVerbose && log(`project ${spec.slug}`);
}

const PROJECTS: ProjectSpec[] = [
  {
    slug: "cli-calculator",
    title: "CLI Calculator",
    description: "Build a calculator with a main(a, b, op) function supporting +, -, * and / (float result for division).",
    language: "python",
    requirements: {
      fn: "main",
      desc: "main(a, b, op) returns the result of a op b. Op is one of '+', '-', '*', '/'. Division returns float.",
    },
    starterCode: 'def main(a: int, b: int, op: str):\n    # your code here\n    return a + b',
    publicTests: [
      { name: "Add", input: [2, 3, "+"], expected: 5 },
      { name: "Subtract", input: [10, 4, "-"], expected: 6 },
      { name: "Multiply", input: [3, 4, "*"], expected: 12 },
      { name: "Divide", input: [10, 4, "/"], expected: 2.5 },
    ],
    xpReward: 40,
  },
  {
    slug: "text-word-count",
    title: "Word Counter",
    description: "Implement main(text) that returns the number of whitespace-separated words in a string.",
    language: "python",
    requirements: { fn: "main", desc: "Return count of words (split on any whitespace). Empty string → 0." },
    starterCode: 'def main(text: str) -> int:\n    # your code here\n    return 0',
    publicTests: [
      { name: "Two words", input: ["hello world"], expected: 2 },
      { name: "Empty", input: [""], expected: 0 },
    ],
    xpReward: 40,
  },
  {
    slug: "js-array-stats",
    title: "Array Stats",
    description: "Implement main(numbers) returning { sum, avg } where avg = sum / length.",
    language: "javascript",
    requirements: { fn: "main", desc: "Return an object with keys sum and avg. avg may be a float." },
    starterCode: "function main(numbers) {\n  // your code here\n  return { sum: 0, avg: 0 };\n}",
    publicTests: [
      { name: "Basic", input: [[1, 2, 3]], expected: { sum: 6, avg: 2 } },
      { name: "Single", input: [[5]], expected: { sum: 5, avg: 5 } },
    ],
    xpReward: 40,
  },
];

// ------------------------------------------------------------------
// Learning paths
// ------------------------------------------------------------------
async function seedPaths() {
  const python = await prisma.course.findUnique({ where: { slug: "python-fundamentals" } });
  const sql = await prisma.course.findUnique({ where: { slug: "sql-and-databases" } });
  const html = await prisma.course.findUnique({ where: { slug: "html-css-foundations" } });
  const js = await prisma.course.findUnique({ where: { slug: "js-essentials" } });
  const calc = await prisma.project.findUnique({ where: { slug: "cli-calculator" } });
  const stats = await prisma.project.findUnique({ where: { slug: "js-array-stats" } });
  const fizz = await prisma.challenge.findUnique({ where: { slug: "python-fizzbuzz" } });
  const squares = await prisma.challenge.findUnique({ where: { slug: "python-sum-of-squares" } });
  const pal = await prisma.challenge.findUnique({ where: { slug: "python-is-palindrome" } });
  const dup = await prisma.challenge.findUnique({ where: { slug: "python-find-duplicate" } });
  const even = await prisma.challenge.findUnique({ where: { slug: "js-even-sum" } });
  const chars = await prisma.challenge.findUnique({ where: { slug: "js-count-characters" } });

  if (python && sql && calc && fizz && squares && pal && dup) {
    await prisma.learningPath.upsert({
      where: { slug: "python-developer-path" },
      update: {
        title: "Python Developer Path",
        description: "From your first print() to a certified Python developer — courses, challenges and a capstone project.",
        icon: "Snake",
        color: "#3776ab",
        courseIds: [python.id, sql.id] as object,
        projectIds: [calc.id] as object,
        challengeIds: [fizz.id, squares.id, pal.id, dup.id] as object,
      },
      create: {
        slug: "python-developer-path",
        title: "Python Developer Path",
        description: "From your first print() to a certified Python developer — courses, challenges and a capstone project.",
        icon: "Snake",
        color: "#3776ab",
        courseIds: [python.id, sql.id] as object,
        projectIds: [calc.id] as object,
        challengeIds: [fizz.id, squares.id, pal.id, dup.id] as object,
      },
    });
  }
  if (js && html && stats && even && chars) {
    await prisma.learningPath.upsert({
      where: { slug: "web-developer-path" },
      update: {
        title: "Web Developer Path",
        description: "Design pages, script interactivity, and prove your skills with challenges and a stats app.",
        icon: "Globe",
        color: "#f7df1e",
        courseIds: [html.id, js.id] as object,
        projectIds: [stats.id] as object,
        challengeIds: [even.id, chars.id] as object,
      },
      create: {
        slug: "web-developer-path",
        title: "Web Developer Path",
        description: "Design pages, script interactivity, and prove your skills with challenges and a stats app.",
        icon: "Globe",
        color: "#f7df1e",
        courseIds: [html.id, js.id] as object,
        projectIds: [stats.id] as object,
        challengeIds: [even.id, chars.id] as object,
      },
    });
  }
  isVerbose && log("learning paths seeded");
}

// ------------------------------------------------------------------
// Demo users (documented in README)
// ------------------------------------------------------------------
const DEMO_PASSWORD = "DemoPass123!";

interface DemoUserSpec {
  email: string;
  username: string;
  displayName: string;
  role: "ADMIN" | "USER";
  bio: string;
  premium?: boolean;
}

const DEMO_USERS: DemoUserSpec[] = [
  { email: "admin@neolearn.dev", username: "ada_admin", displayName: "Ada Admin", role: "ADMIN", bio: "Platform administrator and long-time educator." },
  { email: "demo@neolearn.dev", username: "demo_user", displayName: "Demo Learner", role: "USER", bio: "Just getting started with NeoLearn." },
  { email: "sara@neolearn.dev", username: "sara_codes", displayName: "Sara Codes", role: "USER", bio: "Python enthusiast. Working through the fundamentals path one lesson at a time." },
  { email: "dev@neolearn.dev", username: "dev_dabbler", displayName: "Dev Dabbler", role: "USER", bio: "Exploring web development and SQL." },
];

async function seedUsers() {
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  for (const spec of DEMO_USERS) {
    let user = await prisma.user.findUnique({ where: { email: spec.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: spec.email,
          username: spec.username,
          displayName: spec.displayName,
          passwordHash: hash,
          role: spec.role,
          bio: spec.bio,
          emailVerified: new Date(),
          isPremium: spec.premium ?? false,
          skills: (spec.role === "ADMIN" ? ["Python", "DevOps"] : spec.username === "sara_codes" ? ["Python", "SQL"] : ["JavaScript", "HTML"]) as string[],
          streak: { create: {} },
        },
      });
    }
    // ensure streak row exists
    await prisma.streak.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
    // demo users skip onboarding so login lands straight on the dashboard
    await prisma.onboarding.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        topics: ["Python"],
        experienceLevel: "Beginner",
        goal: "Hobby",
      },
    });
    isVerbose && log(`user ${spec.username}`);
  }
}

// ------------------------------------------------------------------
// Demo progress for sara (keeps XP = ledger sum)
// ------------------------------------------------------------------
async function seedSaraProgress() {
  const sara = await prisma.user.findUnique({ where: { email: "sara@neolearn.dev" } });
  if (!sara) return;

  const lessons = await prisma.lesson.findMany({
    where: { slug: { in: ["python-welcome", "python-printing", "python-variables", "python-math", "python-strings", "python-comments"] } },
  });
  const quiz = await prisma.quiz.findUnique({ where: { slug: "python-practice" } });
  const challenge = await prisma.challenge.findUnique({ where: { slug: "python-fizzbuzz" } });
  const course = await prisma.course.findUnique({ where: { slug: "python-fundamentals" } });

  const xp = [...Array(6).fill(10), 20, 30, 50].reduce((a, b) => a + b, 0); // 6*10 + quiz20 + challenge30 + daily50 = 160
  const level = levelFromXp(xp);

  await prisma.user.update({
    where: { id: sara.id },
    data: { xp, level, xpFromLastCheckpoint: xp - xpThresholdForLevel(level), isPremium: false },
  });

  for (const l of lessons) {
    await prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: sara.id, lessonId: l.id } },
      update: { status: "completed", progressPct: 100, xpRewarded: true },
      create: { userId: sara.id, lessonId: l.id, status: "completed", progressPct: 100, xpRewarded: true },
    });
    await prisma.xpTransaction.upsert({
      where: { userId_type_sourceId: { userId: sara.id, type: "lesson", sourceId: l.id } },
      update: {},
      create: { userId: sara.id, type: "lesson", sourceId: l.id, amount: 10 },
    });
  }
  if (course) {
    await prisma.courseProgress.upsert({
      where: { userId_courseId: { userId: sara.id, courseId: course.id } },
      update: { completedLessons: lessons.length, totalLessons: 24 },
      create: { userId: sara.id, courseId: course.id, completedLessons: lessons.length, totalLessons: 24 },
    });
  }
  if (quiz) {
    await prisma.quizAttempt.upsert({
      where: { id: "seed-sara-quiz-1" },
      update: {},
      create: {
        id: "seed-sara-quiz-1",
        userId: sara.id,
        quizId: quiz.id,
        attemptNo: 1,
        answers: {},
        score: 5 * 10,
        maxScore: 5 * 10,
        passed: true,
        passRewarded: true,
      },
    });
    await prisma.xpTransaction.upsert({
      where: { userId_type_sourceId: { userId: sara.id, type: "quiz", sourceId: quiz.id } },
      update: { amount: 20 },
      create: { userId: sara.id, type: "quiz", sourceId: quiz.id, amount: 20 },
    });
  }
  if (challenge) {
    await prisma.challengeAttempt.upsert({
      where: { id: "seed-sara-challenge-1" },
      update: {},
      create: {
        id: "seed-sara-challenge-1",
        userId: sara.id,
        challengeId: challenge.id,
        code: challenge.starterCode,
        publicPassed: true,
        hiddenPassed: true,
        passed: true,
        rewarded: true,
        executionMs: 3,
      },
    });
    await prisma.xpTransaction.upsert({
      where: { userId_type_sourceId: { userId: sara.id, type: "challenge", sourceId: challenge.id } },
      update: {},
      create: { userId: sara.id, type: "challenge", sourceId: challenge.id, amount: 30 },
    });
  }

  // daily mission completed & claimed (matches the +50 in total)
  const todayMission = await prisma.dailyMission.findFirst({ orderBy: { dateKey: "asc" } });
  if (todayMission) {
    const tasks = todayMission.tasks as Array<{ key: string; label: string; target: number }>;
    const tasksDone = (tasks as Array<{ key: string; label: string; target: number }>).map((t) => ({ key: t.key, done: t.target }));
    await prisma.userDailyMission.upsert({
      where: { userId_dailyMissionId: { userId: sara.id, dailyMissionId: todayMission.id } },
      update: {},
      create: {
        userId: sara.id,
        dailyMissionId: todayMission.id,
        tasksDone,
        claimed: true,
        claimedXp: true,
        completedAt: new Date(),
      },
    });
    await prisma.xpTransaction.upsert({
      where: { userId_type_sourceId: { userId: sara.id, type: "daily_mission", sourceId: todayMission.id } },
      update: { amount: 50 },
      create: { userId: sara.id, type: "daily_mission", sourceId: todayMission.id, amount: 50 },
    });
  }

  // streak looks alive
  await prisma.streak.update({
    where: { userId: sara.id },
    data: { current: 3, longest: 3, lastActivityDate: new Date(Date.now() - 60_000), weekDates: [false, true, true, true, false, false, false] },
  });

  // achievements consistent with stats
  const firstLessonAch = await prisma.achievement.findUnique({ where: { key: "first-lesson" } });
  if (firstLessonAch) {
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: sara.id, achievementId: firstLessonAch.id } },
      update: {},
      create: { userId: sara.id, achievementId: firstLessonAch.id },
    });
  }
  isVerbose && log("sara demo progress seeded");
}

// ------------------------------------------------------------------
// Bootstrap admin (env override, e.g. ADMIN_BOOTSTRAP_EMAIL)
// ------------------------------------------------------------------
async function bootstrapAdmin() {
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.toLowerCase();
  if (!email) return;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const hash = bcrypt.hashSync(process.env.ADMIN_BOOTSTRAP_PASSWORD ?? DEMO_PASSWORD, 10);
    await prisma.user.create({
      data: {
        email,
        username: process.env.ADMIN_BOOTSTRAP_USERNAME ?? "admin",
        displayName: process.env.ADMIN_BOOTSTRAP_NAME ?? "Administrator",
        passwordHash: hash,
        role: "ADMIN",
        emailVerified: new Date(),
        streak: { create: {} },
      },
    });
    log(`bootstrap admin created for ${email}`);
  } else {
    await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
  }
}

// ------------------------------------------------------------------
// main
// ------------------------------------------------------------------
async function main() {
  log("seeding settings…"); await seedSettings();
  log("seeding plans…"); await seedPlans();
  log("seeding achievements…"); await seedAchievements();
  log("seeding daily missions…"); await seedDailyMissions();

  log("seeding courses…");
  for (const c of COURSES) await upsertCourse(c);

  log("seeding quizzes…");
  for (const q of QUIZZES) await upsertQuiz(q.spec, q.questions);

  log("seeding challenges…");
  for (const c of CHALLENGES) await upsertChallenge(c);

  log("seeding projects…");
  let order = 1;
  for (const p of PROJECTS) {
    await upsertProject(p);
    const proj = await prisma.project.findUnique({ where: { slug: p.slug } });
    if (proj) await prisma.project.update({ where: { id: proj.id }, data: { order: order++ } });
  }

  log("seeding learning paths…");
  await seedPaths();

  log("seeding users…");
  await seedUsers();
  await seedSaraProgress();
  await bootstrapAdmin();

  const counts = {
    courses: await prisma.course.count(),
    lessons: await prisma.lesson.count(),
    quizzes: await prisma.quiz.count(),
    challenges: await prisma.challenge.count(),
    projects: await prisma.project.count(),
    paths: await prisma.learningPath.count(),
    achievements: await prisma.achievement.count(),
    users: await prisma.user.count(),
  };
  log("DONE", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());