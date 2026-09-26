import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { listProjects } from "@/services/projects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Projects | NeoLearn" };

const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"] as const;

const toneByDifficulty: Record<string, "green" | "amber" | "rose" | "neutral"> = {
  Beginner: "green",
  Intermediate: "amber",
  Advanced: "rose",
};

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ difficulty?: string; technology?: string }>;
}) {
  const user = await requireUser();
  const { difficulty = "All", technology = "All" } = await searchParams;

  const all = await listProjects();

  // Technology and difficulty live in JSON columns, so filtering happens
  // after the (small) published set is read.
  const technologies = Array.from(
    new Set(
      all.flatMap((p) => (Array.isArray(p.technologies) ? (p.technologies as unknown[]).map(String) : []))
    )
  ).sort();

  const projects = all.filter((p) => {
    if (difficulty !== "All" && p.difficulty !== difficulty) return false;
    if (technology !== "All") {
      const list = Array.isArray(p.technologies) ? (p.technologies as unknown[]).map(String) : [];
      if (!list.includes(technology)) return false;
    }
    return true;
  });

  const passed = await prisma.projectSubmission.findMany({
    where: { userId: user.id, passed: true },
    select: { projectId: true },
    distinct: ["projectId"],
  });
  const doneSet = new Set(passed.map((p) => p.projectId));

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <FolderKanban className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Projects</h1>
        </div>
        <p className="text-muted max-w-2xl">
          Build real, runnable projects with passing test suites. Server-graded against the full test set.
        </p>
      </header>

      <form method="GET" className="flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="difficulty">Difficulty</label>
        <select
          id="difficulty"
          name="difficulty"
          defaultValue={difficulty}
          className="h-9 px-3 rounded-lg border border-border bg-surface text-sm"
          aria-label="Difficulty"
        >
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d === "All" ? "All difficulties" : d}
            </option>
          ))}
        </select>
        {technologies.length > 0 ? (
          <>
            <label className="sr-only" htmlFor="technology">Technology</label>
            <select
              id="technology"
              name="technology"
              defaultValue={technology}
              className="h-9 px-3 rounded-lg border border-border bg-surface text-sm"
              aria-label="Technology"
            >
              <option value="All">All technologies</option>
              {technologies.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </>
        ) : null}
        <Button type="submit" size="sm" variant="secondary">
          Filter
        </Button>
      </form>

      {projects.length === 0 ? (
        <EmptyState title="No projects match" description="Try a different difficulty or technology." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => {
            const techs = Array.isArray(p.technologies) ? (p.technologies as unknown[]).map(String) : [];
            return (
              <Link key={p.id} href={`/projects/${p.slug}`}>
                <Card className="card-hover h-full">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">{p.title}</h3>
                    {doneSet.has(p.id) ? <Badge tone="green">Done</Badge> : <Badge tone="blue">{p.language}</Badge>}
                  </div>
                  <p className="text-sm text-muted mt-2 line-clamp-2">{p.description}</p>
                  {techs.length > 0 ? (
                    <p className="text-xs text-muted mt-3">{techs.slice(0, 3).join(" · ")}</p>
                  ) : null}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-xs text-primary font-semibold">+{p.xpReward} XP</span>
                    <span className="flex items-center gap-2">
                      {p.difficulty ? <Badge tone={toneByDifficulty[p.difficulty] ?? "neutral"}>{p.difficulty}</Badge> : null}
                      <span className="text-xs text-muted">
                        {Array.isArray(p.publicTests) ? p.publicTests.length : 0} tests
                      </span>
                    </span>
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
