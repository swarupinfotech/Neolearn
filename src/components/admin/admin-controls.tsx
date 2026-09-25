"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useEffect, useState, useTransition, useRef } from "react";
import { Search, X, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

// ============================================================
// URL-driven filters. State lives in the query string so every
// admin view is shareable, bookmarkable and server-rendered.
// ============================================================

export function AdminFilterBar({
  basePath,
  searchPlaceholder = "Search…",
  search = "",
  selects = [],
  extra,
}: {
  basePath: string;
  searchPlaceholder?: string;
  search?: string;
  selects?: { name: string; value: string; options: { value: string; label: string }[] }[];
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [term, setTerm] = useState(search);
  const [syncedSearch, setSyncedSearch] = useState(search);
  const [isPending, startTransition] = useTransition();
  const first = useRef(true);

  // adjust state during render when the URL changes (back/forward, reset)
  if (search !== syncedSearch) {
    setSyncedSearch(search);
    setTerm(search);
  }

  // debounce the search box into the URL
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => {
      push(router, pathname, sp, { q: term || undefined, page: undefined });
    }, 350);
    return () => clearTimeout(id);
  }, [term, router, pathname, sp]);

  const active = search || selects.some((s) => s.value && s.value !== "all");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label="Search"
          className="w-full h-9 pl-9 pr-8 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-colors"
        />
        {term ? (
          <button
            onClick={() => setTerm("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-fg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      {selects.map((s) => (
        <select
          key={s.name}
          value={s.value}
          aria-label={s.name}
          onChange={(e) => push(router, pathname, sp, { [s.name]: e.target.value, page: undefined })}
          className="h-9 px-2.5 rounded-lg border border-border bg-surface text-sm outline-none focus:border-primary transition-colors"
        >
          {s.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}

      {extra}

      {active ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setTerm("");
            startTransition(() => router.push(basePath));
          }}
        >
          Reset
        </Button>
      ) : null}

      {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" /> : null}
    </div>
  );
}

export function Pagination({
  basePath,
  page,
  pageCount,
  params = {},
}: {
  basePath: string;
  page: number;
  pageCount: number;
  params?: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  if (pageCount <= 1) return null;

  const window: number[] = [];
  const from = Math.max(1, page - 2);
  const to = Math.min(pageCount, from + 4);
  for (let i = Math.max(1, to - 4); i <= to; i++) window.push(i);

  const go = (p: number) => push(router, pathname, sp, { page: p === 1 ? undefined : String(p) });

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-xs text-muted">
        Page <span className="tabular-nums font-medium text-fg">{page}</span> of{" "}
        <span className="tabular-nums font-medium text-fg">{pageCount}</span>
      </p>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => go(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {window.map((p) => (
          <button
            key={p}
            onClick={() => go(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(
              "h-8 min-w-8 px-2 rounded-md text-xs font-medium tabular-nums transition-colors",
              p === page ? "bg-primary text-white dark:text-[#052e16]" : "text-muted hover:text-fg hover:bg-surface2"
            )}
          >
            {p}
          </button>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={page >= pageCount}
          onClick={() => go(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

type Push = (patch: Record<string, string | undefined>) => void;

function push(
  router: { push: (url: string) => void },
  pathname: string,
  sp: URLSearchParams,
  patch: Record<string, string | undefined>
) {
  const next = new URLSearchParams(sp.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === "" || v === "all") next.delete(k);
    else next.set(k, v);
  }
  const qs = next.toString();
  router.push(qs ? `${pathname}?${qs}` : pathname);
}

/** Segmented control for range switching (7 / 30 / 90 days). */
export function RangePicker({
  value,
  options,
  paramName = "days",
}: {
  value: string;
  options: { value: string; label: string }[];
  paramName?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => push(router, pathname, sp, { [paramName]: o.value })}
          aria-pressed={value === o.value}
          className={cn(
            "h-7 px-2.5 rounded-md text-xs font-medium transition-colors",
            value === o.value ? "bg-primary text-white dark:text-[#052e16]" : "text-muted hover:text-fg"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export type { Push };
