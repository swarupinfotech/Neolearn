// ============================================================
// C challenge set — graded from captured stdout.
//
// C has no in-browser runtime, so every challenge here is
// `gradingMode: "stdout"`: the learner compiles and runs the program
// locally, then pastes what it prints for each hidden input. The server
// compares it against the hidden expected output, which is never sent to
// the browser.
//
// The three difficulties map to the course's arc:
//   Easy    — reading input and printing (Module 1–2)
//   Medium  — arrays and loops (Module 4)
//   Hard    — strings, pointers and character arithmetic (Module 4)
//
// `expected` values are single-line on purpose: the stdout grader
// normalises CRLF, trailing spaces and a trailing newline, so a correct
// program passes regardless of how its final newline is written.
// ============================================================

import type { ChallengeSpec } from "../pipeline";

export const C_CHALLENGES: ChallengeSpec[] = [
  {
    slug: "c-sum-two-integers",
    title: "Add two integers from input",
    description:
      "Read two integers from standard input, separated by any whitespace, and print their sum on one line. The two numbers may be negative, and the test inputs also put them on separate lines — scanf(\"%d %d\") handles both without any change to your program.",
    category: "Programming",
    difficulty: "Easy",
    language: "c",
    gradingMode: "stdout",
    inputFormat: "Two integers separated by whitespace, for example `3 4` or `3\\n4`.",
    starterCode: `#include <stdio.h>

int main(void) {
    int a, b;

    /* Read the two integers, then print their sum. */

    return 0;
}
`,
    publicTests: [
      { name: "two positive numbers", stdin: "3 4\n", expected: "7" },
      { name: "one negative operand", stdin: "-5 2\n", expected: "-3" },
    ],
    hiddenTests: [
      { name: "both zero", stdin: "0 0\n", expected: "0" },
      { name: "values in the thousands", stdin: "1000000 2000000\n", expected: "3000000" },
      { name: "operands on separate lines", stdin: "10\n20\n", expected: "30" },
    ],
    xpReward: 30,
  },
  {
    slug: "c-array-stats",
    title: "Minimum, maximum and sum of a list",
    description:
      "The first number on standard input is n, the count of values that follow. Read those n integers and print three things on a single line separated by one space: the smallest value, the largest value and their sum, in that order.\n\nPrint `5 5 5` for a single-element list, and handle negative values. Store the values in an array, and be careful that your running total is initialised to zero — an uninitialised int is the classic way to get this wrong.",
    category: "Programming",
    difficulty: "Medium",
    language: "c",
    gradingMode: "stdout",
    inputFormat: "n, then n integers, separated by whitespace: `3\\n4 1 7`.",
    starterCode: `#include <stdio.h>

int main(void) {
    int n;

    if (scanf("%d", &n) != 1) return 0;

    /* Read the n values, then print: min max sum */

    return 0;
}
`,
    publicTests: [
      { name: "three unsorted values", stdin: "3\n4 1 7\n", expected: "1 7 12" },
      { name: "a single value", stdin: "1\n5\n", expected: "5 5 5" },
    ],
    hiddenTests: [
      { name: "every value is the same", stdin: "4\n2 2 2 2\n", expected: "2 2 8" },
      { name: "all values negative", stdin: "3\n-4 -9 -1\n", expected: "-9 -1 -14" },
      { name: "ten values in order", stdin: "10\n1 2 3 4 5 6 7 8 9 10\n", expected: "1 10 55" },
    ],
    xpReward: 40,
  },
  {
    slug: "c-caesar-cipher",
    title: "Caesar cipher",
    description:
      "The first line of standard input is an integer k. The second line is a line of text. Shift every lowercase letter in that line forward by k positions, wrapping round from z to a, and leave every other character — spaces, digits, punctuation — exactly as it was. Print the transformed line.\n\nk is not guaranteed to be less than 26, so reduce it first: a shift of 29 is the same as a shift of 3. Work on the buffer in place through a pointer rather than building a second string, and remember that adding to a `char` promotes it to `int` before it is stored back.",
    category: "Programming",
    difficulty: "Hard",
    language: "c",
    gradingMode: "stdout",
    inputFormat: "An integer k on the first line, then one line of text.",
    starterCode: `#include <stdio.h>
#include <string.h>

int main(void) {
    int k;
    char line[256];

    if (scanf("%d", &k) != 1) return 0;
    /* consume the rest of the first line before reading the text */
    if (fgets(line, sizeof line, stdin) == NULL) return 0;
    if (fgets(line, sizeof line, stdin) == NULL) return 0;

    /* Shift each lowercase letter by k, wrapping at z, then print line. */

    return 0;
}
`,
    publicTests: [
      { name: "shift by three", stdin: "3\nhello\n", expected: "khoor" },
      { name: "wraps past z", stdin: "1\nzebra\n", expected: "afcsb" },
    ],
    hiddenTests: [
      { name: "a shift of zero changes nothing", stdin: "0\nneo learn\n", expected: "neo learn" },
      { name: "a shift of twenty-six is the identity", stdin: "26\ncipher\n", expected: "cipher" },
      { name: "a shift larger than the alphabet wraps more than once", stdin: "29\nabc\n", expected: "def" },
    ],
    xpReward: 50,
  },
];
