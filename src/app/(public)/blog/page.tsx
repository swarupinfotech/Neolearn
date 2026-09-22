import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = {
  title: "Blog",
  description: "Articles on learning to code, career paths and platform updates.",
};

const POSTS = [
  {
    slug: "how-to-learn-programming-fast",
    title: "How to actually learn programming (without tutorial hell)",
    excerpt:
      "Why passive tutorials fail, and how active practice with challenges and projects builds real skill.",
    date: "2026-08-14",
    readMins: 6,
    tag: "Learning",
  },
  {
    slug: "python-vs-javascript-2026",
    title: "Python vs JavaScript in 2026: which should you learn first?",
    excerpt:
      "A practical comparison across job markets, learning curves and the kinds of projects each language shines at.",
    date: "2026-07-02",
    readMins: 8,
    tag: "Languages",
  },
  {
    slug: "why-streaks-work",
    title: "Why daily streaks (and daily missions) actually work",
    excerpt:
      "The behavioral science behind habit loops — and how we prevent streak farming in NeoLearn.",
    date: "2026-06-20",
    readMins: 5,
    tag: "Gamification",
  },
  {
    slug: "secure-code-execution-explained",
    title: "How NeoLearn runs your code safely",
    excerpt:
      "Inside the WASM sandbox architecture: no server execution, no secrets, no network, hard timeouts.",
    date: "2026-05-11",
    readMins: 7,
    tag: "Engineering",
  },
];

export default function BlogIndexPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <header className="mb-10">
        <h1 className="text-4xl font-bold">Blog</h1>
        <p className="text-muted mt-2">Learning advice, engineering deep-dives and platform news.</p>
      </header>

      <div className="space-y-5">
        {POSTS.map((p) => (
          <Link key={p.slug} href={`/blog/${p.slug}`}>
            <Card className="card-hover mb-5">
              <div className="flex items-center gap-3 text-xs text-muted mb-2">
                <Badge tone="green">{p.tag}</Badge>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {p.readMins} min read
                </span>
                <span>{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </div>
              <h2 className="font-semibold text-lg group-hover:text-primary flex items-center gap-2">
                {p.title} <ArrowRight className="h-4 w-4" />
              </h2>
              <p className="text-sm text-muted mt-1.5">{p.excerpt}</p>
            </Card>
          </Link>
        ))}
      </div>

      {POSTS.length === 0 ? <EmptyState title="No posts yet" /> : null}
    </div>
  );
}