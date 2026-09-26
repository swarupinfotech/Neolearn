import type { Metadata } from "next";
import Link from "next/link";
import { CourseCard } from "@/components/course/course-card";
import { Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { Badge } from "@/components/ui/badge";
import { COURSE_SORTS } from "@/lib/constants";
import {
  searchCourses,
  publishedCategories,
  publishedTechnologies,
  DEFAULT_PAGE_SIZE,
} from "@/lib/course-query";

export const metadata: Metadata = {
  title: "Course Catalog — Programming, Web, Data, Security & DevOps",
  description:
    "Browse free courses across programming, web development, databases, cybersecurity, DevOps and cloud, and data & AI. Filter by category, level and technology.",
  alternates: { canonical: "/courses" },
  openGraph: {
    title: "Course Catalog | NeoLearn",
    description: "Free, project-based courses across six categories.",
    url: "/courses",
  },
};

const DIFFICULTY_OPTIONS = ["All", "Beginner", "Intermediate", "Advanced"] as const;

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; difficulty?: string; technology?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const category = sp.category ?? "All";
  const difficulty = sp.difficulty ?? "All";
  const technology = sp.technology ?? "All";
  const sort = COURSE_SORTS.some((s) => s.value === sp.sort) ? (sp.sort as string) : "popular";
  const pageNum = Math.max(1, Number(sp.page) || 1);

  const [result, categories, technologies] = await Promise.all([
    searchCourses({ q, category, difficulty, technology, sort, page: pageNum, pageSize: DEFAULT_PAGE_SIZE }),
    publishedCategories(),
    publishedTechnologies(),
  ]);

  const { courses, total, totalPages } = result;

  /** Preserve every active filter while changing one of them. */
  function hrefWith(patch: Record<string, string | number | undefined>) {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = {
      q,
      category,
      difficulty,
      technology,
      sort,
      page: pageNum,
      ...patch,
    };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === "" || v === "All" || (k === "sort" && v === "popular")) continue;
      if (k === "page" && v === 1) continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/courses?${qs}` : "/courses";
  }

  const hasFilters = q !== "" || category !== "All" || difficulty !== "All" || technology !== "All";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Course Catalog</h1>
        <p className="text-muted mt-1">
          {total} course{total === 1 ? "" : "s"}
          {hasFilters ? " match your filters" : " across programming, web, databases, security, DevOps and data & AI"}.
        </p>
      </header>

      <form method="GET" className="mb-6 flex flex-col lg:flex-row gap-3">
        <div className="flex-1">
          <label htmlFor="q" className="sr-only">
            Search courses
          </label>
          <Input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Search courses, languages, topics…"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            name="category"
            defaultValue={category}
            aria-label="Category"
            className="h-10 px-3 rounded-lg border border-border bg-surface text-sm"
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
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
            {DIFFICULTY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d === "All" ? "All levels" : d}
              </option>
            ))}
          </select>
          {technologies.length > 0 ? (
            <select
              name="technology"
              defaultValue={technology}
              aria-label="Technology"
              className="h-10 px-3 rounded-lg border border-border bg-surface text-sm"
            >
              <option value="All">All technologies</option>
              {technologies.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : null}
          <select
            name="sort"
            defaultValue={sort}
            aria-label="Sort by"
            className="h-10 px-3 rounded-lg border border-border bg-surface text-sm"
          >
            {COURSE_SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-10 px-4 rounded-lg bg-primary text-white dark:text-[#052e16] text-sm font-medium"
          >
            Filter
          </button>
          {hasFilters ? (
            <Link
              href="/courses"
              className="h-10 px-3 inline-flex items-center rounded-lg border border-border text-sm text-muted hover:text-fg"
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link href={hrefWith({ category: "All", page: 1 })}>
          <Badge tone={category === "All" ? "green" : "neutral"}>All</Badge>
        </Link>
        {categories.map((c) => (
          <Link key={c} href={hrefWith({ category: c, page: 1 })}>
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
                xpReward: c.xpReward,
                tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
              }}
            />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
          {pageNum > 1 ? (
            <Link
              href={hrefWith({ page: pageNum - 1 })}
              className="h-9 px-3 grid place-items-center rounded-lg border border-border text-sm hover:bg-surface2"
              rel="prev"
            >
              Prev
            </Link>
          ) : null}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - pageNum) <= 2 || p === 1 || p === totalPages)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const gap = prev !== undefined && p - prev > 1;
              return (
                <span key={p} className="flex items-center gap-2">
                  {gap ? <span className="text-muted text-sm">…</span> : null}
                  <Link
                    href={hrefWith({ page: p })}
                    className={
                      p === pageNum
                        ? "h-9 w-9 grid place-items-center rounded-lg bg-primary text-white dark:text-[#052e16] text-sm font-semibold"
                        : "h-9 w-9 grid place-items-center rounded-lg border border-border text-sm hover:bg-surface2"
                    }
                    aria-current={p === pageNum ? "page" : undefined}
                    aria-label={`Page ${p}`}
                  >
                    {p}
                  </Link>
                </span>
              );
            })}
          {pageNum < totalPages ? (
            <Link
              href={hrefWith({ page: pageNum + 1 })}
              className="h-9 px-3 grid place-items-center rounded-lg border border-border text-sm hover:bg-surface2"
              rel="next"
            >
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
