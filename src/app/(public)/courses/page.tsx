import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { CourseCard } from "@/components/course/course-card";
import { Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Courses",
  description: "Browse programming, web, database, cybersecurity and DevOps courses.",
};

const CATEGORIES = ["All", "Programming", "Web Development", "Database", "Cybersecurity", "DevOps"];
const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"];

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; difficulty?: string; page?: string }>;
}) {
  const { q = "", category = "All", difficulty = "All", page = "1" } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = 12;

  const where = {
    status: "PUBLISHED" as const,
    ...(category !== "All" ? { category } : {}),
    ...(difficulty !== "All" ? { difficulty } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { language: { contains: q } },
          ],
        }
      : {}),
  };

  const result = await Promise.all([
    prisma.course.findMany({
      where,
      orderBy: { students: "desc" },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.course.count({ where }),
  ]).catch(() => null);

  const courses = result ? result[0] : [];
  const total = result ? result[1] : 0;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-bold">Course Catalog</h1>
          <p className="text-muted mt-1">
            {total} course{total === 1 ? "" : "s"} across programming, web, databases, security and
            DevOps.
          </p>
        </header>

        <form method="GET" className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="q" className="sr-only">Search courses</label>
            <Input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Search courses, languages…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              name="category"
              defaultValue={category}
              aria-label="Category"
              className="h-10 px-3 rounded-lg border border-border bg-surface text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              name="difficulty"
              defaultValue={difficulty}
              aria-label="Difficulty"
              className="h-10 px-3 rounded-lg border border-border bg-surface text-sm"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-primary text-white dark:text-[#052e16] text-sm font-medium"
            >
              Filter
            </button>
          </div>
        </form>

        <div className="flex flex-wrap gap-2 mb-6">
          {CATEGORIES.map((c) => (
            <Link
              key={c}
              href={c === "All" ? "/courses" : `/courses?category=${encodeURIComponent(c)}`}
            >
              <Badge tone={category === c ? "green" : "neutral"}>{c}</Badge>
            </Link>
          ))}
        </div>

        {courses.length === 0 ? (
          <EmptyState
            title="No courses found"
            description="Try a different search term or clear the filters."
            action={
              <Link href="/courses" className="text-primary text-sm font-medium hover:underline">
                Clear filters
              </Link>
            }
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map((c) => (
              <CourseCard
                key={c.id}
                course={{
                  id: c.id,
                  slug: c.slug,
                  title: c.title,
                  description: c.description,
                  category: c.category,
                  language: c.language,
                  difficulty: c.difficulty,
                  rating: c.rating,
                  students: c.students,
                  duration: c.duration,
                  icon: c.icon,
                  color: c.color,
                }}
              />
            ))}
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`/courses?q=${encodeURIComponent(q)}&category=${encodeURIComponent(category)}&difficulty=${encodeURIComponent(difficulty)}&page=${p}`}
                className={
                  p === pageNum
                    ? "h-9 w-9 grid place-items-center rounded-lg bg-primary text-white dark:text-[#052e16] text-sm font-semibold"
                    : "h-9 w-9 grid place-items-center rounded-lg border border-border text-sm hover:bg-surface2"
                }
                aria-current={p === pageNum ? "page" : undefined}
              >
                {p}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </>
  );
}