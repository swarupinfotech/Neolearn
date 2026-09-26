import type { Metadata } from "next";
import Link from "next/link";
import { ListChecks, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Practice | NeoLearn" };

export default async function PracticePage() {
  const user = await requireUser();

  const quizzes = await prisma.quiz.findMany({
    where: { type: "PRACTICE", status: "PUBLISHED" },
    include: { _count: { select: { questions: true } } },
    orderBy: [{ order: "asc" }, { title: "asc" }],
    take: 30,
  });

  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: user.id, passed: true },
    select: { quizId: true },
    distinct: ["quizId"],
  });
  const passedIds = new Set(attempts.map((a) => a.quizId));

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <ListChecks className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Practice</h1>
        </div>
        <p className="text-muted max-w-2xl">
          Short, targeted drills to build fluency. Each pass awards XP on first completion.
        </p>
      </header>

      {quizzes.length === 0 ? (
        <EmptyState title="No practice quizzes yet" description="Practice drills are being prepared." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((q) => (
            <Link key={q.id} href={`/quiz/${q.id}`}>
              <Card className="card-hover h-full">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">{q.title}</h3>
                  {passedIds.has(q.id) ? <Badge tone="green">Passed</Badge> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-muted">
                  <Badge tone="neutral">{q._count.questions} questions</Badge>
                  <Badge tone="neutral">Pass {q.passingScore}%</Badge>
                  <Badge tone="green">+{q.xpReward} XP</Badge>
                </div>
                <p className="flex items-center gap-1 text-xs text-primary mt-4 font-medium">
                  Start practice <Sparkles className="h-3 w-3" />
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}