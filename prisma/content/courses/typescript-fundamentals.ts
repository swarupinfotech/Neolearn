// ============================================================
// TypeScript Fundamentals
//
// Note on interaction: TypeScript's type syntax is erased before a
// challenge runs, so the graded practice in this course is delivered
// through `challenge_block`s (server-side, real type stripping) and
// inline quizzes. Static examples are shown read-only, because the
// in-browser runner executes JavaScript and cannot display type errors.
// ============================================================

import {
  text,
  example,
  tips,
  complete,
  inlineMcq,
  inlineTrueFalse,
  inlineFill,
  inlineOutput,
  challengeBlock,
} from "../pipeline";
import type { CourseSpec } from "../pipeline";

export const typescriptFundamentals: CourseSpec = {
  slug: "typescript-fundamentals",
  title: "TypeScript Fundamentals",
  description:
    "Add a static type system to JavaScript: annotations, inference, interfaces, unions, narrowing and generics.",
  longDescription:
    "TypeScript is JavaScript with a type system that runs before your code does. Instead of discovering that a value was undefined three screens away, the compiler tells you at the point you made the mistake. This course builds that foundation from first principles: what types are, how TypeScript infers them when you say nothing, how to describe the shape of your data with interfaces, how to model alternatives with unions, how narrowing turns a union into a precise type, and how generics let one function work for many types without falling back to any.\n\nBy the end you will be able to read a typed codebase without guessing, and you will write functions that are hard to misuse.",
  objectives: [
    "Explain what a static type system does and when it pays for itself",
    "Write type annotations and rely on inference where it is clearer not to",
    "Model object shapes with interfaces and optional properties",
    "Represent alternatives with union types and narrow them safely",
    "Write generic functions that preserve type information",
    "Recognise the traps that quietly destroy type safety: any, assertions and non-null assertions",
  ],
  category: "Programming",
  language: "TypeScript",
  technology: "TypeScript",
  tags: ["TypeScript", "JavaScript", "Static Typing"],
  difficulty: "Beginner",
  icon: "Braces",
  color: "#3178c6",
  xpReward: 150,
  students: 900,
  order: 20,
  modules: [
    {
      title: "The Type System",
      lessons: [
        {
          slug: "ts-why-types",
          title: "Why Types Exist",
          duration: 8,
          xpReward: 10,
          blocks: [
            text(
              "A program is a series of decisions about what a value is and what you can do with it. In JavaScript every value is flexible: a number can become a string, a function can vanish, an object can quietly lose a property. That flexibility is convenient while you are experimenting and expensive the moment someone else has to read the code.\n\nConsider a shopping cart. The code below is perfectly valid JavaScript, and perfectly capable of failing in production."
            ),
            example(
              `// Plain JavaScript: nothing stops this from going wrong.
function cartTotal(cart) {
  return cart.items.reduce((sum, item) => sum + item.price, 0);
}

const cart = { items: [{ title: "Keyboard", price: 80 }] };
// Typo in the property name — a plain string has no idea:
cartTotal({ items: [{ titel: "Keyboard", price: 80 }] }); // NaN`,
              "javascript",
              "A typo becomes a runtime failure"
            ),
            text(
              "The mistake is not the typo. The mistake is that nothing checked it. The array item was assumed to have a `price`, and no part of the program was responsible for that assumption being true.\n\nA static type system moves that check earlier. You describe the shape of the data once, and then every use of it is checked against that description. A type error is reported before the program runs, not three hours into production.\n\nThis is the core idea behind TypeScript: describe your data, and let a compiler find the places where your code and your data disagree."
            ),
            tips([
              "A type is a description of a value, not a class you instantiate.",
              "Types are checked at compile time and then erased — there is no runtime type object.",
              "Types cannot catch logic mistakes. They catch shape mistakes.",
            ]),
            inlineTrueFalse({
              id: "ts-why-types-q1",
              prompt:
                "TypeScript's type system runs before your program executes. What does that let it catch?",
              correct: true,
              explanation:
                "Correct. Because checks happen at compile time, shape mistakes like a misspelled property are reported before the code ever runs.",
            }),
            complete("Why types matter", "You now know the problem a type system solves."),
          ],
        },
        {
          slug: "ts-annotations-and-inference",
          title: "Annotations and Inference",
          duration: 10,
          xpReward: 10,
          blocks: [
            text(
              "There are two ways to give TypeScript information about a value: annotate it yourself, or let TypeScript infer the type. Good code knows when to use each.\n\nAn annotation is a type you write: `let age: number = 30`. Inference is a type TypeScript works out for you: `let age = 30` already has the type `number`, so writing `: number` adds noise.\n\nThe practical rule: annotate when you are declaring an empty or ambiguous value, when the type is wider than what inference would give, and at the boundaries of your code (function parameters and return types). Leave the rest to inference — it keeps code shorter and the types stay accurate as you edit."
            ),
            example(
              `// Inference is enough here — the type is already \`number\`.
let count = 0;                 // number
count = 5;                     // fine

// Annotation is required here — nothing to infer from.
let later: number;             // declared, no value yet
later = 10;                    // fine

later = "ten";                 // ERROR: Type 'string' is not assignable to 'number'

// Function boundaries deserve explicit types.
function double(value: number): number {
  return value * 2;
}

// \`unknown\` is the safe starting point for untrusted input.
function parse(raw: unknown): number {
  if (typeof raw === "number") return raw;
  return 0;
}`,
              "typescript",
              "Annotate at boundaries, infer everywhere else"
            ),
            text(
              "One more inference subtlety: a variable's type is fixed at its declaration, not re-evaluated on every assignment. If you declare `let result = 10` and later assign a string to it, TypeScript reports an error — it does not silently widen `result` to `string | number` the way some other languages would. This is often called type *narrowing* in the other direction: a value starts wide and gets more precise as control flow proves more about it."
            ),
            tips([
              "Annotate function parameters and return types; let inference handle local variables.",
              "Use `unknown` instead of `any` for values you have not validated yet.",
              "A variable never changes its declared type through later assignments.",
            ]),
            inlineMcq({
              id: "ts-annotations-q1",
              prompt: "Which line needs an explicit annotation?",
              code: `let total = 0;      // line 1
let label: string;   // line 2
label = "done";      // line 3`,
              options: [
                "Line 1 — TypeScript cannot infer a number",
                "Line 2 — there is no value to infer from",
                "Line 3 — labels must always be annotated",
                "None — all three are fine as written",
              ],
              correct: 1,
              explanation:
                "Line 2 declares a variable with no initial value, so there is nothing to infer. Line 1 infers number, and line 3 assigns to an already-typed variable.",
            }),
            inlineFill({
              id: "ts-annotations-q2",
              prompt:
                "You receive a value from a network response and have not checked it yet. Which annotation is safest?",
              accept: ["unknown", "unknown>"],
              explanation:
                "`unknown` accepts any value but forces you to narrow it before use, so an unchecked response cannot flow into code that expects a specific shape.",
            }),
            complete("Annotations and inference", "You can now write types without over-annotating."),
          ],
        },
      ],
    },
    {
      title: "Describing Data",
      lessons: [
        {
          slug: "ts-interfaces",
          title: "Interfaces and Object Shapes",
          duration: 10,
          xpReward: 10,
          blocks: [
            text(
              "An interface describes the shape an object must have. It lists the properties, their types, and whether each one is required. Nothing else is allowed: an object with a missing required property, or a property of the wrong type, is not a valid value of that interface."
            ),
            example(
              `interface User {
  id: number;
  name: string;
  email?: string;        // optional
  role: "admin" | "user";
}

const ada: User = {
  id: 1,
  name: "Ada",
  role: "user",
};                        // ok — email is optional

const bad: User = {
  id: 2,
  name: "Grace",
  role: "root",          // ERROR: not one of the allowed values
};                        // ERROR: also missing nothing, but role is wrong

// Reading an optional property gives \`string | undefined\`.
function label(u: User): string {
  return u.email ?? "no email on file";
}

// Unknown extra properties are rejected on a direct literal.
const typo: User = { id: 3, name: "Alan", role: "user", emial: "a@b.c" };
//                                 ~~~~~~~ ERROR: object literal may only specify known properties`,
              "typescript",
              "Interfaces describe exactly which properties exist"
            ),
            text(
              "That last error is one of the most valuable in the language. The `emial` typo is caught at the point of writing the object, which is precisely the class of bug that plain JavaScript lets through.\n\nFor values that may have extra properties — anything coming from JSON, another service, or a function returning a wider object — use a type alias with an index signature instead, so unknown keys are allowed but the known ones stay checked."
            ),
            tips([
              "`?` makes a property optional, which also adds `undefined` to its type.",
              "Use `readonly` for properties that must not change after creation.",
              "Extra properties are rejected on object literals, but allowed on values coming from variables.",
            ]),
            inlineMcq({
              id: "ts-interfaces-q1",
              prompt:
                "`interface Point { x: number; y: number; label?: string }` — which declaration is valid?",
              code: `const a = { x: 0, y: 0 };
const b = { x: 1 };
const c = { x: "1", y: 2 };
const d = { x: 1, y: 2, label: "origin" };`,
              options: [
                "a — `label` must be provided",
                "b — `y` is required",
                "c — `x` accepts any value",
                "d — `label` is not a known property",
              ],
              correct: 0,
              explanation:
                "`a` is valid: both `x` and `y` are supplied and the optional `label` may be omitted. `b` is missing the required `y`, `c` gives `x` the wrong type, and `d` is a valid object too — its `label` is a declared property, so it type-checks.",
            }),
            inlineOutput({
              id: "ts-interfaces-q2",
              prompt: "What does this log?",
              code: `interface Config { retries?: number }
const c: Config = {};
console.log(c.retries ?? 3);`,
              accept: ["3"],
              explanation:
                "`c.retries` is `undefined` because the property was omitted. The `??` operator falls back to 3, so the output is 3.",
            }),
            complete("Interfaces", "You can describe your data and have the compiler check it."),
          ],
        },
        {
          slug: "ts-unions-and-narrowing",
          title: "Unions and Narrowing",
          duration: 10,
          xpReward: 10,
          blocks: [
            text(
              "A union type says a value is one of several types. `string | number` is honest about reality: this value is a string, or it is a number, and you should not assume which.\n\nThe problem is that you often need to do something different in each case. TypeScript solves this with narrowing: it looks at how you test the value and reduces the union to the specific branch you are in, so inside that branch the type is exact."
            ),
            example(
              `function describe(value: string | number): string {
  if (typeof value === "number") {
    // Inside this branch value is \`number\` — arithmetic is allowed.
    return \`number: \${value * 2}\`;
  }
  // After the early return, value is \`string\`.
  return \`string: \${value.toUpperCase()}\`;
}

// The same idea with a shape-based guard.
interface Cat { kind: "cat"; lives: number }
interface Dog { kind: "dog"; bark: boolean }
type Pet = Cat | Dog;

function describePet(pet: Pet): string {
  switch (pet.kind) {
    case "cat":   return \`\${pet.lives} lives\`;
    case "dog":   return pet.bark ? "barks" : "quiet";
  }
}`,
              "typescript",
              "Narrowing reduces a union to the branch you are in"
            ),
            text(
              "The `kind` field in that example is called a *discriminant*: a property whose value tells you which member of the union you have. Modelling data this way removes an entire category of bug, because the compiler can prove `pet.lives` only exists on the cat branch.\n\nNarrowing also works with `in`, with `typeof`, with `instanceof`, with a custom type-guard function, and with an early return that eliminates a case. Learn to look for the natural narrowing point in your code — it usually makes the function shorter as well as safer."
            ),
            tips([
              "A discriminant property makes unions easy and safe to work with.",
              "Narrow with typeof, instanceof, `in`, a switch, or an early return.",
              "Reaching for a type assertion usually means there is a missing guard, not a missing cast.",
            ]),
            inlineTrueFalse({
              id: "ts-union-q1",
              prompt:
                "In a `Pet = Cat | Dog` union, can you read `pet.lives` without narrowing to `Cat` first?",
              correct: false,
              explanation:
                "False. `lives` only exists on Cat, so TypeScript requires you to narrow — normally via the discriminant `pet.kind` — before reading it.",
            }),
            inlineMcq({
              id: "ts-union-q2",
              prompt: "Which check narrows a `string | number` value to `number`?",
              options: [
                "value === number",
                "typeof value === 'number'",
                "value as number",
                "Number(value) > 0",
              ],
              correct: 1,
              explanation:
                "`typeof value === 'number'` is a real runtime check, so TypeScript narrows correctly. An assertion (`as number`) changes no runtime behaviour and therefore proves nothing.",
            }),
            complete("Unions and narrowing", "You can model alternatives safely."),
          ],
        },
      ],
    },
    {
      title: "Reusable and Safe Code",
      lessons: [
        {
          slug: "ts-generics",
          title: "Generics",
          duration: 10,
          xpReward: 15,
          blocks: [
            text(
              "A generic function works for many types while still knowing, precisely, what type it was given. It is the difference between a function that returns `any` and a function that returns exactly what you put in."
            ),
            example(
              `// Without generics you must pick one type or fall back to any.
function firstAny(list: any[]): any { return list[0]; }

// With a generic the return type follows the input type.
function first<T>(list: T[]): T | undefined { return list[0]; }

const n = first([1, 2, 3]);      // number | undefined
const s = first(["a", "b"]);     // string | undefined
// first([1, "a"])              // ERROR: not every element is a number

// Generics also parameterise the key you are reading.
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: "Ada" };
const name = pluck(user, "name");  // string
// pluck(user, "email")           // ERROR: "email" is not a key of user`,
              "typescript",
              "Generics preserve the caller's type"
            ),
            text(
              "Read `<T>` as a stand-in for a type chosen by whoever calls the function. `keyof T` is the set of valid keys, and `T[K]` is the type of the value at key `K` — together they give you type-safe property access on any object.\n\nThe `extends` keyword on a generic parameter is a *constraint*: it guarantees the type argument satisfies certain requirements, so the function body is safe to write. In `K extends keyof T`, the constraint is what makes `obj[key]` type-safe at all.\n\nYou do not need generics everywhere. Reach for one when a function would otherwise take or return `any` and throw away information."
            ),
            tips([
              "Use a generic when a function would otherwise need `any`.",
              "`keyof T` gives valid keys; `T[K]` gives the value's type.",
              "Constrain with `extends` so the implementation stays safe.",
            ]),
            inlineFill({
              id: "ts-generics-q1",
              prompt:
                "In `function pluck<T, K extends keyof T>(obj: T, key: K)`, what does `keyof T` represent?",
              accept: ["the set of valid keys of T", "set of valid keys of T", "keys of T", "the keys of t"],
              explanation:
                "`keyof T` is the union of property names on T, and `K extends keyof T` restricts K to those names — which is what makes `obj[key]` type-safe.",
            }),
            complete("Generics", "One function, many types, no information lost."),
          ],
        },
        {
          slug: "ts-practice",
          title: "Practice: A Typed Task Tracker",
          duration: 12,
          xpReward: 20,
          blocks: [
            text(
              "Time to combine the pieces. You will model a tiny task tracker with an interface for a task, a union for task status, a generic helper for grouping, and a function that summarises the list.\n\nWrite `summarize(tasks: Task[]): string` in TypeScript. It must return the count of completed tasks and the title of the first open task, or `\"none\"` when there are no open tasks. There are two graded challenges below — your code is type-checked and then run against hidden tests on the server."
            ),
            example(
              `interface Task {
  id: number;
  title: string;
  status: "open" | "done";
}

function summarize(tasks: Task[]): string {
  const done = tasks.filter((t) => t.status === "done").length;
  const firstOpen = tasks.find((t) => t.status === "open");
  return \`\${done} done, next: \${firstOpen ? firstOpen.title : "none"}\`;
}

summarize([
  { id: 1, title: "Write types", status: "done" },
  { id: 2, title: "Ship it", status: "open" },
]);  // "1 done, next: Ship it"`,
              "typescript",
              "The shape of what you are about to build"
            ),
            tips([
              "Narrow `status` with a comparison before you use task-specific fields.",
              "Return a string from every branch, or TypeScript will complain about a possibly-undefined value.",
              "Type errors are compile-time; your code still has to return the right value.",
            ]),
            challengeBlock({
              title: "Count completed tasks",
              description:
                "Implement `countDone(tasks)` in TypeScript. Return how many tasks have the status \"done\". Each task is an object with an `id`, a `title` and a `status` of \"open\" or \"done\".",
              challengeSlug: "ts-count-done",
              language: "typescript",
              functionName: "countDone",
              starterCode: `interface Task {
  id: number;
  title: string;
  status: "open" | "done";
}

function countDone(tasks: Task[]): number {
  // Your code here
}

countDone([{ id: 1, title: "a", status: "done" }]);`,
              publicTests: [
                { name: "counts one done task", input: [[{ id: 1, title: "a", status: "done" }]], expected: 1 },
                {
                  name: "ignores open tasks",
                  input: [
                    [
                      { id: 1, title: "a", status: "done" },
                      { id: 2, title: "b", status: "open" },
                    ],
                  ],
                  expected: 1,
                },
              ],
            }),
            challengeBlock({
              title: "Group by status",
              description:
                "Implement `groupByStatus(tasks)` in TypeScript. Return an object with an `open` key and a `done` key, each holding the titles of the tasks with that status, in their original order.",
              challengeSlug: "ts-group-by-status",
              language: "typescript",
              functionName: "groupByStatus",
              starterCode: `interface Task {
  id: number;
  title: string;
  status: "open" | "done";
}

function groupByStatus(tasks: Task[]): { open: string[]; done: string[] } {
  // Your code here
}

groupByStatus([{ id: 1, title: "a", status: "open" }]);`,
              publicTests: [
                {
                  name: "separates open and done titles",
                  input: [
                    [
                      { id: 1, title: "a", status: "open" },
                      { id: 2, title: "b", status: "done" },
                    ],
                  ],
                  expected: { open: ["a"], done: ["b"] },
                },
                { name: "returns empty lists for no tasks", input: [[]], expected: { open: [], done: [] } },
              ],
            }),
            complete(
              "Typed task tracker",
              "You modelled data, narrowed unions and wrote a generic-friendly helper."
            ),
          ],
        },
      ],
    },
  ],
};
