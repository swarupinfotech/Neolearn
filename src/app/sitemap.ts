import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { POSTS_BY_DATE } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

/**
 * Sitemap for publicly indexable content.
 *
 * Only PUBLISHED content is listed. The learner area (`/(app)`), the
 * lesson player, the quiz runner and the API surface are all `noindex`
 * or authenticated, so they are deliberately absent here and disallowed
 * in robots.ts.
 *
 * Paths, projects and challenges have no `updatedAt` column, so their
 * entries omit `lastModified` rather than reporting a fake one.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const [courses, paths, projects, challenges] = await Promise.all([
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.learningPath.findMany({
      select: { slug: true },
    }),
    prisma.project.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    }),
    prisma.challenge.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/courses"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/pricing"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: absoluteUrl("/blog"), lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];

  return [
    ...staticRoutes,
    ...courses.map((c) => ({
      url: absoluteUrl(`/courses/${c.slug}`),
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...paths.map((p) => ({
      url: absoluteUrl(`/paths/${p.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...projects.map((p) => ({
      url: absoluteUrl(`/projects/${p.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...challenges.map((c) => ({
      url: absoluteUrl(`/challenges/${c.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
    ...POSTS_BY_DATE.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: new Date(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
  ];
}
