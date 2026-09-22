import { cn } from "@/lib/cn";

export function ProgressBar({
  value,
  max = 100,
  className,
  label,
  tone = "primary",
}: {
  value: number;
  max?: number;
  className?: string;
  label?: string;
  tone?: "primary" | "amber" | "sky";
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  const bar =
    tone === "amber" ? "bg-amber-500" : tone === "sky" ? "bg-sky-500" : "bg-primary";
  return (
    <div className={cn("w-full", className)} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="flex items-center justify-between text-xs text-muted mb-1">
        <span>{label}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-surface2 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}