import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, CheckCircle2, FileText, Circle, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/services/auth";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { LessonBlockRenderer } from "@/components/lesson/lesson-block-renderer";
import { LessonCompleteButton } from "@/components/lesson/lesson-complete-button";
import { track } from "@/lib/events";

export const metadata = { title: "Lesson | NeoLearn" };

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: { modules: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } },
          },
        },
      },
      progress: true,
    },
  });
  if (!lesson) notFound();

  const user = await getSessionUser();
  if (!user) {
    // require auth for lesson content (progress/XP must be tied to user)
    return (
      <div className="max-w-3xl mx-auto py-16">
        <EmptyState
          title="Sign in to start learning"
          description="Lessons, quizzes and XP are tied to your account."
          action={
            <Link href="/login">
              <Button>Log in</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const allLessons = lesson.module.course.modules.flatMap((m) => m.lessons);
  const idx = allLessons.findIndex((l) => l.id === lesson.id);
  const prev = idx > 0 ? allLessons[idx - 1] : null;
  const next = idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
  const progressRow = lesson.progress.find((p) => p.userId === user.id);
  const isCompleted = progressRow?.status === "completed";
  const pct = isCompleted ? 100 : progressRow?.progressPct ?? 0;
  const courseSlug = lesson.module.course.slug;

  const blocks = (lesson.content as unknown as Record<string, unknown>[]) ?? [];

  void track("lesson_start", { lessonId }, user.id);

  return (
    <div className="max-w-4xl mx-auto">
      <nav className="text-sm text-muted mb-5" aria-label="Breadcrumb">
        <Link href="/courses" className="hover:text-primary">Courses</Link> /{" "}
        <Link href={`/courses/${courseSlug}`} className="hover:text-primary">{lesson.module.course.title}</Link> /{" "}
        <span className="text-fg">{lesson.title}</span>
      </nav>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge tone={isCompleted ? "green" : "blue"}>{isCompleted ? "Completed" : "In progress"}</Badge>
            <Badge tone="neutral">{lesson.duration} min</Badge>
            <Badge tone="amber">+{lesson.xpReward} XP</Badge>
          </div>
          <h1 className="text-3xl font-bold">{lesson.title}</h1>
          <p className="text-sm text-muted mt-1">
            Lesson {idx + 1} of {allLessons.length} · {lesson.module.course.title}
          </p>
        </div>
        <div className="w-full sm:w-56">
          <ProgressBar value={pct} label="Lesson progress" />
        </div>
      </div>

      <div className="mt-8 space-y-6">
        <LessonBlockRenderer lessonId={lesson.id} blocks={blocks} />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
        <div className="flex gap-2">
          {prev ? (
            <Link href={`/learn/${prev.id}`}>
              <Button variant="secondary" size="sm">
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
            </Link>
          ) : null}
        </div>

        <LessonCompleteButton lessonId={lesson.id} isCompleted={isCompleted} />

        <div className="flex gap-2">
          {next ? (
            <Link href={`/learn/${next.id}`}>
              <Button size="sm">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href={`/courses/${courseSlug}`}>
              <Button size="sm" variant="secondary">
                Back to course <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 text-xs text-muted flex items-center gap-4">
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Autosaves progress</span>
        <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Micro-block format</span>
        <span className="flex items-center gap-1"><Circle className="h-3.5 w-3.5" /> Complete to earn XP</span>
      </div>
    </div>
  );
}