import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BookOpen,
  Code2,
  Flag,
  GraduationCap,
  Layers,
  ListChecks,
  MessageSquare,
  ShieldCheck,
  Swords,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { getOverview } from "@/lib/admin-stats";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { AreaChart, BarChart, DonutChart } from "@/components/admin/charts";
import { Funnel, Metric, Section, StatCard } from "@/components/admin/admin-ui";

const EVENT_LABELS: Record<string, string> = {
  dashboard_view: "Dashboard views",
  lesson_start: "Lesson starts",
  lesson_complete: "Lesson completions",
  quiz_attempt: "Quiz attempts",
  register: "Registrations",
  login: "Logins",
  onboarding_complete: "Onboarding",
  profile_updated: "Profile updates",
  project_submit: "Project submissions",
  challenge_attempt: "Challenge attempts",
};

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const d = await getOverview();
  const t = d.totals;

  return (
    <div className="space-y-6 pb-10">
      {/* ---------- Primary KPI strip ---------- */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {d.kpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            value={k.unit === "%" ? `${k.value}%` : k.value.toLocaleString()}
            sub={k.hint}
            delta={k.previous > 0 ? (k.value - k.previous) / k.previous : null}
            deltaLabel="vs prev 7d"
            icon={<Activity className="h-4 w-4" />}
            tone="primary"
          />
        ))}
      </section>

      {/* ---------- Live pulse + platform totals ---------- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Live pulse"
          subtitle="Today vs the last 7 days"
          className="lg:col-span-2"
          action={
            <Link href="/admin/analytics" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              Deep dive <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <Metric label="Active today" value={d.activeToday} />
            <Metric label="Active 7d" value={d.active7d} />
            <Metric label="Active 30d" value={d.active30d} />
            <Metric label="Signups today" value={d.signupsToday} />
          </div>
          <p className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Daily active users</p>
          <AreaChart
            data={d.dau.map((v, i) => ({ label: `${i + 1}`, value: v }))}
            height={150}
            color="#22c55e"
          />
        </Section>

        <Section title="Platform totals" subtitle="Everything that exists right now">
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Total icon={<Users className="h-4 w-4" />} label="Users" value={t.users} href="/admin/users" />
            <Total icon={<UserCheck className="h-4 w-4" />} label="Active" value={t.activeUsers} />
            <Total icon={<ShieldCheck className="h-4 w-4" />} label="Admins" value={t.admins} />
            <Total icon={<Trophy className="h-4 w-4" />} label="Premium" value={t.premium} />
            <Total icon={<BookOpen className="h-4 w-4" />} label="Courses" value={t.courses} href="/admin/content" />
            <Total icon={<Layers className="h-4 w-4" />} label="Lessons" value={t.lessons} />
            <Total icon={<ListChecks className="h-4 w-4" />} label="Quizzes" value={t.quizzes} />
            <Total icon={<Swords className="h-4 w-4" />} label="Challenges" value={t.challenges} />
            <Total icon={<Code2 className="h-4 w-4" />} label="Code runs" value={t.codeRuns} />
            <Total icon={<MessageSquare className="h-4 w-4" />} label="Posts" value={t.posts} href="/admin/moderation" />
            <Total icon={<GraduationCap className="h-4 w-4" />} label="Certificates" value={t.certificates} />
            <Total icon={<Flag className="h-4 w-4" />} label="Open reports" value={t.openReports} href="/admin/moderation" tone="rose" />
          </ul>
        </Section>
      </section>

      {/* ---------- Traffic + funnel ---------- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Section
          title="Page views"
          subtitle="Last 30 days, every page load"
          className="lg:col-span-2"
          action={<Badge tone={d.traffic.length ? "green" : "neutral"}>{d.traffic.reduce((a, b) => a + b.value, 0).toLocaleString()} total</Badge>}
        >
          <BarChart
            data={d.traffic.map((p) => ({ label: p.date.slice(5), value: p.value }))}
            height={160}
            color="#38bdf8"
          />
        </Section>

        <Section title="Activation funnel" subtitle="Registered → certified">
          <Funnel steps={d.funnel} />
        </Section>
      </section>

      {/* ---------- Signups + engagement ---------- */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Section title="Registrations" subtitle="Last 30 days" className="lg:col-span-2">
          <AreaChart
            data={d.registrations.map((p) => ({ label: p.date.slice(5), value: p.value }))}
            height={140}
            color="#a78bfa"
          />
        </Section>

        <Section title="Engagement" subtitle="Learning actions, last 30d">
          <DonutChart
            data={[
              { label: "Lessons", value: d.engagement.lessonCompletions },
              { label: "Quizzes", value: d.engagement.quizAttempts },
              { label: "Challenges", value: d.engagement.challengeAttempts },
              { label: "Projects", value: d.engagement.projectSubmissions },
              { label: "Code runs", value: d.engagement.codeExecutions },
            ]}
            centerValue={(
              d.engagement.lessonCompletions +
              d.engagement.quizAttempts +
              d.engagement.challengeAttempts +
              d.engagement.projectSubmissions
            ).toLocaleString()}
            centerLabel="learning actions"
          />
          <ul className="mt-4 space-y-1.5 text-xs">
            <Legend color="#22c55e" label="Lesson completions" value={d.engagement.lessonCompletions} />
            <Legend color="#38bdf8" label="Quiz attempts" value={d.engagement.quizAttempts} />
            <Legend color="#a78bfa" label="Challenge attempts" value={d.engagement.challengeAttempts} />
            <Legend color="#fbbf24" label="Project submissions" value={d.engagement.projectSubmissions} />
            <Legend color="#fb7185" label="Code executions" value={d.engagement.codeExecutions} />
          </ul>
        </Section>
      </section>

      {/* ---------- Courses + leaderboard ---------- */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Top courses"
          subtitle="By enrollments, with completion rate"
          action={
            <Link href="/admin/content" className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1">
              All content <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {d.topCourses.length === 0 ? (
            <EmptyState title="No enrollments yet" description="Once learners enroll, course performance shows up here." />
          ) : (
            <ul className="space-y-3">
              {d.topCourses.map((c) => (
                <li key={c.slug}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <Link href={`/courses/${c.slug}`} className="font-medium hover:text-primary truncate">
                      {c.title}
                    </Link>
                    <span className="text-xs text-muted tabular-nums shrink-0">
                      {c.enrollments} enrolled · {c.avgProgress}% avg
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-surface2 overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(c.avgProgress, 1.5)}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Top learners" subtitle="Ranked by XP" action={<Badge tone="violet"><Trophy className="h-3 w-3" /> leaderboard</Badge>}>
          {d.topUsers.length === 0 ? (
            <EmptyState title="No learners yet" />
          ) : (
            <ol className="space-y-2.5">
              {d.topUsers.map((u, i) => (
                <li key={u.id} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-muted tabular-nums">{i + 1}</span>
                  <Avatar name={u.displayName} src={u.avatarUrl} size={30} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{u.displayName}</p>
                    <p className="text-xs text-muted truncate">
                      @{u.username} · Lv {u.level} · {u.lessons} lessons
                    </p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums">{u.xp.toLocaleString()}</span>
                </li>
              ))}
            </ol>
          )}
        </Section>
      </section>

      {/* ---------- Event breakdown ---------- */}
      <Section title="Event breakdown" subtitle="All tracked user events, all time">
        {d.recentEvents.length === 0 ? (
          <EmptyState title="No events recorded" description="Events appear as soon as users browse and learn." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {d.recentEvents.map((e) => (
              <span
                key={e.type}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface2 px-2.5 py-1.5 text-xs"
              >
                <span className="text-muted">{EVENT_LABELS[e.type] ?? e.type}</span>
                <span className="font-semibold tabular-nums">{e.count.toLocaleString()}</span>
              </span>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Total({
  icon,
  label,
  value,
  href,
  tone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
  tone?: "muted" | "rose";
}) {
  const inner = (
    <li className="flex items-center gap-2.5 min-w-0">
      <span className={tone === "rose" ? "text-rose-500" : "text-muted"}>{icon}</span>
      <span className="text-sm text-muted truncate">{label}</span>
      <span className="ml-auto text-sm font-semibold tabular-nums">{value.toLocaleString()}</span>
    </li>
  );
  if (!href) return inner;
  return (
    <li>
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {inner}
      </Link>
    </li>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-2">
      <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      <span className="text-muted truncate">{label}</span>
      <span className="ml-auto tabular-nums font-medium">{value.toLocaleString()}</span>
    </li>
  );
}
