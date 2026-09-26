// ============================================================
// C Programming Fundamentals
//
// Delivery note: this platform's browser sandbox runs Python, JS/TS and
// SQL only, so C has no executable runtime here. Rather than ship
// challenges that cannot run, the practice work is delivered as
// `inlineOutput` blocks — the learner reads C and commits to what it
// prints — plus `inlineMcq` debugging and concept questions. Examples are
// shown read-only. Grading is on the reasoning, which is the part that
// actually matters in C.
//
// The same constraint shapes the course's graded material:
//   * quizzes/c-programming.ts   — a COURSE assessment plus three
//     practice sets (easy / medium / hard) built from OUTPUT and
//     DEBUGGING questions, which the existing runner and server grader
//     already support.
//   * projects/c-cli-calculator.ts — a `self_review` project. The learner
//     builds and runs it locally against a required set of cases, then
//     submits the source and the recorded output. The platform states
//     plainly that it cannot execute C rather than implying a test ran.

// ============================================================

import {
  text,
  example,
  tips,
  inlineMcq,
  inlineTrueFalse,
  inlineOutput,
  complete,
} from "../pipeline";
import type { CourseSpec } from "../pipeline";

export const cFundamentals: CourseSpec = {
  slug: "c-programming-fundamentals",
  title: "C Programming Fundamentals",
  description:
    "Learn C from first principles: types and control flow, functions, then the part that makes C different — arrays, pointers and manual memory.",
  longDescription:
    "C is a small language with a lot of consequences. There is no garbage collector, no bounds checking on arrays, and nothing stops you from writing to memory you do not own. That is exactly why it is worth learning: once you understand how memory actually works, the behaviour of almost every other systems language stops being mysterious.\n\nThis course builds C from the ground up. You start with the type system and control flow, move into functions and how scope actually works, and then spend real time on pointers — the concept C is famous for, and the one that trips up nearly everyone exactly once. After pointers you will be comfortable with structs, dynamic allocation and the standard library.\n\nThe emphasis throughout is on what the language *guarantees*. In C, the difference between correct and incorrect code is often whether the behaviour was defined at all, and learning to see that difference is the whole skill.",
  objectives: [
    "Write, compile and run a C program and explain what each part does",
    "Predict the output of any C expression involving integer promotion, overflow or operator precedence",
    "Explain what a pointer is, what it points at, and why dangling pointers are dangerous",
    "Allocate and free heap memory correctly, and recognise a leak or double free",
    "Read and write C strings safely, and explain why strcpy on a fixed buffer is risky",
    "Distinguish code with defined behaviour from code that merely happens to work",
  ],
  category: "Programming",
  language: "C",
  technology: "C",
  tags: ["C", "Systems Programming", "Memory", "Pointers"],
  difficulty: "Beginner",
  icon: "Terminal",
  color: "#5c7c9a",
  xpReward: 160,
  students: 840,
  rating: 4.5,
  order: 10,
  modules: [
    {
      title: "Getting Started with C",
      lessons: [
        {
          slug: "c-what-is-c",
          title: "What C Is and Why It Still Matters",
          duration: 6,
          xpReward: 10,
          blocks: [
            text(
              "C was created at Bell Labs in 1972 to replace an assembly-language operating system with something a human could read. Fifty years later it is still the language that sits underneath most of the software you use: the Linux kernel, the Python interpreter you are learning with, the browser engine, the Redis server, the firmware in your router.\n\nThe reason is a trade-off. C is small. It has a handful of control structures, a small standard library defined by the standard rather than the implementation, and a specification precise enough that a conforming implementation could be written in a few hundred pages. In exchange, C gives you almost nothing above the hardware: no bounds checking, no memory manager, no runtime. What you write maps closely onto what the processor does."
            ),
            text(
              "That closeness is the whole point and the whole hazard. A C program cannot hide a mistake from you. When you index an array one past the end, the language does not object — it computes an address and reads it. Whether the program crashes, silently corrupts something, or appears to work depends on what happened to be in memory. This is why C is taught with so much attention to *defined* behaviour: knowing what the standard promises is the difference between programming C and guessing at it."
            ),
            example(
              `#include <stdio.h>

int main(void) {
    printf("Hello, world\\n");
    return 0;
}`,
              "c",
              "The smallest complete C program"
            ),
            text(
              "Four parts matter here. `#include <stdio.h>` pulls in declarations for the standard I/O functions; without it the compiler has never heard of `printf`. `int main(void)` is the entry point, and the `void` says it takes no arguments. The braces delimit a *block* of statements. `return 0` tells the operating system the program finished successfully — the value becomes the process exit status."
            ),
            tips([
              "C is case sensitive: printf and Printf are different identifiers.",
              "Every statement ends with a semicolon. The classic beginner error.",
              "Declarations tell the compiler the type and name; definitions actually reserve storage.",
            ]),
            inlineMcq({
              id: "c-what-is-c-q1",
              prompt:
                "Why does the C standard exist at all, given C is an old language?",
              options: [
                "To make sure every C compiler behaves the same way for portable code",
                "To require compilers to be written in C",
                "To standardise the standard library only, leaving the language itself undefined",
                "To forbid compiler optimisations",
              ],
              correct: 0,
              explanation:
                "The standard defines both the language and a required library subset. It exists so that code written to the standard behaves identically on any conforming implementation, which is what makes C code portable between operating systems and CPU families.",
            }),
            complete(
              "Module 1 checkpoint",
              "You can now explain what a C program is made of and why the language defines behaviour so precisely."
            ),
          ],
        },
        {
          slug: "c-compile-run",
          title: "Compiling and Running",
          duration: 7,
          xpReward: 10,
          blocks: [
            text(
              "C is a compiled language. A compiler translates your source into machine code before anything runs. The pipeline has distinct stages, and knowing what each one does explains most of the errors you will meet."
            ),
            example(
              `int main(void) {
    int x = 5;              /* 1. source */
    return 0;
}`,
              "c",
              "Source, before any compiler runs"
            ),
            text(
              "**Preprocessing.** Text beginning with `#` is handled first. `#include` pastes the contents of another file in; `#define` performs macro substitution. This happens before the compiler proper sees the code, which is why a missing semicolon or a stray `#` can produce errors that point at a line you never wrote.\n\n**Compilation.** The code is parsed and type-checked. Declarations are resolved, function calls are matched to definitions, and the result is assembly. This is where most of your mistakes get caught.\n\n**Assembly.** A low-level human-readable form of machine instructions.\n\n**Linking.** Object files are combined, and any function you called but did not define is matched to a library — this is where `printf` gets found."
            ),
            example(
              `gcc -Wall -Wextra -std=c11 -o hello hello.c

// -Wall -Wextra : enable warnings (do this always)
// -std=c11      : pin the language standard
// -o hello      : name the output binary`,
              "bash",
              "A compiler invocation worth memorising"
            ),
            text(
              "Always compile with `-Wall -Wextra`. A warning is the compiler telling you something is suspicious but legal — which in C is often exactly the class of bug you care about: an uninitialised variable, a comparison between signed and unsigned, a function whose return value you ignored. The `-Wunused-result` warning catches forgotten `malloc` failure checks."
            ),
            inlineOutput({
              id: "c-compile-run-q1",
              prompt: "What does this program print?",
              code: `#include <stdio.h>
int main(void) {
    printf("A");
    printf("B\\n");
    return 0;
}`,
              accept: ["AB"],
              explanation:
                "printf does not wait for a newline to flush when stdout is attached to a terminal, but the two calls happen in order regardless, so the output is simply AB on one line. In a redirected file, buffering would combine them into a single write — still AB.",
            }),
            tips([
              "Compile early and compile often. A broken build tells you less than a broken idea.",
              "Read warnings from the first one; the last warning is rarely the most informative.",
              "A missing semicolon often surfaces as an error on the *next* line. Check upwards.",
            ]),
          ],
        },
      ],
    },
    {
      title: "Types, Operators and Control Flow",
      lessons: [
        {
          slug: "c-data-types",
          title: "Data Types and Integer Sizes",
          duration: 8,
          xpReward: 10,
          blocks: [
            text(
              "C has four fundamental types: `int` (signed integer), `char` (character, and the smallest integer type), `float` (single precision) and `double` (double precision). `void` is not a value type; it means \"no value\".\n\nThe important detail is that `int` is *not* a fixed size. The standard only requires it to be at least 16 bits. On every platform you are likely to meet, it is 32 bits — but the guarantee you can rely on everywhere is the range, not the width."
            ),
            example(
              `#include <stdio.h>
#include <limits.h>

int main(void) {
    printf("int  is at least %d bits\\n", (int)(sizeof(int) * CHAR_BIT));
    printf("INT_MAX = %d\\n", INT_MAX);
    return 0;
}`,
              "c",
              "Querying the limits instead of assuming them"
            ),
            text(
              "Signed integers use two's complement, so `int` ranges from -2147483648 to 2147483647 on a 32-bit platform. **Signed integer overflow is undefined behaviour** — not \"wraps around\", undefined. The compiler is permitted to assume it never happens and may delete the check that would have detected it. This is the sort of thing that turns a working program into a broken one when you change compilers or add an optimisation.\n\nUnsigned types (`unsigned int`, `unsigned char`) range from 0 upward and do wrap around, which is defined. Unsigned arithmetic is what you want for sizes and indices, precisely because the wrap is predictable."
            ),
            example(
              `#include <stdio.h>
#include <limits.h>
#include <float.h>

int main(void) {
    unsigned int u = 4294967295u;   /* max for 32-bit unsigned */
    printf("u     = %u\\n", u);
    printf("u + 1 = %u\\n", u + 1);   /* defined: wraps to 0 */

    printf("INT_MAX  < UINT_MAX : %d\\n", INT_MAX < UINT_MAX);  /* 0 */
    return 0;
}`,
              "c",
              "Unsigned wraparound is defined; signed overflow is not"
            ),
            text(
              "That last comparison is a genuine trap. `INT_MAX` is an `int` and `UINT_MAX` is an `unsigned int`. C converts the signed operand to unsigned, which turns a negative number into a large positive one, so `2147483647 < 4294967295` evaluates to **false**. The compiler is not being clever; the conversion happened before the comparison."
            ),
            inlineOutput({
              id: "c-data-types-q1",
              prompt: "What does this print?",
              code: `#include <stdio.h>
#include <limits.h>
int main(void) {
    if (INT_MAX < UINT_MAX)
        printf("yes\\n");
    else
        printf("no\\n");
    return 0;
}`,
              accept: ["no"],
              explanation:
                "INT_MAX (int) is converted to unsigned before the comparison, giving 2147483647u, which is not less than 4294967295u. Cast explicitly, or compare using a type that can represent both, to get the answer you meant.",
            }),
            tips([
              "Use `int` for counting and signed maths; `unsigned` for sizes and array indices.",
              "For guaranteed widths use <stdint.h>: int32_t, uint64_t, size_t.",
              "`float` has roughly 7 significant digits, `double` about 16. Reach for double by default.",
            ]),
            inlineMcq({
              id: "c-data-types-q2",
              prompt:
                "What is technically true of signed integer overflow in C?",
              options: [
                "It is undefined behaviour: the compiler may assume it never occurs",
                "It wraps around to the negative end of the range",
                "It raises a run-time error on conforming implementations",
                "It saturates at the maximum value",
              ],
              correct: 0,
              explanation:
                "C defines the result of unsigned overflow (modular arithmetic) but leaves signed overflow undefined. Optimisers exploit this: `if (x + 1 > x)` can be optimised to true, because the compiler is entitled to assume `x + 1` never overflowed.",
            }),
          ],
        },
        {
          slug: "c-standard-io",
          title: "printf and Standard I/O",
          duration: 7,
          xpReward: 10,
          blocks: [
            text(
              "`printf` is a variadic function: it takes a format string followed by a variable number of arguments, and the conversions in the format string decide how those arguments are interpreted. Getting the format string and the argument list to agree is a large fraction of real C bugs."
            ),
            example(
              `#include <stdio.h>

int main(void) {
    int    count = 42;
    double ratio = 0.75;
    char   grade = 'A';

    printf("%d items\\n", count);
    printf("ratio: %.2f\\n", ratio);    /* precision */
    printf("ratio: %8.3f|\\n", ratio);  /* width + precision */
    printf("grade: %c  code: %d\\n", grade, grade);
    return 0;
}`,
              "c",
              "The conversions you will actually use"
            ),
            text(
              "The conversions worth remembering: `%d` for signed decimal `int`, `%u` for `unsigned`, `%f` for both float and double (floats are promoted to double when passed), `%c` for a character, `%s` for a NUL-terminated string, `%p` for a pointer, `%x` and `%o` for hexadecimal and octal, `%zu` for `size_t`, and `%lld` for `long long`.\n\nNote `%f` and `%s`: passing a string to `%d`, or a pointer to `%d` where you meant `%s`, is undefined behaviour. The compiler cannot check variadic arguments — there is no type information at the call site — so this is entirely on you."
            ),
            example(
              `#include <stdio.h>
int main(void) {
    int n = 7;
    printf("%5d|\\n", n);      /*     7| */
    printf("%-5d|\\n", n);     /* 7     | */
    printf("%05d|\\n", n);     /* 00007 | */
    printf("%+d\\n", n);       /*  7    */
    printf("%x %o\\n", 255, 8);/* ff 10 */
    return 0;
}`,
              "c",
              "Width, left-align, zero-pad, sign, and base conversion"
            ),
            inlineOutput({
              id: "c-standard-io-q1",
              prompt: "What does this print?",
              code: `#include <stdio.h>
int main(void) {
    printf("%d-%s\\n", 5, "abc");
    return 0;
}`,
              accept: ["5-abc"],
              explanation:
                "The literal text between the two conversions is copied verbatim, so the output is 5-abc.",
            }),
            inlineTrueFalse({
              id: "c-standard-io-q2",
              prompt:
                "printf cannot detect a mismatch between the format string and the arguments passed. True or false?",
              correct: true,
              explanation:
                "Correct. Arguments are variadic and untyped at the call, so the compiler has nothing to check against. Passing a string where %d is expected is undefined behaviour and will not warn.",
            }),
            tips([
              "Always match the conversion to the promoted type of the argument.",
              "Use %zu for size_t — %d is wrong and can corrupt the stack on some ABIs.",
              "printf returns the number of characters written, or a negative value on error. Check it if output matters.",
            ]),
          ],
        },
        {
          slug: "c-operators",
          title: "Operators and Precedence",
          duration: 9,
          xpReward: 10,
          blocks: [
            text(
              "C has a rich operator set, and precedence decides grouping when you do not use parentheses. The table you should be able to recall without looking: `()` and `[]` bind tightest, then unary `!` `~` `++` `--` `&` `*` `sizeof` and casts, then `* / %`, then `+ -`, then `<< >>`, then `< <= > >=`, then `== !=`, then `&`, then `^`, then `|`, then `&&`, then `||`, and finally `?:` and assignment last."
            ),
            example(
              `#include <stdio.h>
int main(void) {
    int a = 10, b = 3;
    printf("%d\\n", a + b * 2);   /* 16: * before + */
    printf("%d\\n", (a + b) * 2); /* 26 */
    printf("%d\\n", a > b == 1);  /* 1: == before > ? no, > binds tighter */
    return 0;
}`,
              "c",
              "Precedence changes the answer"
            ),
            text(
              "The relational operators (`<`, `>`, `<=`, `>=`) produce `1` for true and `0` for false — integers, not a boolean type, which C did not have until C99's `_Bool` and `<stdbool.h>`'s `bool`.\n\nPrecedence is worth knowing, but parentheses are worth more. A program that depends on the reader memorising the precedence table is a program that gets misread. In practice, add parentheses wherever the intent is not obvious — it costs nothing at runtime."
            ),
            example(
              `#include <stdio.h>
int main(void) {
    int a = 10, b = 3;

    a += 4;   printf("%d\\n", a);  /* 14 */
    a -= 2;   printf("%d\\n", a);  /* 12 */
    a *= 3;   printf("%d\\n", a);  /* 36 */
    a /= 5;   printf("%d\\n", a);  /* 7  (integer division) */
    a %= 4;   printf("%d\\n", a);  /* 3 */

    printf("%d\\n", a++);  /* 3, then a becomes 4 */
    printf("%d\\n", a);    /* 4 */
    printf("%d\\n", ++a);  /* 5, then printed */
    return 0;
}`,
              "c",
              "Compound assignment and the difference between prefix and postfix ++"
            ),
            text(
              "Integer division truncates toward zero: `7 / 2` is `3`, and `-7 / 2` is `-3`, not `-4`. This bites when you divide money or convert to a percentage. Multiply first, or cast to double.\n\nAnd `++` in an expression like `arr[i++]` has *unspecified* order relative to other reads of `i`. `arr[i++] = i;` has no defined result in C. It is not \"usually\" anything — it is undefined, and the optimizer is entitled to do something surprising."
            ),
            inlineOutput({
              id: "c-operators-q1",
              prompt: "What does this print?",
              code: `#include <stdio.h>
int main(void) {
    int a = 10, b = 3;
    printf("%d\\n", a++ + ++a);
    return 0;
}`,
              accept: [
                "21",
                "Undefined behaviour: the program has no defined output",
                "22",
                "20",
              ],
              explanation:
                "There are two unsequenced modifications of `a` in one expression, plus a read. That is undefined behaviour, so no value is guaranteed. This is a common exam trap and a common bug: a modification and any other read of the same object must be sequenced.",
            }),
            tips([
              "Parenthesise for the reader, not just the compiler.",
              "Increment in a statement of its own when the expression does more than one thing.",
              "Cast before dividing: (double)a / b, not a / (double)b.",
            ]),
            inlineMcq({
              id: "c-operators-q2",
              prompt: "What is the value of `7 / 2` for two ints, and why?",
              options: [
                "3, because integer division discards the fractional part",
                "3.5, promoted to double automatically",
                "4, because C rounds to nearest",
                "Undefined, because 2 is not a float",
              ],
              correct: 0,
              explanation:
                "Both operands are int, so the operation is integer division and the result truncates toward zero. Floating point is only involved if at least one operand is floating point.",
            }),
          ],
        },
        {
          slug: "c-control-flow",
          title: "Conditionals and Loops",
          duration: 9,
          xpReward: 10,
          blocks: [
            text(
              "C's control flow is small: `if` / `else`, `switch`, `while`, `do`/`while`, and `for`. There is no `foreach` and no built-in loop over containers — you always index, which keeps the rules uniform."
            ),
            example(
              `#include <stdio.h>
int main(void) {
    int n = 7;

    if (n % 2 == 0)
        printf("even\\n");
    else
        printf("odd\\n");

    switch (n) {
        case 1:
        case 2: printf("small\\n"); break;   /* fall-through is the default */
        case 7: printf("lucky\\n"); break;
        default: printf("other\\n");
    }
    return 0;
}`,
              "c",
              "if/else and switch, including intentional fall-through"
            ),
            text(
              "Two details catch newcomers. First, `switch` **falls through** by default: each `case` runs and continues into the next unless you `break`. This is occasionally what you want, so it is not a bug by itself, but an unlabelled `break` is a frequent real defect. Second, C has no truthy/falsy in expressions beyond zero: any non-zero value is true, including negative numbers and pointers.\n\nThe `for` loop has three parts in one construct — initialise, condition, update — which makes the loop variable's scope obvious."
            ),
            example(
              `#include <stdio.h>
int main(void) {
    /* sum 1..n */
    int sum = 0;
    for (int i = 1; i <= 10; i++)
        sum += i;
    printf("sum=%d\\n", sum);   /* 55 */

    /* same loop, written with while */
    int j = 0, total = 0;
    while (j < 10) { total += j + 1; j++; }
    printf("total=%d\\n", total); /* 55 */

    /* do/while runs at least once */
    int k = 100, count = 0;
    do { count++; k--; } while (k > 0);
    printf("count=%d\\n", count); /* 1 */
    return 0;
}`,
              "c",
              "for, while and do/while compared"
            ),
            inlineOutput({
              id: "c-control-flow-q1",
              prompt: "What does this print?",
              code: `#include <stdio.h>
int main(void) {
    for (int i = 0; i < 5; i++) {
        if (i == 2) continue;
        printf("%d ", i);
    }
    return 0;
}`,
              accept: ["0 1 3 4 ", "0 1 3 4"],
              explanation:
                "`continue` skips the rest of the loop body for i == 2, so 2 is never printed. The spaces are printed after each number, hence the trailing space before the newline-less end of output.",
            }),
            tips([
              "Always terminate a switch case that should not fall through.",
              "Use `for` when the number of iterations is known, `while` when it is not.",
              "Beware `if (x = 5)` — that is an assignment, and the condition tests 5, which is true.",
            ]),
            inlineMcq({
              id: "c-control-flow-q2",
              prompt: "What is wrong with `if (count = 5) { ... }`?",
              options: [
                "It assigns 5 to count and tests the result, so the branch is always taken",
                "Nothing — assigning inside a condition is idiomatic C",
                "It is a syntax error",
                "It compares count to 5 but discards the result",
              ],
              correct: 0,
              explanation:
                "A single `=` is assignment. Because 5 is non-zero the condition is always true, so the body always runs and count is overwritten. The equality test needs two `=` signs: `if (count == 5)`.",
            }),
          ],
        },
      ],
    },
    {
      title: "Functions and Recursion",
      lessons: [
        {
          slug: "c-functions-basics",
          title: "Defining and Calling Functions",
          duration: 8,
          xpReward: 10,
          blocks: [
            text(
              "A function in C is defined by a return type, a name, a parameter list and a body. Unlike C++ or Java, C has no function overloading: two functions with the same name are the same function."
            ),
            example(
              `#include <stdio.h>

/* Declaration: tells the compiler the shape before the first call. */
int add(int a, int b);

/* Definition */
int add(int a, int b) {
    return a + b;
}

int main(void) {
    printf("%d\\n", add(2, 3));   /* 5 */
    printf("%d\\n", add(add(1,1), add(2,3)));  /* nested calls are fine */
    return 0;
}`,
              "c",
              "Declaration and definition"
            ),
            text(
              "Passing arguments is **by value** in C. When you call `add(2, 3)`, the function receives copies. Assigning to a parameter inside the function does not touch the caller's variable. This is different from C++'s references, and it is a frequent source of confusion for people arriving from a language with reference parameters."
            ),
            example(
              `#include <stdio.h>
void try_to_modify(int x) {
    x = 99;              /* changes the local copy only */
}

int main(void) {
    int a = 1;
    try_to_modify(a);
    printf("%d\\n", a);  /* 1 — unchanged */
    return 0;
}`,
              "c",
              "By-value semantics"
            ),
            text(
              "To let a function change the caller's variable you pass a **pointer** to it, which is the subject of Module 4. The function receives a copy of the address, dereferences it, and the change is visible outside because both sides are looking at the same memory.\n\nNote the `void` return: a function that computes nothing and is called purely for effect should say so. A missing return type defaults to `int` in very old C and is a warning in modern C — always write the type."
            ),
            inlineOutput({
              id: "c-functions-basics-q1",
              prompt: "What does this print?",
              code: `#include <stdio.h>
int twice(int n) { return n * 2; }
int main(void) {
    int x = 5;
    printf("%d %d\\n", twice(x), x);
    return 0;
}`,
              accept: ["10 5"],
              explanation:
                "Arguments pass by value, so `twice` works on a copy. x is untouched in the caller.",
            }),
            tips([
              "Prefer static functions in a .c file over putting everything in the header.",
              "Keep functions short; if a parameter list needs a comment, consider a struct.",
              "A function that can fail should return something that says so — an int status, or NULL for pointers.",
            ]),
          ],
        },
        {
          slug: "c-recursion",
          title: "Recursion",
          duration: 9,
          xpReward: 10,
          blocks: [
            text(
              "A recursive function calls itself with a smaller problem until it reaches a base case. C gives you no built-in loop over data structures, so recursion is not a stylistic choice — for trees, it is often the natural way to express the algorithm."
            ),
            example(
              `#include <stdio.h>

int factorial(int n) {
    if (n <= 1) return 1;        /* base case — must terminate */
    return n * factorial(n - 1);
}

int fib(int n) {
    if (n < 2) return n;         /* base case */
    return fib(n - 1) + fib(n - 2);
}

int main(void) {
    printf("%d\\n", factorial(5));  /* 120 */
    printf("%d\\n", fib(10));       /* 55 */
    return 0;
}`,
              "c",
              "Two standard recursions"
            ),
            text(
              "Every recursion needs a base case that returns without recursing, and every recursive step must move toward it. Miss either and the program exhausts the stack. C does not check this for you, and a runaway recursion is a segmentation fault with no diagnostic.\n\n`fib` is a good example of why recursion is not automatically the right tool: the naive version recomputes the same values exponentially many times. It is included here as the canonical example, not as a recommendation. Memoisation or iteration turns it into a linear function."
            ),
            example(
              `#include <stdio.h>

/* Same result, O(n) instead of exponential. */
int fib_iter(int n) {
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        int t = a + b;
        a = b;
        b = t;
    }
    return a;
}

int main(void) {
    printf("%d\\n", fib_iter(10));  /* 55 */
    return 0;
}`,
              "c",
              "The iterative version you should write in production"
            ),
            inlineOutput({
              id: "c-recursion-q1",
              prompt: "What does this print, and is it safe?",
              code: `#include <stdio.h>
int down(int n) {
    if (n == 0) return 0;
    return down(n - 1);
}
int main(void) {
    printf("%d\\n", down(3));
    return 0;
}`,
              accept: ["0"],
              explanation:
                "It prints 0 and terminates correctly. Had the base case been `if (n < 0) return 0;` instead, n would decrease past zero forever and the program would crash on stack exhaustion.",
            }),
            inlineMcq({
              id: "c-recursion-q2",
              prompt: "What is the most likely result of a recursive function with no reachable base case?",
              options: [
                "A segmentation fault from stack exhaustion, typically with no useful message",
                "An infinite loop that runs forever",
                "The compiler rejects it",
                "It returns 0 immediately",
              ],
              correct: 0,
              explanation:
                "Each call consumes stack space. When it is exhausted the program takes a fault. C gives no diagnostic for this, which is why a clear base case matters.",
            }),
          ],
        },
      ],
    },
    {
      title: "Arrays, Strings and Pointers",
      lessons: [
        {
          slug: "c-arrays",
          title: "Arrays and Out-of-Bounds",
          duration: 9,
          xpReward: 15,
          blocks: [
            text(
              "A C array is a contiguous block of memory holding a fixed number of elements of one type. `int a[5]` reserves space for five ints, uninitialised. Array indexing is zero-based and is pure arithmetic: `a[i]` means `*(a + i)`."
            ),
            example(
              `#include <stdio.h>
int main(void) {
    int a[5];
    printf("sizeof(a) = %zu bytes\\n", sizeof(a));
    printf("each int is %zu bytes\\n", sizeof(a[0]));
    printf("a has %zu elements\\n", sizeof(a) / sizeof(a[0]));

    for (int i = 0; i < 5; i++) a[i] = i * i;
    for (int i = 0; i < 5; i++) printf("%d ", a[i]);
    return 0;
}`,
              "c",
              "sizeof on an array is its whole size, not one element"
            ),
            text(
              "The `sizeof` distinction matters and is a common interview trap. `sizeof(a)` where `a` is an array gives the total bytes. `sizeof(a[0])` gives one element. So `sizeof(a) / sizeof(a[0])` is the element count. But the moment a parameter is declared `int a[]` or `int *a`, it decays to a pointer and `sizeof` gives pointer size — the array information is gone."
            ),
            example(
              `#include <stdio.h>
void print_size(int a[]) {   /* actually a pointer! */
    printf("inside: %zu\\n", sizeof(a));   /* 8 on 64-bit */
}
int main(void) {
    int a[100];
    printf("outside: %zu\\n", sizeof(a));  /* 400 */
    print_size(a);
    return 0;
}`,
              "c",
              "Array-to-pointer decay in a parameter"
            ),
            text(
              "**C does not check array bounds.** `a[7]` on a five-element array compiles cleanly and reads memory that does not belong to the array. That is undefined behaviour: it might return garbage, corrupt an unrelated variable, or crash. It might also appear to work for years, which is what makes it dangerous — the failure is a latent time bomb, not a visible error.\n\nThe safe approach is to always pass the size alongside the array."
            ),
            example(
              `#include <stdio.h>
int sum(const int a[], size_t n) {
    int total = 0;
    for (size_t i = 0; i < n; i++) total += a[i];
    return total;
}
int main(void) {
    int xs[4] = {1, 2, 3, 4};
    printf("%d\\n", sum(xs, 4));   /* 10 — n is explicit */
    return 0;
}`,
              "c",
              "Pass the length; never trust the callee to know it"
            ),
            inlineOutput({
              id: "c-arrays-q1",
              prompt: "What does this print? (Note: reading uninitialised memory is undefined behaviour — answer with what the code *intends*.)",
              code: `#include <stdio.h>
int main(void) {
    int a[3];
    printf("%d\\n", a[0]);
    return 0;
}`,
              accept: [
                "Undefined behaviour: the value of a[0] is indeterminate",
                "0",
                "garbage",
              ],
              explanation:
                "A local array without an initialiser holds indeterminate values — not necessarily zero. Reading a[0] is undefined behaviour, so no output is guaranteed. If you want zeros, write `int a[3] = {0};`.",
            }),
            tips([
              "Local arrays are uninitialised; globals are zero-initialised. The difference catches people.",
              "Zero with `= {0}`, which works for any type.",
              "Use size_t for indices and lengths; int is too small for very large arrays and invites signed/unsigned warnings.",
            ]),
            inlineMcq({
              id: "c-arrays-q2",
              prompt:
                "In `void f(int a[])`, what is the type of `a` inside the function?",
              options: [
                "int * — the array decays to a pointer to its first element",
                "int[3] — the size is part of the type",
                "A reference, like C++",
                "An array of unknown size, which sizeof can still measure",
              ],
              correct: 0,
              explanation:
                "In a parameter declaration, `int a[]` is adjusted to `int *a`. The size is not part of the type, which is why sizeof(a) inside the function reports the pointer size and why the length must be passed separately.",
            }),
          ],
        },
        {
          slug: "c-pointers",
          title: "Pointers, Properly",
          duration: 12,
          xpReward: 20,
          blocks: [
            text(
              "A pointer is a variable that stores an address. Three operations matter: `&x` gives the address of `x`, `*p` gives the value stored at the address in `p`, and `p` itself is the address. Once those three are distinct in your head, the rest of pointers is detail."
            ),
            example(
              `#include <stdio.h>
int main(void) {
    int x = 42;
    int *p = &x;          /* p holds the address of x */

    printf("value of x      : %d\\n", x);
    printf("value of *p     : %d\\n", *p);      /* 42 */
    printf("address &x      : %p\\n", (void *)&x);
    printf("address stored  : %p\\n", (void *)p); /* same */
    printf("address of p    : %p\\n", (void *)&p); /* different! */

    *p = 7;               /* writes through the pointer */
    printf("after *p = 7    : %d\\n", x);        /* 7 */
    return 0;
}`,
              "c",
              "The three pointer operations"
            ),
            text(
              "The classic confusion: `p` is the address, `*p` is the value there, `&p` is the address of the pointer variable itself. A pointer has its own memory location, which is what `&p` reports.\n\n`int *p = &x` gives `p` the type \"pointer to int\". `int **pp = &p` gives a pointer to a pointer, which is the type used for arrays of strings and for passing a pointer by pointer so a function can point it somewhere new."
            ),
            example(
              `#include <stdio.h>

void swap(int *a, int *b) {
    int t = *a;          /* save the value at a */
    *a = *b;             /* overwrite a with b's value */
    *b = t;              /* overwrite b with the saved value */
}

int main(void) {
    int x = 1, y = 2;
    swap(&x, &y);        /* pass the addresses */
    printf("%d %d\\n", x, y);   /* 2 1 */
    return 0;
}`,
              "c",
              "Modifying a caller's variable requires a pointer"
            ),
            text(
              "This is the practical reason pointers exist. C passes everything by value; a pointer is how you hand over the ability to modify the caller's data. `swap` could not change `x` and `y` if it took `int a, int b`.\n\nThere is a second reason: pointers let you refer to large structures without copying them, pass arrays without knowing their length, and — crucially — reach memory the compiler does not manage, such as memory you allocated or mapped from a file."
            ),
            inlineOutput({
              id: "c-pointers-q1",
              prompt: "What does this print?",
              code: `#include <stdio.h>
int main(void) {
    int x = 10;
    int *p = &x;
    int **pp = &p;
    printf("%d\\n", **pp);
    return 0;
}`,
              accept: ["10"],
              explanation:
                "**pp dereferences twice: first *pp gives the pointer p, then **pp gives the value p points at, which is x = 10.",
            }),
            inlineOutput({
              id: "c-pointers-q2",
              prompt: "What does this print?",
              code: `#include <stdio.h>
void set_to_99(int v) { v = 99; }
int main(void) {
    int x = 1;
    set_to_99(x);
    printf("%d\\n", x);
    return 0;
}`,
              accept: ["1"],
              explanation:
                "C passes arguments by value, so the function modifies its own copy. To change the caller's variable you must pass its address and dereference it inside.",
            }),
            tips([
              "Read declarations right to left: int *p is a pointer to int; int *p[3] is an array of 3 pointers.",
              "Never return the address of a local — it dies at return, leaving a dangling pointer.",
              "Set pointers to NULL on declaration if they do not immediately get a value.",
            ]),
            inlineMcq({
              id: "c-pointers-q3",
              prompt: "Why is returning `&local_variable` from a function dangerous?",
              options: [
                "The local is destroyed at return, so the returned pointer dangles",
                "It is not — returning an address is always safe",
                "The compiler rejects it",
                "It leaks memory that must be freed with free()",
              ],
              correct: 0,
              explanation:
                "The local's storage ends when the function returns. The address still points somewhere, but the contents are no longer yours; using it is undefined behaviour. It is a dangling pointer, and it is the most common way C programs acquire a security vulnerability.",
            }),
          ],
        },
        {
          slug: "c-strings",
          title: "Strings: Arrays of Characters",
          duration: 9,
          xpReward: 15,
          blocks: [
            text(
              "C has no string type. A string is a convention: an array of `char` terminated by `\\0`, the null byte, whose value is 0. Every string function finds the end of a string by scanning for that terminator. Understanding this explains both why strings work and why they are so often dangerous."
            ),
            example(
              `#include <stdio.h>
int main(void) {
    char greeting[] = "Hi";    /* 3 bytes: 'H', 'i', '\\0' */
    printf("size = %zu\\n", sizeof(greeting));   /* 3 */

    char buf[10] = "Hi";       /* 10 bytes, zero-padded after \\0 */
    printf("size = %zu\\n", sizeof(buf));         /* 10 */
    printf("buf[2] = %d\\n", buf[2]);            /* 0 */
    return 0;
}`,
              "c",
              "A string literal includes room for the terminator"
            ),
            text(
              "The single most important C habit is sizing for the terminator. `char buf[3] = \"abc\";` does not compile — there is no room for `\\0`. Use `char buf[4] = \"abc\";` or larger, or `sizeof(buf) - 1` characters plus the terminator. The same arithmetic governs every buffer you will ever fill.\n\nArrays initialised from a literal are zero-padded, so `buf[2]` above is 0. Assigning a longer literal later is what overruns."
            ),
            example(
              `#include <stdio.h>
#include <string.h>
int main(void) {
    char src[] = "hello";
    char dst[16];

    strcpy(dst, src);                 /* safe: 16 > 6 */
    printf("[%s] len=%zu\\n", dst, strlen(dst));   /* 5, strlen excludes \\0 */

    strncpy(dst, "hi", sizeof(dst) - 1);
    dst[sizeof(dst) - 1] = '\\0';     /* ensure terminated */
    printf("[%s]\\n", dst);
    return 0;
}`,
              "c",
              "Copying safely with explicit termination"
            ),
            text(
              "`strcpy` and `strcat` do no bounds checking whatsoever. `strncpy` is better but has a sharp edge: if the source is longer than `n`, it fills all `n` bytes with no terminator, leaving the result unterminated. The idiom is to use `n - 1` and set the last byte to `\\0` yourself, as above.\n\nThe comparison functions are worth knowing too: `strcmp` returns 0 for equality, negative or positive otherwise. Never write `if (a == b)` for strings — that compares addresses. Always `strcmp`."
            ),
            inlineOutput({
              id: "c-strings-q1",
              prompt: "What does this print?",
              code: `#include <stdio.h>
#include <string.h>
int main(void) {
    char a[] = "abc";
    char b[] = "abc";
    printf("%d\\n", a == b);
    return 0;
}`,
              accept: ["0"],
              explanation:
                "Comparing two arrays with == compares their addresses, which differ, so the result is 0 (false). To compare contents you need strcmp(a, b) == 0. This is one of the most common C bugs in existence.",
            }),
            tips([
              "Size buffers with strlen(s) + 1 in mind, always.",
              "Use fgets over scanf for input — it cannot overflow a correctly sized buffer.",
              "If you must copy, snprintf with the destination size is the safest available call.",
            ]),
            inlineMcq({
              id: "c-strings-q2",
              prompt: "Why does `char buf[3] = \"abc\";` fail to compile?",
              options: [
                "\"abc\" needs 4 bytes: three characters plus the null terminator",
                "Arrays cannot be initialised from a string literal",
                "char is too small for letters",
                "It is fine; the compiler adds the terminator automatically",
              ],
              correct: 0,
              explanation:
                "C strings are NUL-terminated, so the literal \"abc\" occupies four bytes. A three-byte array leaves no room. The compiler will tell you so, which is one of the nicer errors in C.",
            }),
          ],
        },
      ],
    },
    {
      title: "Structs and Memory",
      lessons: [
        {
          slug: "c-structs",
          title: "Structs and Unions",
          duration: 9,
          xpReward: 15,
          blocks: [
            text(
              "A struct groups related values under one name. A union holds several members of different types in the same memory, and only one is meaningful at a time. Structs are how you model a record; unions are for variants that share storage."
            ),
            example(
              `#include <stdio.h>
struct Point {
    int x;        /* members are accessed with . */
    int y;
};

void move(struct Point *p, int dx, int dy) {
    p->x += dx;  /* -> for a pointer to struct */
    p->y += dy;
}

int main(void) {
    struct Point p = {3, 4};
    move(&p, 10, -1);
    printf("(%d, %d)\\n", p.x, p.y);   /* (13, 3) */
    return 0;
}`,
              "c",
              "Struct definition, dot and arrow"
            ),
            text(
              "`.` accesses a member of a struct value; `->` is shorthand for `(*ptr).member` and works on a pointer to struct. Passing a pointer to a function avoids copying the whole struct, which matters once structs get large.\n\nThere is no inheritance in C, no constructors, and no access control. `typedef` gives a name to a type so you stop writing `struct` everywhere."
            ),
            example(
              `#include <stdio.h>
typedef struct {
    char  name[32];
    int   age;
    float score;
} Student;        /* typedef: now just Student */

int main(void) {
    Student s = {"Ada", 36, 91.5f};
    Student *p = &s;
    printf("%s %d %.1f\\n", p->name, p->age, p->score);
    return 0;
}`,
              "c",
              "Anonymous struct with typedef"
            ),
            example(
              `#include <stdio.h>
#include <string.h>
union Value {
    int   i;        /* 4 bytes */
    float f;        /* 4 bytes */
    char  s[4];     /* 4 bytes */
};

int main(void) {
    union Value v;
    v.i = 0x41424344;
    printf("size = %zu\\n", sizeof(v));      /* 4 */
    printf("%c%c%c%c\\n", v.s[0], v.s[1], v.s[2], v.s[3]);
    /* DCBA on a little-endian machine — the bytes are the same memory */
    return 0;
}`,
              "c",
              "A union overlays its members in one buffer"
            ),
            inlineOutput({
              id: "c-structs-q1",
              prompt: "What does this print?",
              code: `#include <stdio.h>
struct P { int x; int y; };
int main(void) {
    struct P a = {1, 2};
    struct P b = a;
    b.x = 99;
    printf("%d\\n", a.x);
    return 0;
}`,
              accept: ["1"],
              explanation:
                "Struct assignment copies the whole object by value, so `a` is unaffected. If you wanted the change to be visible through `a`, you would copy the address instead: `struct P *b = &a;`",
            }),
            tips([
              "Prefer pointers to structs in function parameters once they are non-trivial.",
              "typedef struct { ... } Name; hides the tag and is idiomatic modern C.",
              "Struct members can be out of order; add padding deliberately and never assume sizeof is the sum of members.",
            ]),
          ],
        },
        {
          slug: "c-memory-model",
          title: "The Stack and the Heap",
          duration: 11,
          xpReward: 20,
          blocks: [
            text(
              "Every C program gets two main memory regions. The **stack** is fast and automatic: local variables and function arguments live there, and they are reclaimed when the function returns. The **heap** is explicit: you request memory with `malloc` and you must release it with `free`. Nothing on the heap is reclaimed for you.\n\nThe rule that follows: automatic memory is freed automatically; heap memory is your responsibility."
            ),
            example(
              `#include <stdio.h>
#include <stdlib.h>

int *make_array(int n) {
    int *a = malloc(n * sizeof *a);   /* heap: lives past this return */
    if (a == NULL) return NULL;       /* always check */
    for (int i = 0; i < n; i++) a[i] = i + 1;
    return a;                         /* NOT &a — that would dangle */
}

int main(void) {
    int *xs = make_array(5);
    if (!xs) { fprintf(stderr, "oom\\n"); return 1; }
    printf("%d %d\\n", xs[0], xs[4]);
    free(xs);
    xs = NULL;      /* avoid a dangling or double free */
    return 0;
}`,
              "c",
              "Correct heap allocation and release"
            ),
            text(
              "Three failure modes to recognise by sight. A **leak** is memory you allocated and never freed; the program grows until it dies. A **double free** is calling `free` twice on the same pointer, which modern allocators abort on because the heap metadata is now corrupt. A **use-after-free** is reading or writing memory after it has been released — often still readable, which is what makes it so damaging, since a dangling pointer can silently become a security hole.\n\nThis is the entire motivation for C++'s RAII and Rust's ownership: both exist so that release cannot be forgotten."
            ),
            example(
              `#include <stdio.h>
#include <stdlib.h>
#include <string.h>

int main(void) {
    /* strdup is not in standard C, so here it is by hand. */
    const char *src = "hello";
    char *copy = malloc(strlen(src) + 1);
    if (!copy) return 1;
    strcpy(copy, src);
    printf("%s\\n", copy);
    free(copy);
    return 0;
}`,
              "c",
              "Allocating exactly strlen + 1"
            ),
            text(
              "Note the `+ 1`. Copying a string of length n into fresh heap memory needs n characters plus the terminator, so `malloc(n + 1)`. Off-by-one here overflows the allocation by exactly one byte, which is one of the classic heap overflow patterns.\n\n`calloc(n, size)` allocates and zeroes in one step, which is safer than `malloc` followed by `memset` when the count comes from untrusted input, because it checks for multiplication overflow."
            ),
            inlineOutput({
              id: "c-memory-model-q1",
              prompt: "What does this print, if it prints anything reliable?",
              code: `#include <stdio.h>
int *get_array(void) {
    int a[3] = {1, 2, 3};
    return a;   /* a is destroyed on return */
}
int main(void) {
    int *p = get_array();
    printf("%d\\n", p[0]);
    return 0;
}`,
              accept: [
                "Undefined behaviour: p is a dangling pointer, so any output is possible",
                "1",
                "garbage",
              ],
              explanation:
                "`a` is an automatic object whose lifetime ends at return. The returned pointer refers to stack memory that is no longer valid, and reading it is undefined behaviour. It often appears to print 1, which is exactly why this bug survives in real code.",
            }),
            tips([
              "free(ptr) and then set ptr = NULL. It costs nothing and removes a whole bug class.",
              "Only free pointers that came from malloc/calloc/realloc/strdup.",
              "After realloc fails you still own the original pointer — free it or keep it.",
            ]),
            inlineMcq({
              id: "c-memory-model-q2",
              prompt: "You malloc(10), then assign the pointer to another variable, then free it once. Is the memory freed correctly?",
              options: [
                "Yes — free works through the copy; the original pointer is now dangling but only one free happened",
                "No — every copy must be freed separately",
                "No — you must free both pointers",
                "Only if the pointer is declared volatile",
              ],
              correct: 0,
              explanation:
                "free() acts on the address, and both variables hold the same address, so a single free is correct and sufficient. The danger is using the other copy afterwards — that is a use-after-free, not a leak or a double free.",
            }),
          ],
        },
      ],
    },
    {
      title: "Files and Standard Library",
      lessons: [
        {
          slug: "c-files",
          title: "File I/O and Buffered Streams",
          duration: 8,
          xpReward: 15,
          blocks: [
            text(
              "C's file I/O goes through `FILE *`, an opaque handle representing an open stream. `fopen` returns one, `fprintf`/`fscanf` and the family operate on it, and `fclose` releases it."
            ),
            example(
              `#include <stdio.h>

int main(void) {
    FILE *f = fopen("notes.txt", "w");
    if (f == NULL) { perror("fopen"); return 1; }

    fprintf(f, "line one\\n");
    fprintf(f, "number %d\\n", 42);
    fclose(f);        /* flushes and releases — do not skip this */

    f = fopen("notes.txt", "r");
    if (!f) { perror("fopen"); return 1; }

    char line[128];
    while (fgets(line, sizeof line, f) != NULL)
        printf("read: %s", line);

    fclose(f);
    return 0;
}`,
              "c",
              "Write then read, with every failure checked"
            ),
            text(
              "The mode string is `'\"r\"'`, `'\"w\"'` (truncate), `'\"a\"'` (append), each optionally with `'\"b\"'` for binary and `'\"+\"'` for read *and* write. `'\"w\"'` silently destroys existing content, which is the sort of default worth being deliberate about.\n\n`fgets` takes a buffer size and cannot overflow it. `fscanf` with `%s` and no width is the equivalent hazard and is the standard source of stack overflows from file input. Use `%Ns` to bound a field."
            ),
            example(
              `#include <stdio.h>
int main(void) {
    FILE *f = fopen("in.txt", "r");
    if (!f) return 1;
    char name[32];
    /* %31s bounds the field; a longer token is truncated, not overflowed */
    if (fscanf(f, "%31s", name) == 1)
        printf("got %s\\n", name);
    fclose(f);
    return 0;
}`,
              "c",
              "Bounded scanning with a width specifier"
            ),
            text(
              "Streams are buffered for speed, which is why output may not appear immediately. Call `fflush(stdout)` when you need it out now — before prompting a user, for instance. `perror` is the right way to report a failed syscall: it prints your message and appends the system explanation of `errno`."
            ),
            tips([
              "Check every fopen. A NULL FILE * is a crash, not a fallback.",
              "Always fclose, or at minimum fflush before you rely on the content.",
              "Read with fgets, never gets — gets cannot be bounded.",
            ]),
            inlineMcq({
              id: "c-files-q1",
              prompt: "What does fopen(\"data.txt\", \"w\") do if data.txt already has content?",
              options: [
                "Truncates the file to zero length",
                "Appends to the end",
                "Fails because the file exists",
                "Leaves the content and overwrites the first line",
              ],
              correct: 0,
              explanation:
                "Mode \"w\" truncates. Nothing is preserved, and no error is raised. Use \"a\" to append, or \"r+\" to read and write without truncating.",
            }),
          ],
        },
        {
          slug: "c-stdlib",
          title: "The Standard Library You Will Actually Use",
          duration: 9,
          xpReward: 15,
          blocks: [
            text(
              "C's standard library is small on purpose. These are the headers that earn their place in most programs."
            ),
            example(
              `#include <stdio.h>     /* printf, FILE, fopen        */
#include <stdlib.h>    /* malloc, free, qsort, exit    */
#include <string.h>    /* strlen, strcpy, memcpy, memcmp */
#include <math.h>      /* sqrt, pow, fabs  (link with -lm) */
#include <stdint.h>    /* int32_t, uint64_t, SIZE_MAX    */
#include <stdbool.h>   /* bool, true, false             */
#include <stddef.h>    /* size_t, NULL, ptrdiff_t        */
#include <limits.h>    /* INT_MAX, CHAR_BIT              */
#include <assert.h>    /* assert()                      */`,
              "c",
              "The headers worth memorising"
            ),
            text(
              "From `stdlib.h`: `malloc`, `calloc`, `realloc` and `free`; `qsort` for sorting any array with a comparison function; `abs`; `atoi`/`strtol` for parsing; `exit` for a controlled quit. From `string.h`: `strlen`, `strcpy`/`strncpy`, `strcat`, `strcmp`/`strncmp`, `strchr`, plus the memory functions `memcpy`, `memset` and `memmove`.\n\nOne distinction matters: `strcpy` stops at the first null byte, `memcpy` copies a fixed byte count and does not care. Use `memcpy` for binary data, `strcpy` for text. `memmove` is the correct choice when source and destination overlap, because `memcpy` is explicitly undefined in that case."
            ),
            example(
              `#include <stdio.h>
#include <stdlib.h>

static int compare_ints(const void *a, const void *b) {
    int x = *(const int *)a, y = *(const int *)b;
    return (x > y) - (x < y);      /* safe, no overflow from subtraction */
}

int main(void) {
    int xs[5] = {5, 3, 9, 1, 7};
    qsort(xs, 5, sizeof xs[0], compare_ints);
    for (int i = 0; i < 5; i++) printf("%d ", xs[i]);
    return 0;                      /* 1 3 5 7 9 */
}`,
              "c",
              "qsort with a comparison function"
            ),
            text(
              "Two details in that example are deliberate. The comparison returns the sign of the difference as a boolean subtraction rather than `x - y`, because `x - y` can overflow for extreme values and produce the wrong ordering. And `qsort` takes `const void *`, so the cast back to `const int *` is required.\n\nNote also that `math.h` functions need `-lm` on Linux, and that the linker is the stage where a missing library produces an error rather than the compiler."
            ),
            inlineOutput({
              id: "c-stdlib-q1",
              prompt: "What does this print?",
              code: `#include <stdio.h>
#include <string.h>
int main(void) {
    char a[] = "abc";
    char b[8];
    memcpy(b, a, sizeof a);
    printf("%d %d\\n", (int)strlen(b), b[4]);
    return 0;
}`,
              accept: ["3 0"],
              explanation:
                "memcpy copies all 4 bytes of a including the terminator, so b holds \"abc\\0\". strlen then counts 3 characters before the terminator, and b[4] is the zero left from b's initialisation.",
            }),
            tips([
              "Link with -lm when using math functions on Linux or macOS.",
              "assert() is compiled out by NDEBUG — never put required logic inside it.",
              "Use strtol over atoi when the input could be malformed; it reports errors.",
            ]),
            inlineTrueFalse({
              id: "c-stdlib-q2",
              prompt:
                "memcpy is a safe choice for copying when the source and destination ranges overlap. True or false?",
              correct: false,
              explanation:
                "False. Overlapping memcpy is undefined behaviour. Use memmove, which is specified to behave correctly in that case.",
            }),
          ],
        },
      ],
    },
  ],
};
