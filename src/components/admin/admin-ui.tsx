import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { ReactNode } from "react";

// ============================================================
// Shared building blocks for every admin console page.
// ============================================================

export function StatCard({
  label,
  value,
  sub,
  icon,
  delta,
  deltaLabel,
  tone = "neutral",
  href,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  tone?: "neutral" | "primary" | "sky" | "amber" | "rose" | "violet";
  href?: string;
}) {
  const toneBg: Record<string, string> = {
    neutral: "bg-surface2 text-muted",
    primary: "bg-primary-soft text-primary-strong dark:text-primary",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  };

  const body = (
    <Card className="h-full flex flex-col gap-3 hover:border-border/80 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
        {icon ? <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg", toneBg[tone])}>{icon}</span> : null}
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
        {sub ? <p className="text-xs text-muted mt-1.5">{sub}</p> : null}
      </div>
      {delta !== undefined && delta !== null ? <Delta value={delta} label={deltaLabel} /> : null}
    </Card>
  );

  if (!href) return body;
  return (
    <a href={href} className="block h-full">
      {body}
    </a>
  );
}

export function Delta({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const tone =
    pct > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : pct < 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted";
  return (
    <p className={cn("flex items-center gap-1 text-xs font-medium", tone)}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="tabular-nums">
        {pct > 0 ? "+" : ""}
        {pct}%
      </span>
      {label ? <span className="text-muted font-normal truncate">{label}</span> : null}
    </p>
  );
}

export function Section({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <div className={bodyClassName}>{children}</div>
    </Card>
  );
}

export function Table({ head, children, minWidth = 720 }: { head: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="-mx-4 sm:-mx-5 overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-border text-left text-muted">
            {head.map((h) => (
              <th key={h} className="px-4 sm:px-5 py-2.5 font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 sm:px-5 py-3 align-middle", className)}>{children}</td>;
}

export function Metric({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-sm font-semibold tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const tone = role === "ADMIN" ? "rose" : role === "MODERATOR" ? "amber" : "neutral";
  return <Badge tone={tone}>{role}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone = status === "active" ? "green" : status === "suspended" ? "rose" : "neutral";
  return <Badge tone={tone}>{status}</Badge>;
}

export function CourseStatusBadge({ status }: { status: string }) {
  const tone = status === "PUBLISHED" ? "green" : status === "ARCHIVED" ? "neutral" : "amber";
  return <Badge tone={tone}>{status}</Badge>;
}

export { ProgressBar };

/** Compact funnel used on the overview page. */
export function Funnel({ steps }: { steps: { step: string; value: number; pct: number }[] }) {
  return (
    <ul className="space-y-2.5">
      {steps.map((s) => (
        <li key={s.step}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>{s.step}</span>
            <span className="text-xs text-muted tabular-nums">
              {s.value.toLocaleString()} · {s.pct}%
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-surface2 overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(s.pct, 1.5)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
