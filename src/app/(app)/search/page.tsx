import type { Metadata } from "next";
import Link from "next/link";
import { Search, BookOpen, Swords, FolderKanban, Route, FileText, Users, MessageSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { searchCourses } from "@/lib/course-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Search | NeoLearn", robots: { index: false, follow: true } };

const TYPES = ["all", "courses", "paths", "challenges", "projects", "lessons", "users", "community"] as const;
type SearchType = (typeof TYPES)[number];

const TYPE_LABEL: Record<SearchType, string> = {
  all: "All",
  courses: "Courses",
  paths: "Paths",
  challenges: "Challenges",
  projects: "Projects",
  lessons: "Lessons",
  users: "People",
  community: "Community",
};

const PER_TYPE = 6;

/** PostgreSQL `contains` is case-sensitive by default; search must not be. */
function text(query: string) {
  return { contains: query, mode: "insensitive" as const };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  await requireUser();
  const { q = "", type = "all" } = await searchParams;
  const query = q.trim();
  const active: SearchType = (TYPES as readonly string[]).includes(type) ? (type as SearchType) : "all";
  const want = (t: SearchType) => active === "all" || active === t;

  // A lesson is only searchable if its course is published, so that filter
  // belongs in the query. Filtering after `take` would let drafts consume
  // result slots and push real matches off the page.
  const lessonWhere = {
    OR: [{ title: text(query) }, { content: text(query) }],
    module: { course: { status: "PUBLISHED" as const } },
  };

  // Counts are computed for every type regardless of the active filter, so the
  // type tabs always show real totals. Row queries stay limited to the type
  // being viewed, which keeps the result page cheap.
  const [courseTotal, pathCount, challengeCount, projectCount, lessonCount, userCount, postCount] = query
    ? await Promise.all([
        searchCourses({ q: query, pageSize: PER_TYPE }).then((r) => r.total),
        prisma.learningPath.count({
          where: {
            OR: [{ title: text(query) }, { description: text(query) }, { longDescription: text(query) }],
          },
        }),
        prisma.challenge.count({
          where: {
            status: "PUBLISHED",
            OR: [{ title: text(query) }, { description: text(query) }, { category: text(query) }],
          },
        }),
        prisma.project.count({
          where: {
            status: "PUBLISHED",
            OR: [{ title: text(query) }, { description: text(query) }],
          },
        }),
        prisma.lesson.count({ where: lessonWhere }),
        prisma.user.count({
          where: { OR: [{ username: text(query) }, { displayName: text(query) }] },
        }),
        prisma.communityPost.count({
          where: { OR: [{ title: text(query) }, { body: text(query) }] },
        }),
      ])
    : [0, 0, 0, 0, 0, 0, 0];

  // Unpublished content must never be discoverable, so every content row
  // query is pinned to PUBLISHED.
  const [courses, paths, challenges, projects, lessons, users, posts] = query
    ? await Promise.all([
        want("courses")
          ? searchCourses({ q: query, pageSize: PER_TYPE }).then((r) => r.courses)
          : Promise.resolve([]),
        want("paths")
          ? prisma.learningPath.findMany({
              where: {
                OR: [{ title: text(query) }, { description: text(query) }, { longDescription: text(query) }],
              },
              take: PER_TYPE,
              select: { id: true, slug: true, title: true, description: true, level: true, courseIds: true },
            })
          : Promise.resolve([]),
        want("challenges")
          ? prisma.challenge.findMany({
              where: {
                status: "PUBLISHED",
                OR: [{ title: text(query) }, { description: text(query) }, { category: text(query) }],
              },
              take: PER_TYPE,
              select: { id: true, slug: true, title: true, description: true, difficulty: true, language: true },
            })
          : Promise.resolve([]),
        want("projects")
          ? prisma.project.findMany({
              where: {
                status: "PUBLISHED",
                OR: [{ title: text(query) }, { description: text(query) }],
              },
              take: PER_TYPE,
              select: { id: true, slug: true, title: true, description: true, language: true, difficulty: true },
            })
          : Promise.resolve([]),
        want("lessons")
          ? prisma.lesson.findMany({
              where: lessonWhere,
              take: PER_TYPE,
              select: {
                id: true,
                title: true,
                module: { select: { course: { select: { slug: true, title: true } } } },
              },
            })
          : Promise.resolve([]),
        want("users")
          ? prisma.user.findMany({
              where: { OR: [{ username: text(query) }, { displayName: text(query) }] },
              take: PER_TYPE,
              select: { id: true, username: true, displayName: true, avatarUrl: true, xp: true },
            })
          : Promise.resolve([]),
        want("community")
          ? prisma.communityPost.findMany({
              where: { OR: [{ title: text(query) }, { body: text(query) }] },
              take: PER_TYPE,
              select: { id: true, title: true, body: true },
            })
          : Promise.resolve([]),
      ])
    : [[], [], [], [], [], [], []];

  const groups: { key: SearchType; count: number }[] = [
    { key: "courses", count: courseTotal },
    { key: "paths", count: pathCount },
    { key: "challenges", count: challengeCount },
    { key: "projects", count: projectCount },
    { key: "lessons", count: lessonCount },
    { key: "users", count: userCount },
    { key: "community", count: postCount },
  ];
  const total = groups.reduce((n, g) => n + g.count, 0);
  // How many hits the *viewed* type actually has, so a type tab with matches
  // but nothing to render gets its own message instead of a blank page.
  const activeCount = active === "all" ? total : (groups.find((g) => g.key === active)?.count ?? 0);

  function typeHref(t: SearchType) {
    return t === "all" ? `/search?q=${encodeURIComponent(query)}` : `/search?q=${encodeURIComponent(query)}&type=${t}`;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Search</h1>
        </div>
        <form method="GET" className="mt-4">
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <div className="flex gap-2">
            <input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Search courses, paths, challenges, projects, lessons, people…"
              className="flex-1 h-11 px-4 rounded-lg border border-border bg-surface text-sm"
            />
            {active !== "all" ? <input type="hidden" name="type" value={active} /> : null}
            <button
              className="h-11 px-5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-strong"
              type="submit"
            >
              Search
            </button>
          </div>
        </form>
      </header>

      {!query ? (
        <EmptyState
          title="Type something to search"
          description="Find courses, learning paths, challenges, projects, individual lessons, community posts and learners."
        />
      ) : (
        <>
          <nav className="flex flex-wrap gap-2" aria-label="Filter results by type">
            <Link href={typeHref("all")}>
              <Badge tone={active === "all" ? "green" : "neutral"}>All ({total})</Badge>
            </Link>
            {groups.map((g) => (
              <Link key={g.key} href={typeHref(g.key)}>
                <Badge tone={active === g.key ? "green" : "neutral"}>
                  {TYPE_LABEL[g.key]} ({g.count})
                </Badge>
              </Link>
            ))}
          </nav>

          {total === 0 ? (
            <EmptyState
              title="No results"
              description={`Nothing matched "${query}". Try different keywords or another content type.`}
            />
          ) : activeCount === 0 ? (
            <EmptyState
              title={`No ${TYPE_LABEL[active].toLowerCase()} found`}
              description={`${total} result${total === 1 ? "" : "s"} matched "${query}", but none of them are ${TYPE_LABEL[active].toLowerCase()}.`}
            />
          ) : (
            <>
              {users.length > 0 ? (
                <Section title="People" icon={<Users className="h-4 w-4" />}>
                  {users.map((u) => (
                    <Link key={u.id} href={`/profile/${u.username}`}>
                      <Card className="card-hover p-4 flex items-center gap-3">
                        <Avatar name={u.displayName} src={u.avatarUrl} size={40} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{u.displayName}</p>
                          <p className="text-xs text-muted">
                            @{u.username} · {u.xp.toLocaleString()} XP
                          </p>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </Section>
              ) : null}

              {courses.length > 0 ? (
                <Section title="Courses" icon={<BookOpen className="h-4 w-4" />}>
                  {courses.map((c) => (
                    <Link key={c.id} href={`/courses/${c.slug}`}>
                      <Card className="card-hover p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{c.title}</h3>
                          <Badge tone="blue">{c.language}</Badge>
                          <Badge tone="neutral">{c.difficulty}</Badge>
                        </div>
                        <p className="text-sm text-muted line-clamp-1">{c.description}</p>
                      </Card>
                    </Link>
                  ))}
                </Section>
              ) : null}

              {paths.length > 0 ? (
                <Section title="Learning paths" icon={<Route className="h-4 w-4" />}>
                  {paths.map((p) => (
                    <Link key={p.id} href={`/paths/${p.slug}`}>
                      <Card className="card-hover p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{p.title}</h3>
                          {p.level ? <Badge tone="amber">{p.level}</Badge> : null}
                          <Badge tone="neutral">
                            {(Array.isArray(p.courseIds) ? p.courseIds.length : 0)} courses
                          </Badge>
                        </div>
                        <p className="text-sm text-muted line-clamp-1">{p.description}</p>
                      </Card>
                    </Link>
                  ))}
                </Section>
              ) : null}

              {challenges.length > 0 ? (
                <Section title="Challenges" icon={<Swords className="h-4 w-4" />}>
                  {challenges.map((ch) => (
                    <Link key={ch.id} href={`/challenges/${ch.slug}`}>
                      <Card className="card-hover p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{ch.title}</h3>
                          <Badge tone="amber">{ch.difficulty}</Badge>
                          <Badge tone="neutral">{ch.language}</Badge>
                        </div>
                        <p className="text-sm text-muted line-clamp-1">{ch.description}</p>
                      </Card>
                    </Link>
                  ))}
                </Section>
              ) : null}

              {projects.length > 0 ? (
                <Section title="Projects" icon={<FolderKanban className="h-4 w-4" />}>
                  {projects.map((pr) => (
                    <Link key={pr.id} href={`/projects/${pr.slug}`}>
                      <Card className="card-hover p-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{pr.title}</h3>
                          <Badge tone="blue">{pr.language}</Badge>
                          {pr.difficulty ? <Badge tone="neutral">{pr.difficulty}</Badge> : null}
                        </div>
                        <p className="text-sm text-muted line-clamp-1">{pr.description}</p>
                      </Card>
                    </Link>
                  ))}
                </Section>
              ) : null}

              {lessons.length > 0 ? (
                <Section title="Lessons" icon={<FileText className="h-4 w-4" />}>
                  {lessons.map((l) => (
                    <Link key={l.id} href={`/learn/${l.id}`}>
                      <Card className="card-hover p-4">
                        <h3 className="font-semibold">{l.title}</h3>
                        <p className="text-xs text-muted mt-1">in {l.module.course.title}</p>
                      </Card>
                    </Link>
                  ))}
                </Section>
              ) : null}

              {posts.length > 0 ? (
                <Section title="Community posts" icon={<MessageSquare className="h-4 w-4" />}>
                  {posts.map((po) => (
                    <Link key={po.id} href={`/community/${po.id}`}>
                      <Card className="card-hover p-4">
                        <h3 className="font-semibold">{po.title}</h3>
                        <p className="text-sm text-muted line-clamp-1">{po.body}</p>
                      </Card>
                    </Link>
                  ))}
                </Section>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-semibold text-lg mb-3 flex items-center gap-2 text-muted">
        {icon}
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
