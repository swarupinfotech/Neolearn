import type { Metadata } from "next";
import { Award } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { userAchievements, getAchievementStats } from "@/services/achievements";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Achievements | NeoLearn" };

export default async function AchievementsPage() {
  const user = await requireUser();
  const [owned, all, stats] = await Promise.all([
    userAchievements(user.id),
    prisma.achievement.findMany({ orderBy: { order: "asc" } }),
    getAchievementStats(user.id),
  ]);
  const ownedByKey = new Map(owned.map((o) => [o.achievement.key, o.unlockedAt]));
  const unlocked = owned.length;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <Award className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Achievements</h1>
        </div>
        <p className="text-muted">
          {unlocked} of {all.length} unlocked
          <span className="mx-2 text-muted">·</span>
          {stats.xp.toLocaleString()} XP
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-3">
        {all.map((a) => {
          const unlockedAt = ownedByKey.get(a.key);
          const isUnlocked = Boolean(unlockedAt);
          return (
            <Card
              key={a.id}
              className={cn("p-4 flex items-start gap-3", isUnlocked ? "" : "opacity-55 saturate-50")}
            >
              <span
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl",
                  isUnlocked ? "bg-primary-soft" : "bg-surface-2"
                )}
              >
                {a.icon}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-sm">{a.title}</h3>
                  {isUnlocked ? <Badge tone="green">Unlocked</Badge> : <Badge tone="neutral">Locked</Badge>}
                </div>
                <p className="text-xs text-muted mt-1">{a.description}</p>
                <p className="text-xs text-amber-600 mt-1.5 font-medium">+{a.xpReward} XP</p>
                {isUnlocked ? (
                  <p className="text-[11px] text-muted mt-0.5">Unlocked {formatDate(unlockedAt!)}</p>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}