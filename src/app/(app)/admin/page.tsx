import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Users, BookOpen, ListChecks, Swords, MessagesSquare, Flag } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/services/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import { AdminReportRow, AdminUserRow } from "@/components/admin/admin-actions";

export const metadata: Metadata = { title: "Admin | NeoLearn" };

export default async function AdminPage() {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    notFound();
  }

  const [users, courses, lessons, quizzes, challenges, posts, reports, audit, settingsCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.course.count(),
      prisma.lesson.count(),
      prisma.quiz.count(),
      prisma.challenge.count(),
      prisma.communityPost.count(),
      prisma.communityReport.findMany({
        where: { status: "OPEN" },
        include: { user: { select: { username: true, displayName: true } } },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.setting.count(),
    ]);

  const recentUsers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, username: true, displayName: true, avatarUrl: true, email: true, role: true, status: true, xp: true, createdAt: true, isPremium: true },
  });

  const stats = [
    { label: "Users", value: users, icon: <Users className="h-5 w-5 text-primary" /> },
    { label: "Courses", value: courses, icon: <BookOpen className="h-5 w-5 text-violet-500" /> },
    { label: "Lessons", value: lessons, icon: <BookOpen className="h-5 w-5 text-sky-500" /> },
    { label: "Quizzes", value: quizzes, icon: <ListChecks className="h-5 w-5 text-emerald-500" /> },
    { label: "Challenges", value: challenges, icon: <Swords className="h-5 w-5 text-amber-500" /> },
    { label: "Posts", value: posts, icon: <MessagesSquare className="h-5 w-5 text-rose-500" /> },
    { label: "Open reports", value: reports.length, icon: <Flag className="h-5 w-5 text-orange-500" /> },
    { label: "Settings", value: settingsCount, icon: <ShieldCheck className="h-5 w-5 text-slate-500" /> },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Admin</h1>
        </div>
        <p className="text-muted">Signed in as {admin.displayName} ({admin.email}).</p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft">{s.icon}</span>
            <div>
              <p className="text-xl font-bold leading-none">{s.value}</p>
              <p className="text-xs text-muted mt-1">{s.label}</p>
            </div>
          </Card>
        ))}
      </section>

      {reports.length > 0 ? (
        <section>
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Flag className="h-4 w-4 text-orange-500" /> Open reports
          </h2>
          <ul className="space-y-2">
            {reports.map((r) => (
              <li key={r.id}>
                <Card className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {r.targetType} → <span className="text-muted">{r.targetId}</span>
                    </p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">{r.reason}</p>
                    <p className="text-xs text-muted mt-0.5">
                      Reported by @{r.user.username} · {formatDate(r.createdAt)}
                    </p>
                  </div>
                  <AdminReportRow reportId={r.id} status={r.status} />
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-sm text-muted">No open reports — the community is behaving.</p>
      )}

      <section>
        <h2 className="font-semibold text-lg mb-3">Recent users</h2>
        <div className="overflow-x-auto card">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">XP</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.displayName} src={u.avatarUrl} size={28} />
                      <div>
                        <p className="font-medium">{u.displayName}</p>
                        <p className="text-xs text-muted">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">{u.xp.toLocaleString()}</td>
                  <td className="px-4 py-3 text-muted">{formatDate(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.status === "active" ? "green" : "rose"}>{u.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <AdminUserRow userId={u.id} status={u.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-3">Audit log</h2>
        <div className="card divide-y divide-border">
          {audit.length === 0 ? (
            <p className="p-4 text-sm text-muted">No audit entries yet.</p>
          ) : (
            audit.map((a) => (
              <div key={a.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <span className="font-mono text-xs">{a.action}</span>
                <span className="text-xs text-muted">{a.actorId ? `actor ${a.actorId}` : "system"} · {formatDate(a.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <footer className="pt-2 pb-10 text-xs text-muted flex items-center gap-3">
        <Link href="/" className="hover:text-fg">Back to home</Link>
        <span>Moderation keeps the community safe.</span>
      </footer>
    </div>
  );
}