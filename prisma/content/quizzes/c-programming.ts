// ============================================================
// Quizzes for C Programming Fundamentals.
//
// C cannot be executed by the platform's sandbox, so every graded
// question here is one the platform *can* judge: what a snippet prints
// (OUTPUT), which line is at fault (DEBUGGING), or a concept judgement
// (MCQ / TRUE_FALSE / FILL). OUTPUT and DEBUGGING are graded server-side
// by the existing quiz service, so none of this is self-marked.
//
// Four quizzes:
//   1. COURSE  — the credential for the course, 10 questions, 70% to pass
//   2–4. PRACTICE — one set per difficulty (Easy / Medium / Hard), each
//      five questions, no effect on course completion
//
// `correctAnswer` follows the existing seed convention: an array, with
// MCQ/TRUE_FALSE/DEBUGGING holding the option index as a string, OUTPUT
// holding the exact printed text, and FILL holding accepted spellings.
// ============================================================

import type { QuestionSpec, QuizSpec } from "../pipeline";

export interface QuizBundle {
  spec: QuizSpec;
  questions: QuestionSpec[];
}

const C_COURSE_QUIZ: QuizBundle = {
  spec: {
    slug: "c-programming-fundamentals-assessment",
    title: "C Programming Fundamentals Assessment",
    description:
      "Eleven questions across types, operators, functions, arrays, pointers, strings, structs, files and the standard library. Passing scores 70% and awards the course credential.",
    type: "COURSE",
    courseSlug: "c-programming-fundamentals",
    passingScore: 70,
    xpReward: 60,
    order: 1,
  },
  questions: [
    {
      type: "OUTPUT",
      prompt: "What does this print?",
      code: `#include <stdio.h>
int main(void) {
    int a = 10, b = 3;
    printf("%d\\n", a % b * 2);
    return 0;
}`,
      correctAnswer: ["2"],
      explanation:
        "`%` and `*` have the same precedence and bind left to right, so this is `(10 % 3) * 2` = 1 * 2 = 2.",
      points: 10,
    },
    {
      type: "OUTPUT",
      prompt: "What does this print?",
      code: `#include <stdio.h>
#include <string.h>
int main(void) {
    char s[] = "hello";
    printf("%d\\n", (int)strlen(s));
    return 0;
}`,
      correctAnswer: ["5"],
      explanation:
        "strlen counts characters before the terminating null byte, and \"hello\" has five. The `\\0` makes the array six bytes long, but it is not counted.",
      points: 10,
    },
    {
      type: "OUTPUT",
      prompt: "What does this print?",
      code: `#include <stdio.h>
struct point { int x, y; };
int main(void) {
    struct point p = {3, 4};
    printf("%d\\n", p.x * p.x + p.y * p.y);
    return 0;
}`,
      correctAnswer: ["25"],
      explanation: "3² + 4² = 9 + 16 = 25. Member access with `.` needs no pointer, and the initialiser `{3, 4}` fills the members in declaration order.",
      points: 10,
    },
    {
      type: "MCQ",
      prompt:
        "`char` is guaranteed by the C standard to be exactly 8 bits wide. True or false — and what is the portable question to ask instead?",
      options: [
        "True; `char` is defined as 8 bits",
        "False; `char` is *at least* 8 bits, and the real question is `CHAR_BIT`",
        "True on every platform except Windows",
        "False; `char` is always 16 bits",
      ],
      correctAnswer: ["1"],
      explanation:
        "C requires `char` to be at least 8 bits, and `sizeof(char)` is always 1 by definition — but a byte is only 8 bits when `CHAR_BIT` is 8. That is the portable question, and it is the reason `int` widths are never assumed.",
      points: 15,
    },
    {
      type: "MCQ",
      prompt: "What does `calloc` do that `malloc` does not?",
      options: [
        "It never fails — it returns zeroed memory or aborts",
        "It zero-initialises the memory it returns",
        "It returns memory on the stack instead of the heap",
        "It frees the previous allocation automatically",
      ],
      correctAnswer: ["1"],
      explanation:
        "`calloc(n, size)` sets every byte to zero. `malloc(n * size)` returns indeterminate contents. `calloc` can still fail, and it can still be wrong to assume the memory is *always* zeroed if you reuse a block that was already dirty.",
      points: 10,
    },
    {
      type: "MCQ",
      prompt: "Why is this program's output not predictable, even though it looks harmless?",
      code: `int values[3] = {1, 2, 3};
printf("%d\\n", values[3]);`,
      options: [
        "Because `values[3]` is always 0 and the answer depends on the compiler's mood",
        "Because `values[3]` is out of bounds — the array has indices 0 to 2, so this is undefined behaviour",
        "Because `printf` cannot print the last element of an array",
        "Because array indices start at 1",
      ],
      correctAnswer: ["1"],
      explanation:
        "Valid indices are 0, 1 and 2. Reading index 3 is undefined behaviour: it may print anything, and the compiler is entitled to assume it cannot happen, so it can remove the read entirely.",
      points: 15,
    },
    {
      type: "TRUE_FALSE",
      prompt: "A non-`main` function with a return type of `int` that never executes a `return` statement returns 0.",
      correctAnswer: ["1"],
      explanation:
        "False. Falling off the end of `main` is defined to return 0, but for every other function it yields an indeterminate value. With modern compilers it usually looks like it returns whatever happens to be in the return register.",
      points: 10,
    },
    {
      type: "TRUE_FALSE",
      prompt: "Writing through a pointer to a string literal is undefined behaviour.",
      correctAnswer: ["0"],
      explanation:
        "True. String literals have static storage duration and are typically placed in read-only memory, so modifying one is undefined behaviour — and a segfault at best. `char *s = \"abc\"` should be `const char *s = \"abc\"`.",
      points: 10,
    },
    {
      type: "DEBUGGING",
      prompt:
        "This is meant to read an integer out of a file, but the value is never read correctly. What is wrong?",
      code: `#include <stdio.h>

int main(void) {
    FILE *f = fopen("data.txt", "w");
    if (f == NULL) return 1;

    int n;
    if (fscanf(f, "%d", &n) != 1) {
        printf("no number\\n");
    }
    fclose(f);
    return 0;
}`,
      options: [
        "`fscanf` needs the file opened with `\"a\"` instead of `\"w\"`",
        "The file is opened for writing, so it is truncated to empty and there is nothing to read — open it with `\"r\"` to read, and `\"w\"` only to write",
        "`fscanf` cannot be used on a `FILE *` obtained from `fopen`",
        "`fclose` must come before `fscanf`",
      ],
      correctAnswer: ["1"],
      explanation:
        "Mode `\"w\"` creates or truncates the file and gives you a write-only stream, so the read has nothing to read. Reading requires `\"r\"`. This is why opening a file you meant to read in `\"w\"` is such a reliable way to destroy data.",
      points: 15,
    },
    {
      type: "DEBUGGING",
      prompt: "This function is supposed to return the length of a string. What is the bug?",
      code: `#include <stdio.h>
int length(const char *s) {
    int n = 0;
    while (*s) {
        n++;
    }
    return n;
}`,
      options: [
        "`while (*s)` should be `while (s)`",
        "The pointer is never advanced, so the loop never terminates",
        "`n` should be a `size_t`",
        "The function should take `char *` instead of `const char *`",
      ],
      correctAnswer: ["1"],
      explanation:
        "The loop tests the same first character forever because `s` is never incremented. The fix is `n++; s++;`. The parameter is a copy of the pointer, so advancing it is safe and does not affect the caller.",
      points: 15,
    },
    {
      type: "FILL",
      prompt: "Which function releases memory obtained from `malloc`?",
      correctAnswer: ["free", "free()", "the free function", "stdlib's free"],
      explanation:
        "`free(ptr)` returns the block to the allocator. Every successful `malloc`, `calloc` and `realloc` needs exactly one matching `free`, and using the pointer afterwards is a dangling-pointer bug.",
      points: 10,
    },
  ],
};

const C_PRACTICE_FOUNDATIONS: QuizBundle = {
  spec: {
    slug: "c-practice-foundations",
    title: "C Practice Set 1 — Foundations",
    description:
      "Easy. Integer division, the limits of `char`, and what pass-by-value means when a function tries to change its argument. Untimed practice; it does not affect course completion.",
    type: "PRACTICE",
    courseSlug: "c-programming-fundamentals",
    passingScore: 60,
    xpReward: 20,
    order: 2,
  },
  questions: [
    {
      type: "OUTPUT",
      prompt: "What does this print?",
      code: `#include <stdio.h>
int main(void) {
    int x = 7;
    printf("%d\\n", x / 2);
    return 0;
}`,
      correctAnswer: ["3"],
      explanation:
        "Both operands are `int`, so this is integer division: 3 with the remainder discarded. Writing `7 / 2.0` would give 3.5 instead — the type of the operands, not the value, decides the division.",
      points: 10,
    },
    {
      type: "MCQ",
      prompt: "What does `printf(\"%d\\n\", 7 / 2.0);` print?",
      options: [
        "3 — `%d` converts the double 3.5 to the integer 3",
        "3.5 — `%d` prints doubles correctly",
        "4 — the value is rounded to the nearest integer",
        "It is undefined behaviour",
      ],
      correctAnswer: ["0"],
      explanation:
        "The division is done in `double` and yields 3.5. Passing a `double` to `%d` is undefined behaviour by the standard, even though every mainstream ABI passes it in a way that makes it print 3. Use `%f`, or cast deliberately.",
      points: 15,
    },
    {
      type: "OUTPUT",
      prompt: "What does this print?",
      code: `#include <stdio.h>
int main(void) {
    int a = 5, b = 2;
    printf("%d\\n", a % b);
    return 0;
}`,
      correctAnswer: ["1"],
      explanation: "`%` is the remainder operator, and 5 % 2 is 1. It is only defined for integers, which is another reason `char` arithmetic and `int` arithmetic behave differently in places.",
      points: 10,
    },
    {
      type: "TRUE_FALSE",
      prompt: "Calling a function with `twice(x)` and having that function assign to its parameter changes the caller's `x`.",
      correctAnswer: ["1"],
      explanation:
        "False. C passes every argument by value, so the function receives a copy. To change the caller's variable you must pass its address — and that is the bridge to the pointer half of the course.",
      points: 10,
    },
    {
      type: "DEBUGGING",
      prompt: "This is supposed to double a number held by the caller. What is the bug?",
      code: `#include <stdio.h>
void twice(int n) {
    n = n * 2;
}
int main(void) {
    int x = 5;
    twice(x);
    printf("%d\\n", x);
    return 0;
}`,
      options: [
        "`twice` must be declared `int` because it modifies a value",
        "`twice` assigns to its own copy of the argument, so `x` is still 5 when it is printed",
        "`printf` is reading `x` before `twice` has finished",
        "`n * 2` overflows for small values",
      ],
      correctAnswer: ["1"],
      explanation:
        "The multiplication works fine — it just happens to a copy. `void` is also correct here, because the function communicates nothing through a return value. The fix is `void twice(int *n)` with `*n = *n * 2;` called as `twice(&x);`.",
      points: 15,
    },
  ],
};

const C_PRACTICE_POINTERS: QuizBundle = {
  spec: {
    slug: "c-practice-pointers",
    title: "C Practice Set 2 — Pointers and Memory",
    description:
      "Medium. Dereferencing, pointer arithmetic, heap allocation and the boundary mistake that turns a three-element array into undefined behaviour.",
    type: "PRACTICE",
    courseSlug: "c-programming-fundamentals",
    passingScore: 60,
    xpReward: 20,
    order: 3,
  },
  questions: [
    {
      type: "OUTPUT",
      prompt: "What does this print?",
      code: `#include <stdio.h>
int main(void) {
    int a = 5;
    int *p = &a;
    *p = 10;
    printf("%d\\n", a);
    return 0;
}`,
      correctAnswer: ["10"],
      explanation:
        "`p` holds the address of `a`, so writing through `*p` writes to `a` itself. This is the whole point of pointers: two names for the same object.",
      points: 10,
    },
    {
      type: "OUTPUT",
      prompt: "What does this print?",
      code: `#include <stdio.h>
int main(void) {
    int arr[3] = {1, 2, 3};
    int *p = arr;
    printf("%d\\n", *(p + 1));
    return 0;
}`,
      correctAnswer: ["2"],
      explanation:
        "`arr` decays to a pointer to its first element, and pointer arithmetic is scaled: `p + 1` is the address one `int` past `arr[0]`, which holds 2. Adding 1 advances by `sizeof(int)`, not by one byte.",
      points: 10,
    },
    {
      type: "OUTPUT",
      prompt: "What does this print?",
      code: `#include <stdio.h>
#include <stdlib.h>
int main(void) {
    int *p = malloc(sizeof(int) * 3);
    for (int i = 0; i < 3; i++) p[i] = i * i;
    printf("%d\\n", p[2]);
    free(p);
    return 0;
}`,
      correctAnswer: ["4"],
      explanation:
        "`p[2]` is the third element, and 2 * 2 is 4. Note the allocation size is written as `sizeof(int) * 3` rather than `3` — a hard-coded element count in a `malloc` call is one of the most common bugs in C.",
      points: 10,
    },
    {
      type: "MCQ",
      prompt: "What does `free(NULL)` do?",
      options: [
        "It crashes, because NULL is not a pointer",
        "It is defined to do nothing and is safe to call",
        "It frees the first block in the heap",
        "It is only legal in C++",
      ],
      correctAnswer: ["1"],
      explanation:
        "The standard requires `free(NULL)` to be a no-op, so the `if (p) free(p);` dance is unnecessary — `free(p)` is enough and is correct whether or not `p` is NULL. What is not safe is using `p` *after* the free.",
      points: 10,
    },
    {
      type: "DEBUGGING",
      prompt: "This is meant to print the three values in the array. What is the bug?",
      code: `#include <stdio.h>
int main(void) {
    int values[3] = {1, 2, 3};
    for (int i = 0; i <= 3; i++) {
        printf("%d\\n", values[i]);
    }
    return 0;
}`,
      options: [
        "`i` should start at 1",
        "The loop condition reads `values[3]`, one past the end of a three-element array — it should be `i < 3`",
        "`printf` needs `\\n` before the value",
        "The array should be declared `int values[4]` to hold one more element",
      ],
      correctAnswer: ["1"],
      explanation:
        "The condition `i <= 3` lets `i` reach 3, and index 3 is out of bounds. The read is undefined behaviour: it may print a fourth number, garbage, or nothing at all, depending on what happens to sit after the array.",
      points: 15,
    },
  ],
};

const C_PRACTICE_UNDEFINED: QuizBundle = {
  spec: {
    slug: "c-practice-undefined-behaviour",
    title: "C Practice Set 3 — Defined Behaviour and Undefined Behaviour",
    description:
      "Hard. The cases where C stops promising an answer at all: uninitialised reads, signed overflow, buffer overruns and macros that do not do what they look like.",
    type: "PRACTICE",
    courseSlug: "c-programming-fundamentals",
    passingScore: 60,
    xpReward: 20,
    order: 4,
  },
  questions: [
    {
      type: "MCQ",
      prompt: "What is wrong with this?",
      code: `int total;
for (int i = 0; i < 5; i++) {
    total += i;
}
printf("%d\\n", total);`,
      options: [
        "Nothing — `total` is zero at the start of every program",
        "`total` is uninitialised, so reading it is undefined behaviour; the compiler may assume it is never read and delete the whole loop",
        "`total` should be `long` because the loop can exceed 16 bits",
        "`+=` is not valid for `int`",
      ],
      correctAnswer: ["1"],
      explanation:
        "A local `int` with no initialiser holds an indeterminate value. Reading it is undefined behaviour, and because the compiler may assume the program never reads an uninitialised variable, it can optimise the loop away entirely.",
      points: 15,
    },
    {
      type: "MCQ",
      prompt: "What does `#define SQUARE(x) x * x` followed by `SQUARE(2 + 3)` evaluate to?",
      options: [
        "25 — the value you intended",
        "11 — the value textual substitution actually produces",
        "13",
        "It fails to compile",
      ],
      correctAnswer: ["1"],
      explanation:
        "The macro substitutes text, giving `2 + 3 * 2 + 3`. Multiplication binds tighter, so that is 2 + 6 + 3 = 11. `#define SQUARE(x) ((x) * (x))` gives the intended 25 — and even then, `SQUARE(i++)` would increment `i` twice, so a `static inline` function is the safer tool.",
      points: 15,
    },
    {
      type: "OUTPUT",
      prompt: "What does this print?",
      code: `#include <stdio.h>
int main(void) {
    unsigned char c = 255;
    c = c + 1;
    printf("%d\\n", c);
    return 0;
}`,
      correctAnswer: ["0"],
      explanation:
        "Unsigned arithmetic wraps by definition, so 256 becomes 0. The same code with `signed char` or `int` would be signed overflow, which is undefined behaviour — the difference is the type, not the value.",
      points: 10,
    },
    {
      type: "TRUE_FALSE",
      prompt: "Adding 1 to an `int` whose value is `INT_MAX` has defined wrap-around behaviour.",
      correctAnswer: ["1"],
      explanation:
        "False. Signed overflow is undefined behaviour, not wrap-around. `INT_MAX + 1` may wrap in practice, may be optimised away, and may trap — a program that relies on it is relying on the absence of a guarantee. Cast to `unsigned` first if you want defined wrapping.",
      points: 10,
    },
    {
      type: "DEBUGGING",
      prompt: "This is meant to copy a string into a fixed buffer. What is the bug?",
      code: `#include <string.h>
void copy_name(char dest[8]) {
    strcpy(dest, "Ada Lovelace");
}`,
      options: [
        "`strcpy` cannot be used inside a function",
        "The parameter decays to a pointer, so the `8` is ignored and the 13-byte literal overruns the 8-byte buffer — undefined behaviour",
        "`dest` must be declared `char *dest` without the size",
        "The string is too long for `strcpy` but `strncpy` would be safe here too",
      ],
      correctAnswer: ["1"],
      explanation:
        "In a parameter, `char dest[8]` is exactly `char *dest` — the size is documentation, not enforcement. `strcpy` writes until it finds a null byte, so it runs past the end of the caller's array. `snprintf`, or `strncpy` with an explicit truncation, is the fix.",
      points: 15,
    },
  ],
};

export const C_QUIZZES: QuizBundle[] = [
  C_COURSE_QUIZ,
  C_PRACTICE_FOUNDATIONS,
  C_PRACTICE_POINTERS,
  C_PRACTICE_UNDEFINED,
];
