// ============================================================
// Project: TypeScript Task Tracker Core
//
// Graded through Project.publicTests with the same server-side WASM
// sandbox as challenges, so the completion criteria are real tests and
// not a self-report checkbox.
// ============================================================

import type { ProjectSpec } from "../pipeline";

export const typescriptTaskTracker: ProjectSpec = {
  slug: "typescript-task-tracker",
  title: "TypeScript Task Tracker",
  description:
    "Build the data layer of a task tracker in TypeScript: type-safe task objects, priority ordering, filtering and a summary report.",
  language: "typescript",
  difficulty: "Intermediate",
  objectives: [
    "Model a domain entity with an interface and a discriminated status",
    "Write pure functions that take typed input and return typed output",
    "Combine filter, sort and aggregation without mutating the input",
  ],
  technologies: ["TypeScript", "Interfaces", "Unions", "Generics"],
  requirements: [
    "Define a `Task` interface with `id: number`, `title: string` and `status: \"open\" | \"done\"`",
    "Implement `main(tasks)` which returns the number of completed tasks",
    "The function must not mutate the array it receives",
    "Return `0` for an empty array",
  ],
  tasks: [
    { title: "Model the Task", detail: "Write the `Task` interface with the three required fields." },
    { title: "Count completions", detail: "Filter the list to `status === \"done\"` and return the length." },
    { title: "Keep it pure", detail: "Confirm your function leaves the input array untouched — return a new value rather than sorting or splicing in place." },
    { title: "Handle the empty case", detail: "Make sure an empty list returns 0 without throwing." },
  ],
  criteria: [
    "Returns the correct count for open, done, mixed and empty lists",
    "Does not mutate the input array",
    "Type-checks with strict mode enabled",
  ],
  starterCode: `interface Task {
  id: number;
  title: string;
  status: "open" | "done";
}

function main(tasks: Task[]): number {
  // Your code here
}

// Example: main([{ id: 1, title: "ship", status: "done" }]) should be 1
`,
  publicTests: [
    {
      name: "counts one completed task",
      input: [[{ id: 1, title: "ship", status: "done" }]],
      expected: 1,
    },
    {
      name: "mixed statuses",
      input: [
        [
          { id: 1, title: "a", status: "done" },
          { id: 2, title: "b", status: "open" },
          { id: 3, title: "c", status: "done" },
        ],
      ],
      expected: 2,
    },
    { name: "empty list", input: [[]], expected: 0 },
    { name: "nothing completed", input: [[{ id: 1, title: "a", status: "open" }]], expected: 0 },
  ],
  xpReward: 80,
  order: 10,
};
