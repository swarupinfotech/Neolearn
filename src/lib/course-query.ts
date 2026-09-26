// ============================================================
// Course discovery query.
//
// Shared by the public catalog and the in-app search page so both
// agree on filtering, searching and sorting.
//
// Two deliberate choices:
//   - Searching is case-insensitive (`mode: "insensitive"`), because
//     PostgreSQL `contains` is case-sensitive by default and a learner
//     typing "python" must match "Python".
//   - `tags`, `technology` and `longDescription` are JSON/text columns
//     that Prisma cannot `contains` on directly, so they are matched in
//     memory after the database narrows the set.
// ============================================================

import { prisma } from "@/lib/db";
import { COURSE_CATEGORY_ALIASES, COURSE_SORTS, type CourseSort } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

export interface CourseFilters {
  q?: string;
  category?: string;
  difficulty?: string;
  technology?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export const DEFAULT_PAGE_SIZE = 12;

/** Expand a requested category into every stored label that maps to it. */
function categoryMatches(requested: string): string[] {
  if (!requested || requested === "All") return [];
  const canonical = COURSE_CATEGORY_ALIASES[requested] ?? requested;
  // A canonical label also matches any legacy alias pointing at it.
  const aliases = Object.entries(COURSE_CATEGORY_ALIASES)
    .filter(([, target]) => target === canonical)
    .map(([from]) => from);
  return [canonical, ...aliases];
}

function orderByFor(sort: string): Prisma.CourseOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ createdAt: "desc" }, { order: "asc" }];
    case "beginner":
      return [{ difficulty: "asc" }, { students: "desc" }];
    case "xp":
      return [{ xpReward: "desc" }, { students: "desc" }];
    case "rating":
      return [{ rating: "desc" }, { ratingCount: "desc" }];
    case "popular":
    default:
      return [{ students: "desc" }, { rating: "desc" }];
  }
}

export function isCourseSort(value: string): value is CourseSort {
  return COURSE_SORTS.some((s) => s.value === value);
}

/** Every category label present in the published catalog, canonical first. */
export async function publishedCategories(): Promise<string[]> {
  const rows = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: { category: true },
    distinct: ["category"],
  });
  return rows.map((r) => r.category).sort();
}

/** Every technology present in the published catalog. */
export async function publishedTechnologies(): Promise<string[]> {
  const rows = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    select: { technology: true, tags: true },
  });
  const out = new Set<string>();
  for (const r of rows) {
    if (r.technology) out.add(r.technology);
    if (Array.isArray(r.tags)) for (const t of r.tags) if (t) out.add(String(t));
  }
  return [...out].sort();
}

export interface CourseSearchResult {
  courses: CourseListItem[];
  total: number;
  totalPages: number;
  page: number;
  pageSize: number;
}

export interface CourseListItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  longDescription: string | null;
  category: string;
  language: string;
  technology: string | null;
  tags: unknown;
  difficulty: string;
  rating: number;
  ratingCount: number;
  students: number;
  duration: number;
  icon: string;
  color: string;
  xpReward: number;
  createdAt: Date;
}

export async function searchCourses(filters: CourseFilters): Promise<CourseSearchResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.max(1, Math.min(48, filters.pageSize ?? DEFAULT_PAGE_SIZE));
  const categories = categoryMatches(filters.category ?? "All");
  const term = (filters.q ?? "").trim();

  // `tags` and `technology` are matched in memory below, so the database
  // narrows by the scalar columns and pagination happens after filtering.
  const where: Prisma.CourseWhereInput = {
    status: "PUBLISHED",
    ...(categories.length > 0 ? { category: { in: categories } } : {}),
    ...(filters.difficulty && filters.difficulty !== "All" ? { difficulty: filters.difficulty } : {}),
  };

  const candidates = await prisma.course.findMany({
    where,
    orderBy: orderByFor(filters.sort ?? "popular"),
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      longDescription: true,
      category: true,
      language: true,
      technology: true,
      tags: true,
      difficulty: true,
      rating: true,
      ratingCount: true,
      students: true,
      duration: true,
      icon: true,
      color: true,
      xpReward: true,
      createdAt: true,
    },
  });

  const needle = term.toLowerCase();
  const filtered = candidates.filter((c) => {
    if (filters.technology && filters.technology !== "All") {
      const techs = [
        ...(c.technology ? [c.technology] : []),
        ...(Array.isArray(c.tags) ? c.tags.map(String) : []),
      ];
      if (!techs.includes(filters.technology)) return false;
    }
    if (needle) {
      const haystack = [
        c.title,
        c.description,
        c.longDescription ?? "",
        c.language,
        c.technology ?? "",
        ...(Array.isArray(c.tags) ? c.tags.map(String) : []),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    courses: filtered.slice((page - 1) * pageSize, page * pageSize),
    total,
    totalPages,
    page,
    pageSize,
  };
}
