import type { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  Flame,
  BookOpen,
  TrendingUp,
  Trophy,
  ArrowRight,
  Activity,
} from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { levelInfo } from "@/services/level";
import { getStreak } from "@/services/streak";
import { getDailyMission } from "@/services/daily";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CourseCard } from "@/components/course/course-card";
import { DailyMissionCard } from "@/components/dashboard/daily-mission-card";
import { track } from "@/lib/events";

export const metadata: Metadata = { title: "Dashboard | NeoLearn" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [streak, daily] = await Promise.all([
    getStreak(user.id),
    getDailyMission(user.id),
  ]).catch(() => [
    { current: 0, longest: 0, today: false, days: [] as { date: string; active: boolean }[] },
    { dateKey: "", tasks: [] as { key: string; label: string; target: number; done: number }[], rewardXp: 0, allComplete: false, claimed: false },
  ]);

  const [courseProgress, completedLessons, achievements, xpHistory, recommended] = await Promise.all([
    prisma.courseProgress.findMany({
      where: { userId: user.id },
      include: { course: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
    prisma.lessonProgress.count({ where: { userId: user.id, status: "completed" } }),
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
      take: 3,
    }),
    prisma.xpTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { students: "desc" },
      take: 6,
    }),
  ]);

  const info = levelInfo(user.xp);
  const startedCourseIds = new Set(courseProgress.map((p) => p.courseId));
  const notStarted = recommended.filter((c) => !startedCourseIds.has(c.id)).slice(0, 3);

  void track("dashboard_view", {}, user.id);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {user.displayName.split(" ")[0] || "learner"} 👋
          </h1>
          <p className="text-sm text-muted mt-1">
            {user.bio ? user.bio : "Level up, keep your streak and make today count."}
          </p>
        </div>
        <Link href="/playground">
          <Button variant="outline">
            Open playground <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </header>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Zap className="h-5 w-5 text-amber-500" />}
          label="Total XP"
          value={user.xp.toLocaleString()}
          sub={`Level ${info.level}`}
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          label="Day streak"
          value={String(streak.current)}
          sub={`Longest: ${streak.longest}`}
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-primary" />}
          label="Lessons completed"
          value={String(completedLessons)}
          sub="Keep going!"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5 text-violet-500" />}
          label="Achievements"
          value={String(achievements.length)}
          sub="Earn more along the way"
        />
      </div>

      {/* Level progress */}
      <section className="card p-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium">
            Level {info.level} · {info.xpNeededForNext > 0 ? `${info.xpNeededForNext} XP to level ${info.level + 1}` : "Max level!"}
          </span>
          <span className="text-muted">
            {info.xpIntoLevel} / {info.nextLevelXp - info.currentLevelXp} XP
          </span>
        </div>
        <ProgressBar value={info.progressPct} label="Level progress" />
      </section>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Continue learning */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Continue learning</h2>
            </div>
            {courseProgress.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {courseProgress.map((p) => (
                  <Card key={p.course.id} className="card-hover">
                    <Badge tone="blue">{p.course.category}</Badge>
                    <h3 className="font-semibold mt-2 line-clamp-1">{p.course.title}</h3>
                    <ProgressBar
                      value={Math.round((p.completedLessons / Math.max(1, p.totalLessons)) * 100)}
                      className="mt-3"
                      label={`${p.completedLessons}/${p.totalLessons} lessons`}
                    />
                    <Link href={`/courses/${p.course.slug}`} className="block mt-4">
                      <Button size="sm" variant="secondary" className="w-full">
                        Resume course <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-10">
                <p className="text-sm text-muted">No courses started yet.</p>
                <Link href="/courses" className="inline-block mt-4">
                  <Button>Browse courses</Button>
                </Link>
              </Card>
            )}
          </section>

          {/* Recommended */}
          {notStarted.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Recommended for you</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {notStarted.map((c) => (
                  <CourseCard key={c.id} course={{ ...c, icon: "", color: "#22c55e" as string }} />
                ))}
              </div>
            </section>
          ) : null}

          {/* Activity feed */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Recent activity</h2>
            </div>
            {xpHistory.length > 0 ? (
              <Card>
                <ul className="divide-y divide-border">
                  {xpHistory.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="text-muted capitalize">{t.type.replace(/_/g, " ")}</span>
                      <span className="font-semibold text-primary">+{t.amount} XP</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : (
              <Card>
                <p className="px-4 py-6 text-sm text-muted text-center">
                  Complete a lesson or quiz to see your XP history here.
                </p>
              </Card>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <DailyMissionCard
            tasks={daily.tasks as never}
            rewardXp={daily.rewardXp ?? 0}
            allComplete={daily.allComplete ?? false}
            claimed={daily.claimed ?? false}
          />

          {achievements.length > 0 ? (
            <section className="card p-5">
              <h2 className="font-semibold flex items-center gap-2 mb-4">
                <Trophy className="h-4 w-4 text-amber-500" /> Recent achievements
              </h2>
              <ul className="space-y-3">
                {achievements.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 text-sm">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-base">
                      {a.achievement.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{a.achievement.title}</p>
                      <p className="text-xs text-muted">{a.achievement.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <Link href="/achievements" className="block mt-4 text-sm font-medium text-primary hover:underline">
                View all achievements →
              </Link>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase text-muted tracking-wide">{label}</p>
          <p className="text-xl font-bold leading-tight">{value}</p>
          <p className="text-xs text-muted truncate">{sub}</p>
        </div>
      </div>
    </Card>
  );
}