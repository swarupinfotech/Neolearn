import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { updatePathProgress } from "@/services/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";

export const metadata: Metadata = { title: "Learning Path | NeoLearn" };

export default async function PathDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const path = await prisma.learningPath.findUnique({
    where: { slug },
    include: { certificates: { where: { userId: user.id }, take: 1 } },
  });
  if (!path) notFound();

  const courseIds = (path.courseIds as unknown as string[]) ?? [];
  const challengeIds = (path.challengeIds as unknown as string[]) ?? [];
  const projectIds = (path.projectIds as unknown as string[]) ?? [];

  // Recompute live progress (idempotent) so the page is always fresh.
  await updatePathProgress(user.id, path.id);
  const prog = await prisma.userPathProgress.findUnique({
    where: { userId_pathId: { userId: user.id, pathId: path.id } },
  });

  const [courses, challenges, projects, solvedChallenges, passedProjects] = await Promise.all([
    prisma.course.findMany({ where: { id: { in: courseIds } } }),
    prisma.challenge.findMany({ where: { id: { in: challengeIds } } }),
    prisma.project.findMany({ where: { id: { in: projectIds } } }),
    prisma.challengeAttempt.findMany({
      where: { userId: user.id, hiddenPassed: true, challengeId: { in: challengeIds } },
      select: { challengeId: true },
      distinct: ["challengeId"],
    }),
    prisma.projectSubmission.findMany({
      where: { userId: user.id, passed: true, projectId: { in: projectIds } },
      select: { projectId: true },
      distinct: ["projectId"],
    }),
  ]);

  const solvedSet = new Set(solvedChallenges.map((c) => c.challengeId));
  const projectDoneSet = new Set(passedProjects.map((p) => p.projectId));
  const courseProgress = await prisma.courseProgress.findMany({
    where: { userId: user.id, courseId: { in: courseIds } },
  });
  const courseDoneSet = new Set(courseProgress.filter((c) => c.completed).map((c) => c.courseId));

  const total = courseIds.length + challengeIds.length + projectIds.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="card p-6 border-l-4" style={{ borderLeftColor: path.color }}>
        <h1 className="text-2xl sm:text-3xl font-bold">{path.title}</h1>
        <p className="text-muted mt-2">{path.description}</p>
        {prog ? (
          <ProgressBar value={prog.progress} className="mt-5" label={`${prog.progress}% complete`} />
        ) : null}
        {prog?.completed ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-primary/40 bg-primary-soft p-4">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              Path completed! Your verifiable certificate is waiting.
            </span>
            <Link href="/certificates" className="ml-auto">
              <Button size="sm">View certificate</Button>
            </Link>
          </div>
        ) : null}
      </header>

      {courses.length > 0 ? (
        <section>
          <h2 className="font-semibold mb-3">Courses ({courses.length})</h2>
          <div className="space-y-2">
            {courses.map((c) => {
              const done = courseDoneSet.has(c.id);
              return (
                <Link key={c.id} href={`/courses/${c.slug}`} className="card p-4 flex items-center gap-3 card-hover">
                  {done ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> : <span className="h-5 w-5 rounded-full border-2 border-border shrink-0" />}
                  <span className="flex-1 font-medium">{c.title}</span>
                  {done ? <Badge tone="green">Done</Badge> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {challenges.length > 0 ? (
        <section>
          <h2 className="font-semibold mb-3">Challenges ({challenges.length})</h2>
          <div className="space-y-2">
            {challenges.map((c) => {
              const done = solvedSet.has(c.id);
              return (
                <Link key={c.id} href={`/challenges/${c.slug}`} className="card p-4 flex items-center gap-3 card-hover">
                  {done ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> : <span className="h-5 w-5 rounded-full border-2 border-border shrink-0" />}
                  <span className="flex-1 font-medium">{c.title}</span>
                  {done ? <Badge tone="green">Solved</Badge> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {projects.length > 0 ? (
        <section>
          <h2 className="font-semibold mb-3">Projects ({projects.length})</h2>
          <div className="space-y-2">
            {projects.map((p) => {
              const done = projectDoneSet.has(p.id);
              return (
                <Link key={p.id} href={`/projects/${p.slug}`} className="card p-4 flex items-center gap-3 card-hover">
                  {done ? <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> : <span className="h-5 w-5 rounded-full border-2 border-border shrink-0" />}
                  <span className="flex-1 font-medium">{p.title}</span>
                  {done ? <Badge tone="green">Done</Badge> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <p className="text-xs text-muted">
        Progress is computed automatically from your completions. {Math.min(100, Math.round(((courseDoneSet.size + solvedSet.size + projectDoneSet.size) / Math.max(1, total)) * 100))}% done.
      </p>
    </div>
  );
}