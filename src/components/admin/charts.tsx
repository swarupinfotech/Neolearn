import { cn } from "@/lib/cn";

// ============================================================
// Dependency-free SVG chart primitives for the admin console.
// Everything is a server component - no client JS, no chart lib.
// ============================================================

export interface Point {
  label: string;
  value: number;
}

const PALETTE = [
  "#22c55e",
  "#38bdf8",
  "#a78bfa",
  "#fbbf24",
  "#fb7185",
  "#2dd4bf",
  "#f97316",
  "#818cf8",
];

export function niceMax(value: number) {
  if (value <= 0) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const n = value / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function toPath(points: { x: number; y: number }[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
}

/** Smooth-ish line chart with an area fill underneath. */
export function AreaChart({
  data,
  height = 180,
  color = PALETTE[0],
  showGrid = true,
  format = (n: number) => String(n),
  className,
}: {
  data: Point[];
  height?: number;
  color?: string;
  showGrid?: boolean;
  format?: (n: number) => string;
  className?: string;
}) {
  const W = 720;
  const H = height;
  const padX = 8;
  const padY = 16;
  if (data.length === 0) return <ChartEmpty height={height} className={className} />;

  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  const stepX = data.length > 1 ? (W - padX * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => ({
    x: padX + i * stepX,
    y: H - padY - (d.value / max) * (H - padY * 2),
  }));
  const line = toPath(pts);
  const area = `${line} L${pts[pts.length - 1]?.x ?? 0},${H - padY} L${pts[0]?.x ?? 0},${H - padY} Z`;

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id="ac-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {showGrid &&
          [0, 0.25, 0.5, 0.75, 1].map((f) => {
            const y = padY + f * (H - padY * 2);
            return <line key={f} x1={0} x2={W} y1={y} y2={y} className="stroke-border" strokeWidth={1} />;
          })}
        <path d={area} fill="url(#ac-fill)" />
        <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={color} />
        ))}
      </svg>
      <div className="flex justify-between text-[11px] text-muted mt-1">
        <span>{format(data[0]?.value ?? 0)}</span>
        <span>{format(Math.round(max / 2))}</span>
        <span className="font-medium text-fg">{format(max)}</span>
      </div>
    </div>
  );
}

export function BarChart({
  data,
  height = 180,
  color = PALETTE[1],
  format = (n: number) => String(n),
  className,
}: {
  data: Point[];
  height?: number;
  color?: string;
  format?: (n: number) => string;
  className?: string;
}) {
  const max = niceMax(Math.max(...data.map((d) => d.value), 1));
  if (data.length === 0) return <ChartEmpty height={height} className={className} />;
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => {
          const h = max === 0 ? 0 : Math.max((d.value / max) * height, d.value > 0 ? 3 : 0);
          return (
            <div
              key={`${d.label}-${i}`}
              className="flex-1 rounded-t-md transition-all"
              style={{ height: h, backgroundColor: color, opacity: 0.35 + (0.65 * d.value) / (max || 1) }}
              title={`${d.label}: ${format(d.value)}`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-[11px] text-muted mt-1">
        <span>{data[0]?.label}</span>
        <span>peak {format(max)}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function DonutChart({
  data,
  size = 180,
  thickness = 26,
  centerLabel,
  centerValue,
  className,
}: {
  data: { label: string; value: number }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  className?: string;
}) {
  const total = data.reduce((a, b) => a + b.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  // precompute cumulative offsets so nothing is mutated during render
  const fractions = data.map((d) => d.value / total);
  const segments = fractions.map((frac, i) => {
    const before = fractions.slice(0, i).reduce((a, b) => a + b, 0);
    return {
      key: data[i].label,
      color: PALETTE[i % PALETTE.length],
      dash: `${frac * c} ${c}`,
      offset: -before * c,
    };
  });

  if (total === 0) {
    return (
      <div className={cn("flex items-center justify-center", className)} style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="stroke-border" strokeWidth={thickness} />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((s) => (
          <circle
            key={s.key}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth={thickness}
            strokeDasharray={s.dash}
            strokeDashoffset={s.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold leading-none">{centerValue ?? total}</span>
        {centerLabel ? <span className="text-[11px] text-muted mt-1">{centerLabel}</span> : null}
      </div>
    </div>
  );
}

export function Sparkline({ data, color = PALETTE[0], className }: { data: number[]; color?: string; className?: string }) {
  if (data.length < 2) return null;
  const W = 100;
  const H = 28;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / span) * H,
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("w-16 h-7", className)} preserveAspectRatio="none">
      <path d={toPath(pts)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Horizontal labelled bars - used for top pages, sources, devices. */
export function RankBars({
  data,
  format = (n: number) => n.toLocaleString(),
  className,
}: {
  data: { label: string; value: number; hint?: string }[];
  format?: (n: number) => string;
  className?: string;
}) {
  if (data.length === 0) return <ChartEmpty height={80} className={className} />;
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className={cn("space-y-2.5", className)}>
      {data.map((d, i) => (
        <li key={`${d.label}-${i}`}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-mono text-xs truncate" title={d.label}>
              {d.label}
            </span>
            <span className="text-xs text-muted shrink-0">
              {format(d.value)}
              {d.hint ? ` · ${d.hint}` : ""}
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-surface2 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max((d.value / max) * 100, 2)}%`, backgroundColor: PALETTE[i % PALETTE.length] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ChartEmpty({ height, className }: { height: number; className?: string }) {
  return (
    <div
      className={cn("w-full rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted", className)}
      style={{ height }}
    >
      No data yet — start browsing to collect traffic.
    </div>
  );
}

export { PALETTE };
