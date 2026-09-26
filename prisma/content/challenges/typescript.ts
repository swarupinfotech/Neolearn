// ============================================================
// TypeScript challenge set.
//
// These exercise the real type-erasure path: the source below contains
// interfaces, unions and type annotations, and the server strips the
// types before running the hidden tests in QuickJS.
// ============================================================

import type { ChallengeSpec } from "../pipeline";

const TASK_PRELUDE = `interface Task {
  id: number;
  title: string;
  status: "open" | "done";
}
`;

export const TYPESCRIPT_CHALLENGES: ChallengeSpec[] = [
  {
    slug: "ts-count-done",
    title: "Count completed tasks",
    description:
      "Implement `countDone(tasks)`. Given a list of tasks, return how many of them have the status \"done\". Type the parameter as an array of task objects and return a number.",
    category: "Web",
    difficulty: "Easy",
    language: "typescript",
    gradingMode: "function",
    functionName: "countDone",
    starterCode: `${TASK_PRELUDE}
function countDone(tasks: Task[]): number {
  // Your code here
}
`,
    publicTests: [
      {
        name: "counts a single done task",
        input: [[{ id: 1, title: "write types", status: "done" }]],
        expected: 1,
      },
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
    hiddenTests: [
      { name: "empty list is zero", input: [[]], expected: 0 },
      {
        name: "counts all of them",
        input: [
          [
            { id: 1, title: "a", status: "done" },
            { id: 2, title: "b", status: "done" },
            { id: 3, title: "c", status: "open" },
            { id: 4, title: "d", status: "done" },
          ],
        ],
        expected: 3,
      },
      { name: "no tasks are done", input: [[{ id: 1, title: "a", status: "open" }]], expected: 0 },
    ],
    xpReward: 30,
  },
  {
    slug: "ts-group-by-status",
    title: "Group task titles by status",
    description:
      "Implement `groupByStatus(tasks)`. Return an object with an `open` key and a `done` key, each containing the titles of the tasks with that status in their original order. Empty tasks must produce two empty arrays.",
    category: "Web",
    difficulty: "Medium",
    language: "typescript",
    gradingMode: "function",
    functionName: "groupByStatus",
    starterCode: `${TASK_PRELUDE}
function groupByStatus(tasks: Task[]): { open: string[]; done: string[] } {
  // Your code here
}
`,
    publicTests: [
      {
        name: "separates the two statuses",
        input: [
          [
            { id: 1, title: "plan", status: "open" },
            { id: 2, title: "build", status: "done" },
          ],
        ],
        expected: { open: ["plan"], done: ["build"] },
      },
      { name: "empty list yields empty arrays", input: [[]], expected: { open: [], done: [] } },
    ],
    hiddenTests: [
      {
        name: "preserves original order",
        input: [
          [
            { id: 1, title: "first", status: "open" },
            { id: 2, title: "second", status: "open" },
            { id: 3, title: "third", status: "done" },
          ],
        ],
        expected: { open: ["first", "second"], done: ["third"] },
      },
      {
        name: "handles only done tasks",
        input: [
          [
            { id: 1, title: "a", status: "done" },
            { id: 2, title: "b", status: "done" },
          ],
        ],
        expected: { open: [], done: ["a", "b"] },
      },
      {
        name: "handles only open tasks",
        input: [[{ id: 1, title: "solo", status: "open" }]],
        expected: { open: ["solo"], done: [] },
      },
      {
        name: "duplicate titles are kept",
        input: [
          [
            { id: 1, title: "x", status: "open" },
            { id: 2, title: "x", status: "open" },
          ],
        ],
        expected: { open: ["x", "x"], done: [] },
      },
    ],
    xpReward: 45,
  },
  {
    slug: "ts-summarize-tasks",
    title: "Summarize a task list",
    description:
      "Implement `summarize(tasks)`. Return the string `\"<n> done, next: <title>\"` where `<n>` is the number of completed tasks and `<title>` is the title of the first open task. When there is no open task, use `\"none\"` instead of a title.",
    category: "Algorithms",
    difficulty: "Hard",
    language: "typescript",
    gradingMode: "function",
    functionName: "summarize",
    starterCode: `${TASK_PRELUDE}
function summarize(tasks: Task[]): string {
  // Your code here
}
`,
    publicTests: [
      {
        name: "reports the next open task",
        input: [
          [
            { id: 1, title: "write types", status: "done" },
            { id: 2, title: "ship it", status: "open" },
          ],
        ],
        expected: "1 done, next: ship it",
      },
      { name: "empty list", input: [[]], expected: "0 done, next: none" },
    ],
    hiddenTests: [
      { name: "nothing done", input: [[{ id: 1, title: "a", status: "open" }]], expected: "0 done, next: a" },
      {
        name: "everything done",
        input: [
          [
            { id: 1, title: "a", status: "done" },
            { id: 2, title: "b", status: "done" },
          ],
        ],
        expected: "2 done, next: none",
      },
      {
        name: "picks the first open task in order",
        input: [
          [
            { id: 1, title: "later", status: "open" },
            { id: 2, title: "earlier", status: "open" },
            { id: 3, title: "closed", status: "done" },
          ],
        ],
        expected: "1 done, next: later",
      },
      {
        name: "ignores titles containing commas",
        input: [[{ id: 1, title: "a, b", status: "open" }]],
        expected: "0 done, next: a, b",
      },
    ],
    xpReward: 60,
  },
];
