import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Users, Star, PlayCircle, CheckCircle2, Lock, Target, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/services/auth";
import { siteUrl, absoluteUrl } from "@/lib/site";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseId: string }>;
}): Promise<Metadata> {
  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { slug: courseId },
    select: { title: true, slug: true, description: true, longDescription: true, tags: true, status: true },
  });
  if (!course || course.status !== "PUBLISHED") return { title: "Course not found" };

  const description = (course.longDescription || course.description).slice(0, 158);
  const url = `${siteUrl()}/courses/${course.slug}`;
  const keywords = asStringArray(course.tags);

  return {
    title: `${course.title} — Free Course | NeoLearn`,
    description,
    keywords: keywords.length > 0 ? keywords : undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${course.title} | NeoLearn`,
      description,
      siteName: "NeoLearn",
    },
    twitter: { card: "summary_large_image", title: `${course.title} | NeoLearn`, description },
  };
}

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const course = await prisma.course.findUnique({
    where: { slug: courseId },
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: { lessons: { orderBy: { order: "asc" } } },
      },
      quizzes: { where: { status: "PUBLISHED" }, orderBy: [{ order: "asc" }, { id: "asc" }] },
    },
  });
  if (!course || course.status !== "PUBLISHED") notFound();

  const user = await getSessionUser();
  const [progress, completedSet] = await Promise.all([
    user
      ? prisma.courseProgress.findUnique({
          where: { userId_courseId: { userId: user.id, courseId: course.id } },
        })
      : Promise.resolve(null),
    user
      ? prisma.lessonProgress.findMany({
          where: { userId: user.id, status: "completed" },
          select: { lessonId: true },
        })
      : Promise.resolve([]),
  ]);
  const completed = new Set(completedSet.map((p) => p.lessonId));

  const allLessons = course.modules.flatMap((m) => m.lessons);
  const firstUncompleted = allLessons.find((l) => !completed.has(l.id));
  const continueLesson = progress?.lastLessonId
    ? allLessons.find((l) => l.id === progress.lastLessonId)
    : firstUncompleted;
  const startLesson = continueLesson ?? firstUncompleted ?? allLessons[0];
  const doneCount = completed.size;
  const totalCount = allLessons.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const objectives = asStringArray(course.objectives);
  const tags = asStringArray(course.tags);

  // Structured data so the course can appear as a rich result.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: (course.longDescription || course.description).slice(0, 300),
    url: absoluteUrl(`/courses/${course.slug}`),
    ...(course.language ? { inLanguage: course.language } : {}),
    ...(tags.length > 0 ? { keywords: tags.join(", ") } : {}),
    provider: { "@type": "Organization", name: "NeoLearn", url: siteUrl() },
    ...(course.ratingCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: course.rating.toFixed(1),
            reviewCount: course.ratingCount,
            bestRating: 5,
          },
        }
      : {}),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${Math.max(1, Math.round(course.duration / 60))}H`,
    },
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD", availability: "https://schema.org/InStock" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Structured data is derived from our own database content.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav className="text-sm text-muted mb-6" aria-label="Breadcrumb">
          <Link href="/courses" className="hover:text-primary">
            Courses
          </Link>{" "}
          / <span className="text-fg">{course.title}</span>
        </nav>

        <header className="card p-6 sm:p-8 border-l-4" style={{ borderLeftColor: course.color }}>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge>{course.category}</Badge>
            <Badge tone="amber">{course.difficulty}</Badge>
            <Badge tone="blue">{course.language}</Badge>
          </div>
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <p className="text-muted mt-2 max-w-3xl">{course.description}</p>
          {course.longDescription ? (
            <p className="text-sm text-muted mt-3 max-w-3xl whitespace-pre-wrap">{course.longDescription}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4 mt-5 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500" /> {course.rating.toFixed(1)} ({course.ratingCount})
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> {course.students.toLocaleString()} students
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {course.duration} min
            </span>
            <span className="flex items-center gap-1">
              <PlayCircle className="h-4 w-4" /> {totalCount} lessons
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="h-4 w-4" /> {course.xpReward} XP on completion
            </span>
          </div>

          {tags.length > 0 ? (
            <ul className="flex flex-wrap gap-2 mt-4" aria-label="Topics covered">
              {tags.map((t) => (
                <li key={t}>
                  <Link href={`/courses?q=${encodeURIComponent(t)}`}>
                    <Badge tone="neutral">{t}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {user && totalCount > 0 ? (
            <ProgressBar value={pct} className="mt-5 max-w-md" label={`${doneCount}/${totalCount} lessons`} />
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {startLesson ? (
              <Link href={`/learn/${startLesson.id}`}>
                <Button size="lg">
                  {pct > 0 ? "Continue learning" : "Start course"}
                </Button>
              </Link>
            ) : null}
            {user && course.quizzes[0] ? (
              <Link href={`/quiz/${course.quizzes[0].id}`}>
                <Button size="lg" variant="secondary">
                  Take course quiz
                </Button>
              </Link>
            ) : null}
            {!user ? (
              <Link href="/signup">
                <Button size="lg" variant="secondary">
                  Sign up to start
                </Button>
              </Link>
            ) : null}
          </div>
        </header>

        {objectives.length > 0 ? (
          <section className="mt-8" aria-labelledby="course-objectives">
            <h2 id="course-objectives" className="font-semibold text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" /> What you will be able to do
            </h2>
            <ul className="mt-3 grid sm:grid-cols-2 gap-2">
              {objectives.map((o) => (
                <li key={o} className="flex items-start gap-2 text-sm text-muted">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {course.quizzes.length > 0 ? (
          <section className="mt-8" aria-labelledby="course-assessments">
            <h2 id="course-assessments" className="font-semibold text-lg">Assessments</h2>
            <ul className="mt-3 space-y-2">
              {course.quizzes.map((q) => (
                <li key={q.id}>
                  <Link href={`/quiz/${q.id}`} className="block">
                    <Card className="card-hover flex flex-wrap items-center justify-between gap-3">
                      <span>
                        <span className="font-medium text-sm">{q.title}</span>
                        <span className="block text-xs text-muted mt-0.5">
                          {q.type === "ASSESSMENT" ? "Final assessment" : q.type === "COURSE" ? "Course quiz" : "Practice"}
                          {" · "}
                          {q.passingScore}% to pass
                        </span>
                      </span>
                      <Badge tone="blue">+{q.xpReward} XP</Badge>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mt-8 space-y-6" aria-label="Course modules">
          {course.modules.map((mod, idx) => (
            <Card key={mod.id}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">
                  Module {idx + 1}: {mod.title}
                </h2>
                <span className="text-xs text-muted">{mod.lessons.length} lessons</span>
              </div>
              <ul className="divide-y divide-border">
                {mod.lessons.map((lesson, li) => {
                  const isDone = completed.has(lesson.id);
                  const isCurrent = startLesson?.id === lesson.id && !isDone;
                  const isLocked = !user; // lessons require an account
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={isLocked ? "/signup" : `/learn/${lesson.id}`}
                        className="flex items-center gap-3 py-3 group"
                        aria-label={`${lesson.title}${isDone ? " (completed)" : ""}`}
                      >
                        <span
                          className={
                            isDone
                              ? "text-primary"
                              : isLocked
                                ? "text-muted"
                                : isCurrent
                                  ? "text-primary"
                                  : "text-muted"
                          }
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : isLocked ? (
                            <Lock className="h-4 w-4" />
                          ) : (
                            <PlayCircle className="h-5 w-5" />
                          )}
                        </span>
                        <span className="flex-1">
                          <span className={`text-sm ${isDone ? "text-muted line-through decoration-border" : "font-medium group-hover:text-primary"}`}>
                            {li + 1}. {lesson.title}
                          </span>
                          <span className="block text-xs text-muted mt-0.5">
                            {lesson.duration} min · {lesson.type}
                          </span>
                        </span>
                        {isCurrent ? <Badge tone="green">Current</Badge> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </section>

        {course.modules.length === 0 ? (
          <EmptyState title="No lessons yet" description="This course is still being prepared." />
        ) : null}
      </div>
    </>
  );
}