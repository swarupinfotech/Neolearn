import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Lock, Sparkles, Target } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { updatePathProgress } from "@/services/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";

export const metadata: Metadata = { title: "Learning Path | NeoLearn" };

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

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
  const prerequisitePathIds = asStringArray(path.prerequisitePathIds);
  const finalQuizId = (path.finalQuizId as string | null) ?? null;

  // A path may reference content that is not published yet; only surface
  // what a learner can actually open.
  const [courses, challenges, projects] = await Promise.all([
    prisma.course.findMany({ where: { id: { in: courseIds }, status: "PUBLISHED" } }),
    prisma.challenge.findMany({ where: { id: { in: challengeIds }, status: "PUBLISHED" } }),
    prisma.project.findMany({ where: { id: { in: projectIds }, status: "PUBLISHED" } }),
  ]);

  // Recompute live progress (idempotent) so the page is always fresh.
  await updatePathProgress(user.id, path.id);
  const prog = await prisma.userPathProgress.findUnique({
    where: { userId_pathId: { userId: user.id, pathId: path.id } },
  });

  const [solvedChallenges, passedProjects] = await Promise.all([
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

  // Progress is measured against the content a learner can actually open,
  // so an unpublished reference does not leave the bar permanently short.
  const total = courses.length + challenges.length + projects.length;

  // Prerequisite paths gate the certificate, not the content: a learner can
  // always browse, but the badge tells them what to finish first.
  const prerequisites = prerequisitePathIds.length
    ? await prisma.learningPath.findMany({
        where: { id: { in: prerequisitePathIds } },
        select: { id: true, slug: true, title: true },
      })
    : [];
  const donePrerequisiteIds = prerequisites.length
    ? (
        await prisma.userPathProgress.findMany({
          where: { userId: user.id, pathId: { in: prerequisites.map((p) => p.id) }, completed: true },
          select: { pathId: true },
        })
      ).map((p) => p.pathId)
    : [];
  const unmetPrerequisites = prerequisites.filter((p) => !donePrerequisiteIds.includes(p.id));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="card p-6 border-l-4" style={{ borderLeftColor: path.color }}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {path.level ? <Badge tone="amber">{path.level}</Badge> : null}
          <Badge tone="blue">
            {courses.length} course{courses.length === 1 ? "" : "s"}
          </Badge>
          {challenges.length > 0 ? <Badge tone="neutral">{challenges.length} challenges</Badge> : null}
          {projects.length > 0 ? <Badge tone="neutral">{projects.length} projects</Badge> : null}
          {path.xpReward > 0 ? (
            <Badge tone="green">
              <Sparkles className="h-3 w-3" /> {path.xpReward} XP
            </Badge>
          ) : null}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">{path.title}</h1>
        <p className="text-muted mt-2">{path.description}</p>
        {path.longDescription ? (
          <p className="text-sm text-muted mt-3 whitespace-pre-wrap">{path.longDescription}</p>
        ) : null}
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
        {unmetPrerequisites.length > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-300 dark:border-amber-800 p-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <Lock className="h-4 w-4" /> Complete these paths first
            </p>
            <ul className="mt-2 space-y-1">
              {unmetPrerequisites.map((p) => (
                <li key={p.id}>
                  <Link href={`/paths/${p.slug}`} className="text-sm text-primary hover:underline">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted mt-2">
              You can still work through this path — the certificate unlocks once the prerequisites are done.
            </p>
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

      {finalQuizId ? <FinalAssessment quizId={finalQuizId} /> : null}

      <p className="text-xs text-muted">
        Progress is computed automatically from your completions. {Math.min(100, Math.round(((courseDoneSet.size + solvedSet.size + projectDoneSet.size) / Math.max(1, total)) * 100))}% done.
      </p>
    </div>
  );
}

async function FinalAssessment({ quizId }: { quizId: string }) {
  // An unpublished final assessment must not be advertised on a live path.
  const quiz = await prisma.quiz.findFirst({
    where: { id: quizId, status: "PUBLISHED" },
    select: { id: true, title: true, description: true, passingScore: true, xpReward: true },
  });
  if (!quiz) return null;

  return (
    <section aria-labelledby="path-final-assessment">
      <h2 id="path-final-assessment" className="font-semibold mb-3 flex items-center gap-2">
        <Target className="h-5 w-5 text-primary" /> Final assessment
      </h2>
      <Link href={`/quiz/${quiz.id}`} className="block">
        <Card className="card-hover flex flex-wrap items-center justify-between gap-3">
          <span>
            <span className="font-medium">{quiz.title}</span>
            {quiz.description ? (
              <span className="block text-xs text-muted mt-0.5">{quiz.description}</span>
            ) : null}
            <span className="block text-xs text-muted mt-0.5">{quiz.passingScore}% to pass</span>
          </span>
          <Badge tone="green">+{quiz.xpReward} XP</Badge>
        </Card>
      </Link>
    </section>
  );
}