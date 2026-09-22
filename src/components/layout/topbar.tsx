import Link from "next/link";
import { Flame, Zap, Search, Bell } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { getStreak } from "@/services/streak";
import { unreadCount } from "@/services/notifications";

export async function Topbar({
  user,
}: {
  user: { id: string; username: string; displayName: string; avatarUrl: string | null; level: number; xp: number; role: string };
}) {
  let streakCount = 0;
  let unread = 0;
  try {
    const [streak, n] = await Promise.all([getStreak(user.id), unreadCount(user.id)]);
    streakCount = streak.current;
    unread = n;
  } catch {
    // Non-critical: keep topbar functional on data errors.
    streakCount = 0;
    unread = 0;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        <form action="/search" method="GET" className="hidden sm:flex flex-1 max-w-md">
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              id="q"
              name="q"
              placeholder="Search courses, challenges, people…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-surface2 text-sm placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </form>

        <div className="flex items-center gap-2 sm:gap-3 ml-auto">
          <Link
            href="/dashboard"
            className="hidden sm:flex items-center gap-1 h-9 px-3 rounded-lg border border-border bg-surface2 text-xs font-semibold"
            title="Current level"
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            LV {user.level}
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-1 h-9 px-3 rounded-lg border border-border bg-surface2 text-xs font-semibold text-orange-500"
            title="Daily streak"
          >
            <Flame className="h-3.5 w-3.5" />
            {streakCount}
          </Link>
          <ThemeToggle />
          <Link
            href="/notifications"
            aria-label="Notifications"
            className="relative h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted hover:text-fg"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 ? (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] grid place-items-center">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Link>
          <Link href={`/profile/${user.username}`} aria-label="Profile">
            <Avatar name={user.displayName} src={user.avatarUrl} size={36} />
          </Link>
        </div>
      </div>
    </header>
  );
}