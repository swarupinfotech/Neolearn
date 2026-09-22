"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, User, Trophy, Shield } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/actions/auth";

interface Props {
  user: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    level: number;
    xp: number;
    role: string;
  };
}

export function UserMenu({ user }: Props) {
  const router = useRouter();

  async function handleLogout() {
    await logoutAction();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/leaderboard"
        className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface2 text-xs font-semibold text-primary"
        title="Your level and XP"
      >
        LV {user.level} · {user.xp.toLocaleString()} XP
      </Link>
      <Link href={`/profile/${user.username}`} aria-label="Profile" className="rounded-full">
        <Avatar name={user.displayName} src={user.avatarUrl} size={36} />
      </Link>
      <div className="relative group">
        <button
          className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-muted hover:text-fg"
          aria-label="Account menu"
        >
          <Settings className="h-4 w-4" />
        </button>
        <div className="absolute right-0 top-11 w-56 card p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible group-focus-within:opacity-100 group-focus-within:visible transition-all">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-surface2">
            <User className="h-4 w-4" /> Dashboard
          </Link>
          <Link href={`/profile/${user.username}`} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-surface2">
            <Trophy className="h-4 w-4" /> My profile
          </Link>
          {user.role === "ADMIN" || user.role === "MODERATOR" ? (
            <Link href="/admin" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-surface2">
              <Shield className="h-4 w-4" /> Admin
            </Link>
          ) : null}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-surface2 text-rose-600"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </div>
    </div>
  );
}