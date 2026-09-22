import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const POSTS: Record<string, { title: string; date: string; tag: string; readMins: number; body: string[] }> = {
  "how-to-learn-programming-fast": {
    title: "How to actually learn programming (without tutorial hell)",
    date: "2026-08-14",
    tag: "Learning",
    readMins: 6,
    body: [
      "Watching someone else code feels productive — until you open a blank editor. The gap between recognition and recall is where most learners stall.",
      "The fix is active practice: after every concept, write code without looking. Run it. Break it. Fix it. NeoLearn lessons are structured exactly this way — concept, example, try-it, question, challenge.",
      "Spaced repetition matters too. A 10-minute daily session with a streak beats a 6-hour weekend binge, because your brain consolidates sleep-spaced practice.",
      "Finally, build projects with real requirements. A to-do app with tests teaches more than ten more tutorial videos, because debugging *is* the skill.",
    ],
  },
  "python-vs-javascript-2026": {
    title: "Python vs JavaScript in 2026: which should you learn first?",
    date: "2026-07-02",
    tag: "Languages",
    readMins: 8,
    body: [
      "Python remains the gentlest on-ramp: readable syntax, huge ecosystem for data and AI, and immediate feedback via scripts.",
      "JavaScript owns the browser — if your goal is shipping interfaces and full-stack apps with Node, JS is unavoidable.",
      "Our advice: pick the language tied to your goal. Data/AI/security tooling → Python. Web products → JavaScript/TypeScript. Learn the second language after finishing your first path.",
      "The good news: fundamentals transfer. Variables, loops, functions and data structures are the same concepts wearing different syntax.",
    ],
  },
  "why-streaks-work": {
    title: "Why daily streaks (and daily missions) actually work",
    date: "2026-06-20",
    tag: "Gamification",
    readMins: 5,
    body: [
      "Streaks convert a vague goal (\"learn to code\") into a concrete daily contract: do one meaningful thing today.",
      "But streaks only work if they're honest. Client-side streaks are trivially forgeable, so NeoLearn computes streaks server-side from stored activity dates — one activity counts once per UTC day.",
      "Daily missions add variety: one lesson, one quiz, one challenge. Completing all three earns bonus XP, but the reward is validated and de-duplicated per day.",
    ],
  },
  "secure-code-execution-explained": {
    title: "How NeoLearn runs your code safely",
    date: "2026-05-11",
    tag: "Engineering",
    readMins: 7,
    body: [
      "Rule zero: user code never executes on the main web server process.",
      "Playground code runs in your browser inside Web Workers with network APIs removed, watchdog timeouts and output caps. Python runs as WebAssembly via Pyodide; SQL via SQLite-WASM.",
      "Hidden challenge tests are validated server-side inside capability-free WASM interpreters (Pyodide/QuickJS) with hard interrupt-based timeouts, memory limits and no filesystem or network access.",
      "The result: no host access, no database access, no credentials — and an execution environment that is destroyed after every run.",
    ],
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) return { title: "Post not found" };
  return { title: post.title, description: post.body[0] };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = POSTS[slug];
  if (!post) notFound();

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <Link href="/blog" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-6">
        <ArrowLeft className="h-4 w-4" /> All posts
      </Link>
      <header>
        <div className="flex items-center gap-3 text-xs text-muted mb-3">
          <Badge tone="green">{post.tag}</Badge>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" /> {post.readMins} min
          </span>
          <span>{new Date(post.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight">{post.title}</h1>
      </header>
      <div className="mt-8 space-y-5 text-[17px] leading-relaxed text-fg/90">
        {post.body.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </article>
  );
}