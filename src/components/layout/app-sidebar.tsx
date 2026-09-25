import Link from "next/link";
import {
  LayoutDashboard,
  BookOpen,
  Swords,
  Terminal,
  ListChecks,
  CalendarCheck,
  FolderKanban,
  Users,
  Trophy,
  GraduationCap,
  Award,
  Settings,
  Shield,
  Bell,
  Sparkles,
  Search as SearchIcon,
  UserPlus,
} from "lucide-react";

const main = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Courses", href: "/courses", icon: BookOpen },
  { label: "Learning Paths", href: "/paths", icon: GraduationCap },
  { label: "Challenges", href: "/challenges", icon: Swords },
  { label: "Practice", href: "/practice", icon: ListChecks },
  { label: "Daily Mission", href: "/daily", icon: CalendarCheck },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Playground", href: "/playground", icon: Terminal },
  { label: "AI Mentor", href: "/mentor", icon: Sparkles },
];

const social = [
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Achievements", href: "/achievements", icon: Award },
  { label: "Community", href: "/community", icon: Users },
  { label: "Friends", href: "/friends", icon: UserPlus },
  { label: "Search", href: "/search", icon: SearchIcon },
  { label: "Certificates", href: "/certificates", icon: Award },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar({ role }: { role: string }) {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-surface min-h-screen sticky top-0 h-screen overflow-y-auto">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg px-5 h-16 border-b border-border">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white dark:text-[#052e16]">
          <BookOpen className="h-5 w-5" />
        </span>
        NeoLearn
      </Link>
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Main navigation">
        <p className="px-3 text-[11px] font-semibold uppercase text-muted mb-1">Learn</p>
        {main.map((item) => (
          <SidebarLink key={item.href} {...item} />
        ))}
        <p className="px-3 pt-4 text-[11px] font-semibold uppercase text-muted mb-1">Community</p>
        {social.map((item) => (
          <SidebarLink key={item.href} {...item} />
        ))}
        {/* The admin console is gated on the ADMIN role, so moderators must not
            be offered a link that only redirects them back to the dashboard. */}
        {role === "ADMIN" ? (
          <>
            <p className="px-3 pt-4 text-[11px] font-semibold uppercase text-muted mb-1">Staff</p>
            <SidebarLink label="Admin" href="/admin" icon={Shield} />
          </>
        ) : null}
      </nav>
    </aside>
  );
}

function SidebarLink({
  label,
  href,
  icon: Icon,
}: {
  label: string;
  href: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-fg hover:bg-surface2 transition-colors"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}