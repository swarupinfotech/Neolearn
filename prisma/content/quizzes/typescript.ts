// ============================================================
// Quizzes for the TypeScript Fundamentals course.
//
// Two quizzes:
//   1. A COURSE assessment attached to the course, which is the
//      credential that marks the course complete.
//   2. A final assessment for the Software Engineering Foundations
//      path, which mixes in the project/tooling material that sits
//      outside the course itself.
//
// Question type coverage is deliberate: MCQ, TRUE_FALSE, OUTPUT, FILL,
// MULTI_SELECT, MATCH and DEBUGGING. The runner and the server grader
// were both extended for these, so the assessment exercises them all
// rather than shipping another all-MCQ quiz.
//
// `correctAnswer` follows the existing seed convention: an array, with
// MCQ/TRUE_FALSE/DEBUGGING/OUTPUT holding the option index as a string,
// MULTI_SELECT holding every required index, and MATCH holding
// [left, right] pairs.
// ============================================================

import type { QuestionSpec, QuizSpec } from "../pipeline";

export interface QuizBundle {
  spec: QuizSpec;
  questions: QuestionSpec[];
}

const TYPESCRIPT_COURSE_QUIZ: QuizBundle = {
  spec: {
    slug: "typescript-fundamentals-assessment",
    title: "TypeScript Fundamentals Assessment",
    description:
      "Twelve questions across annotations, inference, interfaces, unions, narrowing and generics. Passing scores 70% and awards the course credential.",
    type: "COURSE",
    courseSlug: "typescript-fundamentals",
    passingScore: 70,
    xpReward: 60,
    order: 1,
  },
  questions: [
    {
      type: "MCQ",
      prompt: "Which declaration requires an explicit type annotation?",
      code: `let count = 0;        // line 1
let label: string;   // line 2
label = "done";      // line 3
count = count + 1;   // line 4`,
      options: [
        "Line 1 — TypeScript cannot infer a number from a numeric literal",
        "Line 2 — there is no initial value to infer a type from",
        "Line 3 — string literals always need an annotation",
        "Line 4 — reassignment requires a fresh annotation",
      ],
      correctAnswer: ["1"],
      explanation:
        "Line 2 declares a variable with no value, so there is nothing to infer from. Line 1 infers `number`, line 3 assigns a string to an already-`string` variable, and line 4 is arithmetic on a `number`.",
      points: 10,
    },
    {
      type: "TRUE_FALSE",
      prompt:
        "Assigning a string to a variable that was inferred as `number` makes TypeScript widen the variable's type to `string | number`.",
      correctAnswer: ["1"],
      explanation:
        "False. A variable's type is fixed at its declaration. Assigning a string to a `number` variable is a compile error, not a silent widening.",
      points: 10,
    },
    {
      type: "MCQ",
      prompt:
        "`interface User { id: number; name: string; email?: string }` — which declaration fails to type-check?",
      code: `const a = { id: 1, name: "Ada" };
const b = { id: 2, name: "Grace", email: "g@example.com" };
const c = { id: 3, name: "Alan", email: "a@example.com" };
const d = { id: 4, email: "d@example.com" };`,
      options: [
        "`a` — `email` is required",
        "`b` — `email` must be a string, not optional",
        "`c` — three properties is more than the interface declares",
        "`d` — `name` is missing",
      ],
      correctAnswer: ["3"],
      explanation:
        "`name` is required, so `d` fails. `a` is fine because `email` is optional, and `b` and `c` supply all required properties with the right types.",
      points: 10,
    },
    {
      type: "OUTPUT",
      prompt: "What does this log?",
      code: `interface Config { retries?: number }
const c: Config = {};
console.log(c.retries ?? 3);`,
      correctAnswer: ["3"],
      explanation:
        "`c.retries` is `undefined` because the property was omitted, so the `??` operator falls back to 3.",
      points: 10,
    },
    {
      type: "FILL",
      prompt:
        "You receive a JSON payload and have not validated it. Which annotation should you use so it cannot flow into code expecting a specific shape?",
      correctAnswer: ["unknown"],
      explanation:
        "`unknown` accepts any value but forces you to narrow it before use. `any` would disable checking entirely, which is the opposite of what you want.",
      points: 10,
    },
    {
      type: "MCQ",
      prompt:
        "Given `type Pet = Cat | Dog` where `lives` exists only on `Cat`, how can you read `pet.lives`?",
      code: `interface Cat { kind: "cat"; lives: number }
interface Dog { kind: "dog"; barks: boolean }
type Pet = Cat | Dog;

function announce(pet: Pet) {
  return pet.lives;
}`,
      options: [
        "Read it directly — the union exposes every member's fields",
        "Assert it: `(pet as Cat).lives`",
        "Narrow first, e.g. `if (pet.kind === \"cat\")`",
        "Cast the union: `pet as Cat | Dog & Cat`",
      ],
      correctAnswer: ["2"],
      explanation:
        "`lives` only exists on `Cat`, so you must narrow to that branch first — normally via the discriminant `pet.kind`. An assertion changes nothing at runtime and therefore proves nothing to the compiler.",
      points: 15,
    },
    {
      type: "MULTI_SELECT",
      prompt: "Which of these narrow a union type at runtime? Select all that apply.",
      options: [
        "`typeof value === \"string\"`",
        "`value as string`",
        "`value instanceof Date`",
        "`\"key\" in value`",
        "`value!`",
      ],
      correctAnswer: ["0", "2", "3"],
      explanation:
        "`typeof`, `instanceof` and `in` are real runtime checks, so TypeScript narrows correctly. The non-null assertion `value!` and the `as string` cast are compile-time only — they tell the compiler to stop complaining without checking anything.",
      points: 15,
    },
    {
      type: "FILL",
      prompt:
        "In `function pluck<T, K extends keyof T>(obj: T, key: K): T[K]`, what does `keyof T` evaluate to?",
      correctAnswer: [
        "the union of property names on T",
        "union of property names on t",
        "the property names of t",
        "the keys of t",
        "keys of t",
        "union of keys of t",
        "the set of property names on T",
      ],
      explanation:
        "`keyof T` produces the union of T's property names, and `K extends keyof T` constrains K to exactly those names. That constraint is what makes `obj[key]` type-safe.",
      points: 10,
    },
    {
      type: "MATCH",
      prompt: "Match each helper to the guarantee it gives you.",
      pairs: [
        { left: "`unknown`", right: "Accepts any value but forces narrowing before use" },
        { left: "`any`", right: "Disables type checking for the value entirely" },
        { left: "`keyof T`", right: "The set of valid property names on T" },
        { left: "`extends` on a generic", right: "A constraint that keeps the implementation safe" },
      ],
      correctAnswer: [],
      explanation:
        "These four are the tools that decide whether a type is doing real work. `unknown` and `any` are opposites, `keyof T` derives valid keys, and `extends` constrains a type parameter so the body can be written safely.",
      points: 15,
    },
    {
      type: "DEBUGGING",
      prompt:
        "This function is supposed to return the length of the first string in the list, or 0 if there is none. What is the bug?",
      code: `function firstLength(items: (string | number)[]): number {
  const first = items.find((i) => typeof i === "string");
  return first.length;
}`,
      options: [
        "`find` returns an array, so `.length` is the array's length",
        "`first` is `string | number | undefined`, so `.length` is not safe",
        "`typeof i === \"string\"` is not a valid narrowing check",
        "`items` should be typed `string[]` for `find` to work",
      ],
      correctAnswer: ["1"],
      explanation:
        "`find` returns `T | undefined`, and the predicate only narrows the element type — it does not narrow the result. So `first` is `string | number | undefined` and `.length` fails to type-check. The fix is to check the result: `return typeof first === \"string\" ? first.length : 0;`",
      points: 15,
    },
    {
      type: "OUTPUT",
      prompt: "What does this log?",
      code: `type Status = "open" | "done";

function label(s: Status): string {
  switch (s) {
    case "open": return "pending";
    case "done": return "finished";
    default:     return "unknown";
  }
}

console.log(label("done"));`,
      correctAnswer: ["finished"],
      explanation:
        "`label` is called with `\"done\"`, so the `case \"done\"` branch returns `\"finished\". The `default` branch is unreachable for a fully-narrowed union.",
      points: 10,
    },
    {
      type: "MCQ",
      prompt: "Why does `pluck(user, \"email\")` fail to compile when `user` has no `email` property?",
      code: `function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: "Ada" };
const v = pluck(user, "email");`,
      options: [
        "`keyof T` cannot be used in a parameter position",
        "`K` is constrained to `keyof T`, and `\"email\"` is not a key of `user`",
        "`T[K]` requires `K` to be a number, because it indexes an array",
        "`pluck` needs an explicit type argument at every call site",
      ],
      correctAnswer: ["1"],
      explanation:
        "`K extends keyof T` restricts `K` to the property names that actually exist on `T`. For `user`, that is `\"id\" | \"name\"`, so `\"email\"` is rejected — which is the whole point of the constraint.",
      points: 15,
    },
  ],
};

const SOFTWARE_ENGINEERING_FINAL: QuizBundle = {
  spec: {
    slug: "software-engineering-foundations-final",
    title: "Software Engineering Foundations — Final Assessment",
    description:
      "The path capstone. Covers typed code, testing, debugging under time pressure, and the trade-offs behind the output-based grading model.",
    type: "ASSESSMENT",
    passingScore: 75,
    xpReward: 120,
    order: 1,
  },
  questions: [
    {
      type: "MCQ",
      prompt: "A function receives input you do not control — an API response, a query string. What is the safest parameter type?",
      options: ["`any`", "`unknown`", "`object`", "A hand-written interface with every field optional"],
      correctAnswer: ["1"],
      explanation:
        "`unknown` accepts any value while requiring you to narrow it before use, so unchecked data cannot reach code that expects a specific shape. `any` disables checking; `object` is too loose to be useful; optional-everything interfaces just move the problem.",
      points: 10,
    },
    {
      type: "TRUE_FALSE",
      prompt:
        "A type assertion (`value as T`) is a safety mechanism: it tells the compiler to verify the value really is a `T`.",
      correctAnswer: ["1"],
      explanation:
        "False. An assertion is an instruction to the compiler to stop checking. If the value is not actually a `T`, the error surfaces later as a runtime failure — usually further from the cause.",
      points: 10,
    },
    {
      type: "MULTI_SELECT",
      prompt: "Which of these are genuine type-safety hazards in a TypeScript codebase? Select all that apply.",
      options: [
        "`any` used to silence an error",
        "A non-null assertion `value!` on a possibly-undefined value",
        "An interface with explicit property types",
        "A discriminant property on a union",
        "Casting a parsed JSON payload straight to a domain type",
      ],
      correctAnswer: ["0", "1", "4"],
      explanation:
        "All three hazards silence the compiler without adding a runtime check. Explicit property types and a discriminant both add real checking, so they are the opposite of a hazard.",
      points: 15,
    },
    {
      type: "MCQ",
      prompt:
        "Your `groupByStatus` challenge passes 2 of 3 hidden tests. The failing test passes an empty array. What is the most likely cause?",
      options: [
        "The function returns the right shape but the test harness cannot serialise an empty object",
        "`[].filter(...)` produces `undefined` rather than `[]`, so the return value is not an array",
        "Empty inputs are skipped by the hidden test runner",
        "The challenge's `xpReward` is too low, so the test was not graded",
      ],
      correctAnswer: ["1"],
      explanation:
        "An empty array is the classic edge case: naive implementations return `undefined` or a missing key instead of empty lists. The grader compares shape as well as contents, so the two non-empty tests pass while the empty one fails.",
      points: 15,
    },
    {
      type: "OUTPUT",
      prompt: "What does this log?",
      code: `type Pet =
  | { kind: "cat"; lives: number }
  | { kind: "dog"; barks: boolean };

function describe(pet: Pet): string {
  switch (pet.kind) {
    case "cat": return String(pet.lives);
    case "dog": return pet.barks ? "loud" : "quiet";
  }
}

console.log(describe({ kind: "cat", lives: 9 }));`,
      correctAnswer: ["9"],
      explanation:
        "The discriminant `kind` narrows the union to the `Cat` branch, where `lives` is `number`. `String(9)` logs `9`.",
      points: 10,
    },
    {
      type: "FILL",
      prompt:
        "In a discriminated union, what is the name for the property whose value tells you which member you are holding?",
      correctAnswer: ["discriminant", "discriminator", "a discriminant", "the discriminant", "tag", "the tag"],
      explanation:
        "It is called a discriminant (sometimes a tag). It is what lets TypeScript prove which member is in scope, which removes an entire category of impossible-field bugs.",
      points: 10,
    },
    {
      type: "DEBUGGING",
      prompt: "This generic is supposed to return the first element of a list. What breaks?",
      code: `function first<T>(list: T[]): T {
  return list[0];
}

const n = first([1, 2, 3]);`,
      options: [
        "`list[0]` cannot be indexed because `T` is unknown at compile time",
        "The return type should be `T[]`, not `T`",
        "Indexing an array can return `undefined`, so `T` is a lie",
        "`T` must be constrained with `extends object`",
      ],
      correctAnswer: ["2"],
      explanation:
        "With `noUncheckedIndexedAccess` semantics — and in practice at runtime — `list[0]` can be `undefined` for an empty array, so claiming `T` overstates what you have. The honest signature is `T | undefined`, which is why the course's own version returns that.",
      points: 15,
    },
    {
      type: "MCQ",
      prompt:
        "Challenges in C, C++, Java, PHP and Go are graded by comparing program output rather than by running the program. What does that actually verify?",
      options: [
        "The submitted source code is correct",
        "The program produces the expected output for the hidden inputs",
        "The program compiles without errors",
        "The program runs within the time limit",
      ],
      correctAnswer: ["1"],
      explanation:
        "Only the output. A program that hard-codes the expected answers would pass, which is a genuine weakness of the model — and it is why those challenge pages state the limitation plainly rather than implying the program itself was verified.",
      points: 15,
    },
    {
      type: "MULTI_SELECT",
      prompt:
        "The platform runs learner code in a WebAssembly sandbox with host APIs removed. Which of these are genuine consequences of that design? Select all that apply.",
      options: [
        "Submitted code cannot open a network connection",
        "Submitted code cannot read the platform's database credentials",
        "Submitted code runs on a machine you control",
        "A runaway infinite loop can be terminated by a watchdog",
      ],
      correctAnswer: ["0", "1", "3"],
      explanation:
        "An interpreter with no ambient authority has no socket and no filesystem API, so network and credential access are structurally impossible rather than merely discouraged. A watchdog can still kill a loop. But the code runs in the learner's own browser or an isolated server sandbox — not on a machine you control.",
      points: 15,
    },
    {
      type: "TRUE_FALSE",
      prompt:
        "TypeScript's type system can prove that a function is correct for all inputs.",
      correctAnswer: ["1"],
      explanation:
        "False. Types check shape, not logic. A fully-typed function can still compute the wrong answer, which is exactly why the course pairs the type system with runnable, tested challenges.",
      points: 10,
    },
    {
      type: "MATCH",
      prompt: "Match each TypeScript tool to the problem it solves.",
      pairs: [
        { left: "Interface", right: "Describes the exact shape an object must have" },
        { left: "Union type", right: "Represents a value that is one of several types" },
        { left: "Narrowing", right: "Reduces a union to the branch you are currently in" },
        { left: "Generic", right: "Lets one function work for many types without losing information" },
        { left: "Discriminant", right: "The property that identifies which union member you hold" },
      ],
      correctAnswer: [],
      explanation:
        "These five are the vocabulary the whole course rests on. Confusing a union with an interface, or narrowing with a cast, is the most common source of avoidable type errors.",
      points: 15,
    },
    {
      type: "MCQ",
      prompt:
        "A reviewer's comment says a function takes `any` and 'loses all type information'. What is the most direct fix?",
      options: [
        "Add a type assertion at the return site",
        "Make the parameter generic and return the inferred type",
        "Turn on `strict` mode",
        "Add a comment documenting the expected shape",
      ],
      correctAnswer: ["1"],
      explanation:
        "A generic is the direct fix: `<T>` chosen by the caller means the return type follows the input, with no information discarded. Assertions and comments only suppress the symptom, and `strict` would have caught the original `any` rather than fixing its consequences.",
      points: 15,
    },
  ],
};

export const TYPESCRIPT_QUIZZES: QuizBundle[] = [TYPESCRIPT_COURSE_QUIZ, SOFTWARE_ENGINEERING_FINAL];
