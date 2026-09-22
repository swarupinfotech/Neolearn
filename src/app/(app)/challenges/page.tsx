import type { Metadata } from "next";
import Link from "next/link";
import { Swords } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { CHALLENGE_CATEGORIES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { listChallenges } from "@/services/challenges";

export const metadata: Metadata = { title: "Coding Challenges | NeoLearn" };

const DIFFICULTIES = ["All", "Easy", "Medium", "Hard"] as const;

const toneByDifficulty: Record<string, "green" | "amber" | "rose" | "neutral"> = {
  Easy: "green",
  Medium: "amber",
  Hard: "rose",
};

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; difficulty?: string }>;
}) {
  const user = await requireUser();
  const { category = "All", difficulty = "All" } = await searchParams;

  const challenges = await listChallenges({
    category: category === "All" ? undefined : category,
    difficulty: difficulty === "All" ? undefined : difficulty,
  });

  const attempts = await prisma.challengeAttempt.findMany({
    where: { userId: user.id, hiddenPassed: true },
    select: { challengeId: true },
    distinct: ["challengeId"],
  });
  const solved = new Set(attempts.map((a) => a.challengeId));

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Swords className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Coding Challenges</h1>
        </div>
        <p className="text-muted max-w-2xl">
          Solve challenges to build real skill. Public tests guide you; hidden tests validate your
          solution server-side — no shortcuts.
        </p>
      </header>

      <form method="GET" className="flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="category">Category</label>
        <select id="category" name="category" defaultValue={category} className="h-9 px-3 rounded-lg border border-border bg-surface text-sm" aria-label="Category">
          {CHALLENGE_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="difficulty">Difficulty</label>
        <select id="difficulty" name="difficulty" defaultValue={difficulty} className="h-9 px-3 rounded-lg border border-border bg-surface text-sm" aria-label="Difficulty">
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">Filter</Button>
      </form>

      {challenges.length === 0 ? (
        <EmptyState title="No challenges found" description="Try a different category or difficulty." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {challenges.map((c) => (
            <Link key={c.id} href={`/challenges/${c.slug}`}>
              <Card className="card-hover h-full">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone={toneByDifficulty[c.difficulty] ?? "neutral"}>{c.difficulty}</Badge>
                  {solved.has(c.id) ? <Badge tone="green">Solved</Badge> : null}
                </div>
                <h3 className="font-semibold mt-3 group-hover:text-primary transition-colors">{c.title}</h3>
                <p className="text-xs text-muted mt-1 uppercase tracking-wide">{c.category} · {c.language}</p>
                <p className="text-sm text-muted mt-2 line-clamp-2">{c.description}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="text-xs text-primary font-semibold">+{c.xpReward} XP</span>
                  <span className="text-xs text-muted">{c.publicTests ? (Array.isArray(c.publicTests) ? (c.publicTests as unknown[]).length : 0) : 0} public tests</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}