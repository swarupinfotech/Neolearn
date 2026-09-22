import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, CheckCircle2, Circle } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { ProgressBar } from "@/components/ui/progress-bar";

export const metadata: Metadata = { title: "Learning Paths | NeoLearn" };

export default async function PathsPage() {
  const user = await requireUser();

  const paths = await prisma.learningPath.findMany({ orderBy: { title: "asc" } });
  const progress = await prisma.userPathProgress.findMany({ where: { userId: user.id } });
  const progressMap = new Map(progress.map((p) => [p.pathId, p]));
  const courseCounts = new Map<string, number>();

  for (const p of paths) {
    const ids = (p.courseIds as unknown as string[]) ?? [];
    const n = ids.length > 0 ? await prisma.course.count({ where: { id: { in: ids } } }) : 0;
    courseCounts.set(p.id, n);
  }

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Learning Paths</h1>
        </div>
        <p className="text-muted max-w-2xl">
          Follow a structured route of courses, challenges and projects. Finish a path to earn a
          verifiable certificate.
        </p>
      </header>

      {paths.length === 0 ? (
        <EmptyState title="No learning paths yet" description="Structured paths are being prepared." />
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {paths.map((p) => {
            const prog = progressMap.get(p.id);
            const courseIds = (p.courseIds as unknown as string[]) ?? [];
            const challengeIds = (p.challengeIds as unknown as string[]) ?? [];
            const projectIds = (p.projectIds as unknown as string[]) ?? [];
            const total = courseIds.length + challengeIds.length + projectIds.length;
            return (
              <Link key={p.id} href={`/paths/${p.slug}`}>
                <Card className="card-hover h-full p-6 border-l-4" style={{ borderLeftColor: p.color }}>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-lg group-hover:text-primary transition-colors">{p.title}</h2>
                    {prog?.completed ? <Badge tone="green">Completed ✓</Badge> : null}
                  </div>
                  <p className="text-sm text-muted mt-1.5">{p.description}</p>
                  <div className="flex flex-wrap gap-2 mt-4 text-xs text-muted">
                    <span className="flex items-center gap-1"><Circle className="h-3 w-3" /> {courseCounts.get(p.id) ?? courseIds.length} courses</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {challengeIds.length} challenges</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> {projectIds.length} projects</span>
                  </div>
                  {prog ? (
                    <ProgressBar value={prog.progress} className="mt-4" label={`${prog.progress}% complete`} />
                  ) : (
                    <div className="mt-4">
                      <Button size="sm" variant="secondary">Start path</Button>
                    </div>
                  )}
                  <p className="text-xs text-muted mt-3">
                    {total} total items · Earn a certificate on completion
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}