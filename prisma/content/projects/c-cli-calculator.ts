// ============================================================
// Project: Command-line calculator in C
//
// C cannot run inside the in-browser sandbox, so this project is graded
// from captured stdout: the learner builds and runs the program locally,
// then submits the output for each required case. The server compares
// those against `publicTests[].expected`.
//
// The cases are part of the specification, not hidden tests — the project
// page shows each input and its expected output, because for a project the
// point is the build, not the guessing. The "How this project is graded"
// panel states the limit plainly: the output you record is verified, the
// program that produced it is not.
// ============================================================

import type { ProjectSpec } from "../pipeline";

export const cCliCalculator: ProjectSpec = {
  slug: "c-cli-calculator",
  title: "Command-line Calculator in C",
  description:
    "Build a line-oriented calculator: read `<number> <operator> <number>` lines from standard input until end of file, evaluate each one, and print one result per line.",
  language: "c",
  difficulty: "Beginner",
  objectives: [
    "Read structured input safely with fgets and parse it with the strtol family",
    "Evaluate a small grammar with a switch statement and a loop over lines",
    "Handle malformed input and end-of-file as normal cases rather than crashes",
  ],
  technologies: ["C", "stdio.h", "stdlib.h", "string.h", "strtol", "fgets"],
  requirements: [
    "Read lines from standard input until end of file using `fgets` into a fixed buffer",
    "Each line has the form `<integer> <operator> <integer>`, where the operator is exactly one of `+`, `-` or `*`",
    "Print the result of each expression on its own line, in input order",
    "Print exactly `error` on its own line for any line that does not match the grammar",
    "Ignore leading, trailing and repeated whitespace, so `  7   +   8  ` is valid",
    "Handle negative operands such as `-5 * 4`",
    "Stop cleanly at end of input — no infinite loop, no out-of-bounds read",
    "Compile cleanly with `gcc -Wall -Wextra -std=c11 -o calc calc.c` and no warnings",
  ],
  tasks: [
    {
      title: "Read one line at a time",
      detail:
        "Use `fgets` in a `while` loop. `fgets` returns NULL at end of file, which is your loop condition — never index past the terminator it writes.",
    },
    {
      title: "Parse the three fields",
      detail:
        "`strtol` gives you the first number and reports where it stopped parsing, so you can skip whitespace to the operator and then parse the second number. Check each return value instead of assuming success.",
    },
    {
      title: "Evaluate with a switch",
      detail: "One `switch` over the operator with cases for `+`, `-` and `*`, and a `default` that reports the error case.",
    },
    {
      title: "Make the error path first-class",
      detail:
        "A malformed line is normal input, not an exception. Print `error` and carry on with the next line rather than bailing out.",
    },
    {
      title: "Compile with warnings on",
      detail:
        "Build with `gcc -Wall -Wextra -std=c11 -o calc calc.c`. Fix every warning — the ones about uninitialised values and unused results are the ones that bite later.",
    },
  ],
  criteria: [
    "The recorded output for every required case matches the specification",
    "The server checks the output you submit, not your source: Neolearn cannot execute C, so review your own code against the requirements before submitting",
    "No compiler warnings under -Wall -Wextra",
  ],
  starterCode: `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Evaluate one line of the form "<int> <op> <int>".
   Returns 1 and writes the result on success, 0 on a malformed line. */
static int evaluate(const char *line, long *out) {
    /* Your code here */
    return 0;
}

int main(void) {
    char line[256];

    while (fgets(line, sizeof line, stdin) != NULL) {
        long result;
        if (evaluate(line, &result)) {
            printf("%ld\\n", result);
        } else {
            printf("error\\n");
        }
    }
    return 0;
}
`,
  publicTests: [
    { name: "a single addition", stdin: "2 + 3\n", expected: "5" },
    {
      name: "several expressions keep input order",
      stdin: "2 + 3\n10 - 4\n6 * 7\n",
      expected: "5\n6\n42",
    },
    { name: "an unknown operator is reported, not crashed on", stdin: "2 ? 3\n", expected: "error" },
    { name: "negative operands", stdin: "-5 * 4\n", expected: "-20" },
    { name: "extra whitespace is tolerated", stdin: "7   +    8   \n", expected: "15" },
  ],
  xpReward: 80,
  order: 10,
};
