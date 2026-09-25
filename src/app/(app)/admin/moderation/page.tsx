import Link from "next/link";
import { Flag, MessageSquare, ShieldCheck, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/states";
import { AdminPostMenu, AdminReportRow } from "@/components/admin/admin-actions";
import { Section, StatCard, Table, Td } from "@/components/admin/admin-ui";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const [openReports, resolvedReports, posts, flaggedPosts, audit] = await Promise.all([
    prisma.communityReport.findMany({
      where: { status: "OPEN" },
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: { createdAt: "asc" },
      take: 50,
    }),
    prisma.communityReport.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { user: { select: { username: true, displayName: true } } },
    }),
    prisma.communityPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
    }),
    prisma.communityPost.count({ where: { status: "REMOVED" } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  const commentCount = await prisma.comment.count();

  return (
    <div className="space-y-5 pb-10">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Open reports"
          value={openReports.length}
          sub="needs a decision"
          icon={<Flag className="h-4 w-4" />}
          tone={openReports.length > 0 ? "rose" : "sky"}
        />
        <StatCard label="Posts" value={posts.length} sub="latest 30 shown" icon={<MessageSquare className="h-4 w-4" />} tone="sky" />
        <StatCard label="Removed posts" value={flaggedPosts} sub="moderated" icon={<Trash2 className="h-4 w-4" />} tone="amber" />
        <StatCard label="Comments" value={commentCount} sub="all time" icon={<ShieldCheck className="h-4 w-4" />} tone="primary" />
      </section>

      <Section
        title="Open reports"
        subtitle="Oldest first — these are blocking moderation"
        bodyClassName="-mx-4 sm:-mx-5"
      >
        {openReports.length === 0 ? (
          <EmptyState title="Queue is clear" description="No open reports. The community is behaving." />
        ) : (
          <Table minWidth={900} head={["Target", "Reason", "Reported by", "Filed", "Actions"]}>
            {openReports.map((r) => (
              <tr key={r.id} className="hover:bg-surface2/40">
                <Td>
                  <Badge tone="rose">{r.targetType}</Badge>
                  <p className="text-xs text-muted font-mono mt-1">{r.targetId}</p>
                </Td>
                <Td className="max-w-md">
                  <p className="line-clamp-2">{r.reason}</p>
                </Td>
                <Td className="text-muted">@{r.user.username}</Td>
                <Td className="text-muted whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                <Td>
                  <AdminReportRow reportId={r.id} status={r.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Recent posts" subtitle="Latest community activity" bodyClassName="-mx-4 sm:-mx-5">
        {posts.length === 0 ? (
          <EmptyState title="No posts yet" description="Community posts will appear here." />
        ) : (
          <Table minWidth={1000} head={["Author", "Post", "Course", "Likes", "Answers", "Status", "Posted", ""]}>
            {posts.map((p) => (
              <tr key={p.id} className="hover:bg-surface2/40">
                <Td>
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={p.user.displayName} src={p.user.avatarUrl} size={26} />
                    <span className="text-sm truncate">@{p.user.username}</span>
                  </div>
                </Td>
                <Td className="max-w-sm">
                  <Link href={`/community/${p.id}`} className="font-medium hover:text-primary line-clamp-1">
                    {p.title}
                  </Link>
                  <p className="text-xs text-muted line-clamp-1">{p.body}</p>
                </Td>
                <Td className="text-muted text-xs">{p.courseId ? p.courseId.slice(0, 8) : "—"}</Td>
                <Td className="tabular-nums">{p.likes}</Td>
                <Td className="tabular-nums">{p.answerCount}</Td>
                <Td>
                  <PostStatusBadge status={p.status} />
                </Td>
                <Td className="text-muted whitespace-nowrap">{formatDate(p.createdAt)}</Td>
                <Td className="text-right">
                  <AdminPostMenu postId={p.id} title={p.title} status={p.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Report history" subtitle="Recently resolved and dismissed" bodyClassName="-mx-4 sm:-mx-5">
        {resolvedReports.length === 0 ? (
          <p className="text-sm text-muted">No reports have been handled yet.</p>
        ) : (
          <Table minWidth={720} head={["Target", "Reason", "Reported by", "Status", "Filed"]}>
            {resolvedReports.map((r) => (
              <tr key={r.id}>
                <Td>
                  <Badge tone="neutral">{r.targetType}</Badge>
                </Td>
                <Td className="max-w-md"><p className="line-clamp-1">{r.reason}</p></Td>
                <Td className="text-muted">@{r.user.username}</Td>
                <Td>
                  <Badge tone={r.status === "RESOLVED" ? "rose" : "neutral"}>{r.status}</Badge>
                </Td>
                <Td className="text-muted whitespace-nowrap">{formatDate(r.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Audit log" subtitle="Every admin action, newest first">
        {audit.length === 0 ? (
          <p className="text-sm text-muted">No audit entries yet.</p>
        ) : (
          <ol className="space-y-1.5">
            {audit.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-mono text-xs">{a.action}</span>
                <span className="text-xs text-muted">
                  {a.actorId ? `actor ${a.actorId.slice(0, 8)}` : "system"} · {formatDate(a.createdAt)}
                  {a.targetType ? ` · ${a.targetType}` : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function PostStatusBadge({ status }: { status: string }) {
  if (status === "REMOVED") return <Badge tone="rose">REMOVED</Badge>;
  if (status === "CLOSED") return <Badge tone="amber">CLOSED</Badge>;
  return <Badge tone="green">OPEN</Badge>;
}
