import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Server,
  Settings2,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Section, StatCard, Table, Td } from "@/components/admin/admin-ui";
import { SettingEditor } from "@/components/admin/setting-editor";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Kept outside the component so the render itself stays pure. */
async function measureDb() {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { dbOk: true, dbLatencyMs: Date.now() - started };
  } catch {
    return { dbOk: false, dbLatencyMs: Date.now() - started };
  }
}

export default async function AdminSystemPage() {
  const [settings, counts, eventTotal, pageViewTotal, distinctPaths, oldestPageView, admins, health] =
    await Promise.all([
      prisma.setting.findMany({ orderBy: { key: "asc" } }),
      Promise.all([
        prisma.lessonProgress.count(),
        prisma.quizAttempt.count(),
        prisma.challengeAttempt.count(),
        prisma.projectSubmission.count(),
        prisma.codeExecutionLog.count(),
      ]),
      prisma.analyticsEvent.count(),
      prisma.pageView.count(),
      prisma.pageView.findMany({ distinct: ["path"], select: { path: true }, take: 500 }),
      prisma.pageView.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
      prisma.user.findMany({
        where: { role: { in: ["ADMIN", "MODERATOR"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true, displayName: true, email: true, role: true, status: true, createdAt: true },
      }),
      measureDb(),
    ]);

  const { dbOk, dbLatencyMs } = health;

  const records = {
    lessonComplete: counts[0],
    quiz: counts[1],
    challenge: counts[2],
    project: counts[3],
    code: counts[4],
  };

  return (
    <div className="space-y-5 pb-10">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Database"
          value={dbOk ? "Healthy" : "Down"}
          sub={dbOk ? `${dbLatencyMs}ms round trip` : "connection failed"}
          icon={dbOk ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          tone={dbOk ? "sky" : "rose"}
        />
        <StatCard
          label="Tracked events"
          value={eventTotal.toLocaleString()}
          sub={`${pageViewTotal.toLocaleString()} page views`}
          icon={<Activity className="h-4 w-4" />}
          tone="violet"
        />
        <StatCard
          label="Distinct routes"
          value={new Set(distinctPaths.map((p) => p.path)).size}
          sub={oldestPageView ? `since ${formatDate(oldestPageView.createdAt)}` : "no traffic yet"}
          icon={<Server className="h-4 w-4" />}
          tone="amber"
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="Runtime"
          subtitle="Live environment information"
          action={
            <Badge tone={dbOk ? "green" : "rose"}>
              {dbOk ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {dbOk ? "operational" : "degraded"}
            </Badge>
          }
        >
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm">
            <Row label="Runtime" value={process.env.NEXT_RUNTIME ?? "nodejs"} />
            <Row label="Node" value={process.version} />
            <Row label="Database" value="PostgreSQL (Supabase)" />
            <Row label="Pooler" value="transaction Â· port 6543" />
            <Row label="DB latency" value={dbOk ? `${dbLatencyMs}ms` : "unreachable"} />
            <Row label="Total records" value={(Object.values(records).reduce((a, b) => a + b, 0)).toLocaleString()} />
            <Row label="Timezone" value={Intl.DateTimeFormat().resolvedOptions().timeZone} />
          </dl>
        </Section>

        <Section title="Record counts" subtitle="Everything the platform stores" action={<Database className="h-4 w-4 text-muted" />}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-sm">
            <Row label="Lesson completions" value={records.lessonComplete.toLocaleString()} />
            <Row label="Quiz attempts" value={records.quiz.toLocaleString()} />
            <Row label="Challenge attempts" value={records.challenge.toLocaleString()} />
            <Row label="Project submissions" value={records.project.toLocaleString()} />
            <Row label="Code executions" value={records.code.toLocaleString()} />
            <Row label="Analytics events" value={eventTotal.toLocaleString()} />
            <Row label="Page views" value={pageViewTotal.toLocaleString()} />
            <Row label="Settings rows" value={settings.length.toLocaleString()} />
          </dl>
        </Section>
      </div>

      <Section
        title="Platform settings"
        subtitle="Key/value store — JSON is parsed automatically"
        action={<Settings2 className="h-4 w-4 text-muted" />}
      >
        <SettingEditor
          initial={settings.map((s) => ({
            key: s.key,
            value: typeof s.value === "string" ? s.value : JSON.stringify(s.value),
          }))}
        />
      </Section>

      <Section title="Administrators" subtitle="Everyone with elevated access" bodyClassName="-mx-4 sm:-mx-5">
        {admins.length === 0 ? (
          <p className="text-sm text-muted">No administrators found.</p>
        ) : (
          <Table minWidth={640} head={["Name", "Email", "Role", "Status", "Since"]}>
            {admins.map((a) => (
              <tr key={a.id}>
                <Td className="font-medium">{a.displayName}</Td>
                <Td className="text-muted">{a.email}</Td>
                <Td>
                  <Badge tone={a.role === "ADMIN" ? "rose" : "amber"}>{a.role}</Badge>
                </Td>
                <Td>
                  <Badge tone={a.status === "active" ? "green" : "rose"}>{a.status}</Badge>
                </Td>
                <Td className="text-muted whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {formatDate(a.createdAt)}
                  </span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Card className="text-xs text-muted">
        All admin mutations record an <span className="font-mono">AnalyticsEvent</span> and invalidate the
        dashboard cache immediately. Page-view data is collected server-side with hashed IPs only — raw
        addresses are never stored.
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted">{label}</dt>
      <dd className="font-medium tabular-nums mt-0.5">{value}</dd>
    </div>
  );
}

