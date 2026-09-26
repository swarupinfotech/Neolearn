// ============================================================
// Editorial content for the blog.
//
// The posts are static and curated, so they live in one module that
// the index page, the post page and the sitemap all read from.
// Previously the index and the post page each carried their own copy,
// which had already drifted apart.
// ============================================================

export interface BlogPost {
  slug: string;
  title: string;
  /** Shown on the index and used as the meta description fallback. */
  excerpt: string;
  date: string;
  readMins: number;
  tag: string;
  body: string[];
}

export const POSTS: BlogPost[] = [
  {
    slug: "how-to-learn-programming-fast",
    title: "How to actually learn programming (without tutorial hell)",
    excerpt:
      "Why passive tutorials fail, and how active practice with challenges and projects builds real skill.",
    date: "2026-08-14",
    readMins: 6,
    tag: "Learning",
    body: [
      "Watching someone else code feels productive — until you open a blank editor. The gap between recognition and recall is where most learners stall.",
      "The fix is active practice: after every concept, write code without looking. Run it. Break it. Fix it. NeoLearn lessons are structured exactly this way — concept, example, try-it, question, challenge.",
      "Spaced repetition matters too. A 10-minute daily session with a streak beats a 6-hour weekend binge, because your brain consolidates sleep-spaced practice.",
      "Finally, build projects with real requirements. A to-do app with tests teaches more than ten more tutorial videos, because debugging *is* the skill.",
    ],
  },
  {
    slug: "python-vs-javascript-2026",
    title: "Python vs JavaScript in 2026: which should you learn first?",
    excerpt:
      "A practical comparison across job markets, learning curves and the kinds of projects each language shines at.",
    date: "2026-07-02",
    readMins: 8,
    tag: "Languages",
    body: [
      "Python remains the gentlest on-ramp: readable syntax, huge ecosystem for data and AI, and immediate feedback via scripts.",
      "JavaScript owns the browser — if your goal is shipping interfaces and full-stack apps with Node, JS is unavoidable.",
      "Our advice: pick the language tied to your goal. Data/AI/security tooling → Python. Web products → JavaScript/TypeScript. Learn the second language after finishing your first path.",
      "The good news: fundamentals transfer. Variables, loops, functions and data structures are the same concepts wearing different syntax.",
    ],
  },
  {
    slug: "why-streaks-work",
    title: "Why daily streaks (and daily missions) actually work",
    excerpt:
      "The behavioral science behind habit loops — and how we prevent streak farming in NeoLearn.",
    date: "2026-06-20",
    readMins: 5,
    tag: "Gamification",
    body: [
      'Streaks convert a vague goal ("learn to code") into a concrete daily contract: do one meaningful thing today.',
      "But streaks only work if they're honest. Client-side streaks are trivially forgeable, so NeoLearn computes streaks server-side from stored activity dates — one activity counts once per UTC day.",
      "Daily missions add variety: one lesson, one quiz, one challenge. Completing all three earns bonus XP, but the reward is validated and de-duplicated per day.",
    ],
  },
  {
    slug: "secure-code-execution-explained",
    title: "How NeoLearn runs your code safely",
    excerpt:
      "Inside the WASM sandbox architecture: no server execution, no secrets, no network, hard timeouts.",
    date: "2026-05-11",
    readMins: 7,
    tag: "Engineering",
    body: [
      "Rule zero: user code never executes on the main web server process.",
      "Playground code runs in your browser inside Web Workers with network APIs removed, watchdog timeouts and output caps. Python runs as WebAssembly via Pyodide; SQL via SQLite-WASM.",
      "Hidden challenge tests are validated server-side inside capability-free WASM interpreters (Pyodide/QuickJS) with hard interrupt-based timeouts, memory limits and no filesystem or network access.",
      "The result: no host access, no database access, no credentials — and an execution environment that is destroyed after every run.",
    ],
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** Newest first, which is the order the index page renders. */
export const POSTS_BY_DATE = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
