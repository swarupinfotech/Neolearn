import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

const tones: Record<string, string> = {
  green: "bg-primary-soft text-primary-strong dark:text-primary border-primary/30",
  blue: "bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950 dark:text-sky-300",
  amber: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300",
  rose: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300",
  violet: "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950 dark:text-violet-300",
  neutral: "bg-surface2 text-muted border-border",
};

export function Badge({
  children,
  tone = "green",
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}