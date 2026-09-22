import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Flame } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { getStreak } from "@/services/streak";
import { getDailyMission } from "@/services/daily";
import { DailyMissionCard } from "@/components/dashboard/daily-mission-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Daily Mission | NeoLearn" };

export default async function DailyPage() {
  const user = await requireUser();
  const streak = await getStreak(user.id);
  const daily = await getDailyMission(user.id);

  const weekday = (d: string) => new Date(d + "T00:00:00.000Z").toLocaleDateString("en-US", { weekday: "short" });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <div className="flex items-center gap-2 mb-2">
          <CalendarCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">Daily Mission</h1>
        </div>
        <p className="text-muted max-w-2xl">
          Three small actions every day build a compounding habit. Complete all three to claim bonus XP.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <DailyMissionCard
          tasks={daily.tasks as never}
          rewardXp={daily.rewardXp}
          allComplete={daily.allComplete}
          claimed={daily.claimed}
        />

        <Card className="p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Flame className="h-5 w-5 text-orange-500" /> Streak
          </h2>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="card p-3 text-center">
              <p className="text-3xl font-extrabold text-orange-500">{streak.current}</p>
              <p className="text-xs text-muted mt-1">Current streak</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-3xl font-extrabold">{streak.longest}</p>
              <p className="text-xs text-muted mt-1">Longest streak</p>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {streak.days.map((d) => (
              <div key={d.date} className="text-center">
                <div
                  className={cn(
                    "h-9 rounded-lg grid place-items-center text-xs font-bold transition-colors",
                    d.active ? "bg-primary text-white" : "bg-surface2 text-muted"
                  )}
                  title={formatDate(d.date)}
                >
                  {new Date(d.date + "T00:00:00.000Z").getUTCDate()}
                </div>
                <span className="text-[10px] text-muted mt-1 block">{weekday(d.date)}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-4">
            Learn at least once a day to keep the streak alive. Days are tracked in UTC.
          </p>
        </Card>
      </div>

      <section className="card-2 p-6 border border-primary/40 bg-primary-soft">
        <h2 className="font-semibold">Ways to progress today</h2>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <Link href="/courses" className="card p-4 hover:border-primary/60 transition-colors">
            <p className="font-medium">1. Complete a lesson</p>
            <p className="text-xs text-muted mt-1">Frontline courses or mixed drills.</p>
          </Link>
          <Link href="/practice" className="card p-4 hover:border-primary/60 transition-colors">
            <p className="font-medium">2. Pass a quiz</p>
            <p className="text-xs text-muted mt-1">Short drills in your strongest topics.</p>
          </Link>
          <Link href="/challenges" className="card p-4 hover:border-primary/60 transition-colors">
            <p className="font-medium">3. Solve a challenge</p>
            <p className="text-xs text-muted mt-1">Hidden-test validated problems.</p>
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted">
          Mission date: <Badge tone="neutral">{formatDate(daily.dateKey)}</Badge>
        </p>
      </section>
    </div>
  );
}