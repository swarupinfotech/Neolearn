import Link from "next/link";
import { Code2 } from "lucide-react";
import { getSessionUser } from "@/services/auth";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const links = [
  { label: "Courses", href: "/courses" },
  { label: "Paths", href: "/paths" },
  { label: "Challenges", href: "/challenges" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Community", href: "/community" },
  { label: "Pricing", href: "/pricing" },
];

export async function PublicNav() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white dark:text-[#052e16]">
            <Code2 className="h-5 w-5" />
          </span>
          NeoLearn
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-surface2 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <UserMenu
              user={{
                username: user.username,
                displayName: user.displayName,
                avatarUrl: user.avatarUrl,
                level: user.level,
                xp: user.xp,
                role: user.role,
              }}
            />
          ) : (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium text-muted hover:text-fg"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center h-9 px-4 rounded-lg text-sm font-medium bg-primary text-white dark:text-[#052e16] hover:bg-primary-strong"
              >
                Start Learning
              </Link>
            </>
          )}
        </div>
      </nav>
      <div className="lg:hidden border-t border-border overflow-x-auto">
        <div className="flex gap-1 px-3 py-2 min-w-max">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-muted hover:bg-surface2 whitespace-nowrap"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}