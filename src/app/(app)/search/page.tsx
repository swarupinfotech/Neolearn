import type { Metadata } from "next";
import type { Challenge, CommunityPost, Course, Project, User } from "@prisma/client";
import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/states";

export const metadata: Metadata = { title: "Search | NeoLearn" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const user = await requireUser();
  const { q = "", type = "all" } = await searchParams;
  const query = q.trim();

  const contains = (field: string) => ({ contains: query });

  let courses: Course[] = [];
  let challenges: Challenge[] = [];
  let projects: Project[] = [];
  let users: User[] = [];
  let posts: CommunityPost[] = [];

  if (query) {
    const [c, ch, p, u, po] = await Promise.all([
      type === "all" || type === "courses"
        ? prisma.course.findMany({ where: { OR: [{ title: contains("title") }, { description: contains("description") }] }, take: 6 })
        : Promise.resolve([]),
      type === "all" || type === "challenges"
        ? prisma.challenge.findMany({ where: { OR: [{ title: contains("title") }, { description: contains("description") }] }, take: 6 })
        : Promise.resolve([]),
      type === "all" || type === "projects"
        ? prisma.project.findMany({ where: { OR: [{ title: contains("title") }, { description: contains("description") }] }, take: 6 })
        : Promise.resolve([]),
      type === "all" || type === "users"
        ? prisma.user.findMany({ where: { OR: [{ username: contains("username") }, { displayName: contains("displayName") }] }, take: 6 })
        : Promise.resolve([]),
      type === "all" || type === "community"
        ? prisma.communityPost.findMany({ where: { OR: [{ title: contains("title") }, { body: contains("body") }] }, take: 6 })
        : Promise.resolve([]),
    ]);
    courses = c; challenges = ch; projects = p; users = u; posts = po;
  }

  const total = courses.length + challenges.length + projects.length + users.length + posts.length;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Search className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Search</h1>
        </div>
        <form method="GET" className="mt-4">
          <label htmlFor="q" className="sr-only">Search</label>
          <div className="flex gap-2">
            <input
              id="q"
              name="q"
              defaultValue={query}
              placeholder="Search courses, challenges, projects, people…"
              className="flex-1 h-11 px-4 rounded-lg border border-border bg-surface text-sm"
            />
            <button className="h-11 px-5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-strong" type="submit">
              Search
            </button>
          </div>
        </form>
      </header>

      {!query ? (
        <EmptyState title="Type something to search" description="Find courses, challenges, projects, community posts and learners." />
      ) : total === 0 ? (
        <EmptyState title="No results" description={`Nothing matched "${query}". Try different keywords.`} />
      ) : (
        <>
          {users.length > 0 ? (
            <Section title="People">
              {users.map((u) => (
                <Link key={u.id} href={`/profile/${u.username}`}>
                  <Card className="card-hover p-4 flex items-center gap-3">
                    <Avatar name={u.displayName} src={u.avatarUrl} size={40} />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{u.displayName}</p>
                      <p className="text-xs text-muted">@{u.username} · {u.xp.toLocaleString()} XP</p>
                    </div>
                  </Card>
                </Link>
              ))}
            </Section>
          ) : null}

          {courses.length > 0 ? (
            <Section title="Courses">
              {courses.map((c) => (
                <Link key={c.id} href={`/courses/${c.slug}`}>
                  <Card className="card-hover p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{c.title}</h3>
                      <Badge tone="blue">{c.language}</Badge>
                    </div>
                    <p className="text-sm text-muted line-clamp-1">{c.description}</p>
                  </Card>
                </Link>
              ))}
            </Section>
          ) : null}

          {challenges.length > 0 ? (
            <Section title="Challenges">
              {challenges.map((ch) => (
                <Link key={ch.id} href={`/challenges/${ch.slug}`}>
                  <Card className="card-hover p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{ch.title}</h3>
                      <Badge tone="amber">{ch.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-muted line-clamp-1">{ch.description}</p>
                  </Card>
                </Link>
              ))}
            </Section>
          ) : null}

          {projects.length > 0 ? (
            <Section title="Projects">
              {projects.map((pr) => (
                <Link key={pr.id} href={`/projects/${pr.slug}`}>
                  <Card className="card-hover p-4">
                    <h3 className="font-semibold">{pr.title}</h3>
                    <p className="text-sm text-muted line-clamp-1">{pr.description}</p>
                  </Card>
                </Link>
              ))}
            </Section>
          ) : null}

          {posts.length > 0 ? (
            <Section title="Community posts">
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
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold text-lg mb-3">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}