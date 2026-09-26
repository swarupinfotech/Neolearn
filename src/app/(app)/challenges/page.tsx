import type { Metadata } from "next";
import Link from "next/link";
import { Swords } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { CHALLENGE_CATEGORIES, CHALLENGE_DIFFICULTIES, CHALLENGE_LANGUAGES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { listChallenges, isExecutableLanguage } from "@/services/challenges";

export const metadata: Metadata = { title: "Coding Challenges | NeoLearn" };

const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  sql: "SQL",
  html: "HTML/CSS",
  c: "C",
  cpp: "C++",
  java: "Java",
  php: "PHP",
  go: "Go",
};

const toneByDifficulty: Record<string, "green" | "amber" | "rose" | "neutral"> = {
  Easy: "green",
  Medium: "amber",
  Hard: "rose",
};

export default async function ChallengesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; difficulty?: string; language?: string }>;
}) {
  const user = await requireUser();
  const { category = "All", difficulty = "All", language = "All" } = await searchParams;

  const [challenges, allCategories] = await Promise.all([
    listChallenges({
      category: category === "All" ? undefined : category,
      difficulty: difficulty === "All" ? undefined : difficulty,
    }),
    prisma.challenge.findMany({
      where: { status: "PUBLISHED" },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  // Language filtering is applied in memory because `language` is a free
  // text column holding the authoring key ("cpp", not "C++").
  const visible = language === "All" ? challenges : challenges.filter((c) => c.language === language);

  const attempts = await prisma.challengeAttempt.findMany({
    where: { userId: user.id, hiddenPassed: true },
    select: { challengeId: true },
    distinct: ["challengeId"],
  });
  const solved = new Set(attempts.map((a) => a.challengeId));

  const categoryOptions = Array.from(
    new Set<string>([...allCategories.map((c) => c.category), ...CHALLENGE_CATEGORIES])
  ).sort();

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
          <option value="All">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="language">Language</label>
        <select id="language" name="language" defaultValue={language} className="h-9 px-3 rounded-lg border border-border bg-surface text-sm" aria-label="Language">
          <option value="All">All languages</option>
          {CHALLENGE_LANGUAGES.map((l) => (
            <option key={l} value={l}>{LANGUAGE_LABEL[l] ?? l}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="difficulty">Difficulty</label>
        <select id="difficulty" name="difficulty" defaultValue={difficulty} className="h-9 px-3 rounded-lg border border-border bg-surface text-sm" aria-label="Difficulty">
          <option value="All">All difficulties</option>
          {CHALLENGE_DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary">Filter</Button>
      </form>

      {visible.length === 0 ? (
        <EmptyState title="No challenges found" description="Try a different category, language or difficulty." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((c) => {
            const langKey = c.language.toLowerCase();
            const label = LANGUAGE_LABEL[langKey] ?? c.language;
            const publicCount = Array.isArray(c.publicTests) ? c.publicTests.length : 0;
            return (
              <Link key={c.id} href={`/challenges/${c.slug}`}>
                <Card className="card-hover h-full">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={toneByDifficulty[c.difficulty] ?? "neutral"}>{c.difficulty}</Badge>
                    {solved.has(c.id) ? <Badge tone="green">Solved</Badge> : null}
                  </div>
                  <h3 className="font-semibold mt-3 group-hover:text-primary transition-colors">{c.title}</h3>
                  <p className="text-xs text-muted mt-1 uppercase tracking-wide">
                    {c.category} · {label}
                    {!isExecutableLanguage(langKey) ? " · output-graded" : ""}
                  </p>
                  <p className="text-sm text-muted mt-2 line-clamp-2">{c.description}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-xs text-primary font-semibold">+{c.xpReward} XP</span>
                    <span className="text-xs text-muted">{publicCount} public tests</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}