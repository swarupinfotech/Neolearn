import { Globe, Link2, Monitor, MousePointerClick, Smartphone, Users2 } from "lucide-react";
import { getTraffic } from "@/lib/admin-stats";
import { Badge } from "@/components/ui/badge";
import { Section, StatCard } from "@/components/admin/admin-ui";
import { AreaChart, BarChart, DonutChart, RankBars } from "@/components/admin/charts";
import { RangePicker } from "@/components/admin/admin-controls";

export const dynamic = "force-dynamic";

const RANGES = [
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
  { value: "365", label: "1y" },
];

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.days) ? sp.days[0] : sp.days;
  const days = [7, 30, 90, 365].includes(Number(raw)) ? Number(raw) : 30;

  const t = await getTraffic(days);

  return (
    <div className="space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Every page load captured for the last <span className="text-fg font-medium">{t.range.label}</span>.
        </p>
        <RangePicker value={String(days)} options={RANGES} />
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Page views"
          value={t.totals.views.toLocaleString()}
          sub={`${t.totals.avgPerDay}/day average`}
          icon={<MousePointerClick className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Unique visitors"
          value={t.totals.unique.toLocaleString()}
          sub="deduped by visitor + day"
          icon={<Users2 className="h-4 w-4" />}
          tone="sky"
        />
        <StatCard
          label="Bot traffic"
          value={t.totals.bots.toLocaleString()}
          sub="filtered out of uniques"
          icon={<Smartphone className="h-4 w-4" />}
          tone="amber"
        />
        <StatCard
          label="Views per visitor"
          value={t.totals.unique > 0 ? (t.totals.views / t.totals.unique).toFixed(1) : "0"}
          sub="depth of session"
          icon={<Monitor className="h-4 w-4" />}
          tone="violet"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Section title="Page views" subtitle="Daily volume">
          <BarChart
            data={t.views.map((p) => ({ label: p.date.slice(5), value: p.value }))}
            height={190}
            color="#38bdf8"
          />
        </Section>
        <Section title="Unique visitors" subtitle="Daily deduplicated audience">
          <AreaChart
            data={t.uniqueVisitors.map((p) => ({ label: p.date.slice(5), value: p.value }))}
            height={190}
            color="#22c55e"
          />
        </Section>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Section title="Devices" subtitle="How people browse">
          <DonutChart
            data={t.devices.map((d) => ({ label: d.device, value: d.views }))}
            size={160}
            centerValue={t.totals.views.toLocaleString()}
            centerLabel="views"
          />
          <ul className="mt-4 space-y-1.5 text-xs">
            {t.devices.map((d, i) => (
              <li key={d.device} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: ["#22c55e", "#38bdf8", "#a78bfa", "#fbbf24", "#fb7185"][i % 5] }}
                />
                <span className="text-muted capitalize">{d.device}</span>
                <span className="ml-auto tabular-nums font-medium">{d.views.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Browsers" subtitle="Client breakdown">
          <RankBars data={t.browsers.map((b) => ({ label: b.browser, value: b.views, hint: `${b.unique} users` }))} />
        </Section>

        <Section title="Operating systems">
          <RankBars data={t.os.map((o) => ({ label: o.os, value: o.views, hint: `${o.unique} users` }))} />
        </Section>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Section title="Traffic sources" subtitle="Where visits come from" action={<Globe className="h-4 w-4 text-muted" />}>
          <RankBars data={t.sources.map((s) => ({ label: s.source, value: s.views, hint: `${s.unique} unique` }))} />
        </Section>

        <Section title="Top pages" subtitle="Most visited routes" action={<Link2 className="h-4 w-4 text-muted" />}>
          <RankBars data={t.topPages.map((p) => ({ label: p.path, value: p.views, hint: `${p.unique} unique` }))} />
        </Section>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Section title="Referrers" subtitle="Raw external links">
          {t.referrers.length === 0 ? (
            <p className="text-sm text-muted">No external referrers recorded yet.</p>
          ) : (
            <RankBars data={t.referrers.map((r) => ({ label: r.referrer, value: r.views }))} />
          )}
        </Section>

        <Section title="Countries" subtitle="Visitor geography">
          {t.countries.length === 0 ? (
            <p className="text-sm text-muted">
              Country data appears once requests come through the edge network.
            </p>
          ) : (
            <RankBars data={t.countries.map((c) => ({ label: c.country, value: c.views, hint: `${c.unique} unique` }))} />
          )}
        </Section>
      </section>

      <Section
        title="Hourly distribution"
        subtitle="UTC — when your audience is online"
        action={<Badge tone="neutral">last {t.range.label}</Badge>}
      >
        <BarChart
          data={t.hourly.map((v, h) => ({ label: `${h}:00`, value: v }))}
          height={140}
          color="#a78bfa"
        />
      </Section>
    </div>
  );
}
