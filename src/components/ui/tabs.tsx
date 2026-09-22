"use client";

import { cn } from "@/lib/cn";

export function Tabs<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex flex-wrap items-center gap-1 rounded-lg border border-border bg-surface2 p-1",
        className
      )}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            "px-3 h-8 rounded-md text-xs font-medium transition-colors",
            value === opt.value
              ? "bg-primary text-white dark:text-[#052e16]"
              : "text-muted hover:text-fg"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}