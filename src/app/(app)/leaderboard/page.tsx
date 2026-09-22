import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Medal } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Leaderboard | NeoLearn" };

const medalColor = ["text-amber-500", "text-slate-400", "text-amber-700"];

export default async function LeaderboardPage() {
  const user = await requireUser();
  const top = await prisma.user.findMany({
    where: { status: "active" },
    orderBy: [{ xp: "desc" }, { level: "desc" }],
    take: 50,
    select: { id: true, username: true, displayName: true, avatarUrl: true, xp: true, level: true },
  });

  const ownEntry = await prisma.user.findUnique({
    where: { id: user.id },
    select: { xp: true, level: true },
  });
  const ownRank = ownEntry
    ? 1 + (await prisma.user.count({ where: { status: "active", OR: [{ xp: { gt: ownEntry.xp } }, { xp: ownEntry.xp, level: { gt: ownEntry.level } }] } }))
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Leaderboard</h1>
        </div>
        <p className="text-muted">Ranked by total XP — the authoritative score from the XP ledger.</p>
      </header>

      <div className="card p-4 flex items-center justify-between">
        <span className="text-sm">
          Your rank: <span className="font-bold text-primary">#{ownRank}</span>
        </span>
        <span className="text-sm text-muted">
          {ownEntry ? `${ownEntry.xp.toLocaleString()} XP · Level ${ownEntry.level}` : ""}
        </span>
      </div>

      <Card>
        <ul className="divide-y divide-border">
          {top.map((u, i) => {
            const isMe = u.id === user.id;
            return (
              <li key={u.id} className={cn("flex items-center gap-3 px-4 py-3", isMe && "bg-primary-soft")}>
                <span className="w-8 shrink-0 text-center">
                  {i < 3 ? (
                    <Medal className={cn("h-5 w-5 inline", medalColor[i])} aria-label={`#${i + 1}`} />
                  ) : (
                    <span className="text-sm font-bold text-muted">{i + 1}</span>
                  )}
                </span>
                <Link href={`/profile/${u.username}`} className="flex items-center gap-3 min-w-0 flex-1 group">
                  <Avatar name={u.displayName} src={u.avatarUrl} size={36} />
                  <span className="min-w-0">
                    <span className="block font-medium truncate group-hover:text-primary transition-colors">
                      {u.displayName}
                    </span>
                    <span className="block text-xs text-muted">@{u.username}{isMe ? " · you" : ""}</span>
                  </span>
                </Link>
                <span className="shrink-0 text-right">
                  <span className="block font-bold">{u.xp.toLocaleString()} XP</span>
                  <span className="inline-block mt-0.5"><Badge tone="neutral">LV {u.level}</Badge></span>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <p className="text-xs text-muted">
        XP comes only from completed lessons, passed quizzes, solved challenges, projects and daily
        missions. No shortcuts.
      </p>
    </div>
  );
}