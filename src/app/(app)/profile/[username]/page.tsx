import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Zap, Flame, BookOpen, Swords, Trophy, Award } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { levelInfo } from "@/services/level";
import { getStreak } from "@/services/streak";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/cn";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const u = await prisma.user.findUnique({ where: { username }, select: { displayName: true } });
  return { title: u ? `${u.displayName} | NeoLearn` : "Profile | NeoLearn" };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const me = await requireUser();
  const target = await prisma.user.findUnique({
    where: { username },
    include: {
      userAchievements: { include: { achievement: true }, orderBy: { unlockedAt: "desc" }, take: 6 },
      certificates: { take: 3, orderBy: { completedAt: "desc" } },
    },
  });
  if (!target || target.status === "suspended") notFound();

  const [streak, counters] = await Promise.all([
    getStreak(target.id),
    Promise.all([
      prisma.lessonProgress.count({ where: { userId: target.id, status: "completed" } }),
      prisma.challengeAttempt.count({ where: { userId: target.id, hiddenPassed: true } }),
      prisma.quizAttempt.count({ where: { userId: target.id, passed: true } }),
      prisma.projectSubmission.count({ where: { userId: target.id, passed: true } }),
      prisma.userAchievement.count({ where: { userId: target.id } }),
    ]),
  ]);

  const [lessons, challengeCount, quizCount, projectCount, achievementCount] = counters;
  const info = levelInfo(target.xp);
  const isMe = me.id === target.id;
  const skills = (target.skills as unknown as string[]) ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <Avatar name={target.displayName} src={target.avatarUrl} size={72} className="text-2xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{target.displayName}</h1>
              {isMe ? <Badge tone="blue">You</Badge> : null}
              {target.role !== "USER" ? <Badge tone="amber">{target.role}</Badge> : null}
            </div>
            <p className="text-sm text-muted">@{target.username} · joined {formatDate(target.createdAt)}</p>
            {target.bio ? <p className="text-sm mt-2 text-fg/90">{target.bio}</p> : null}
            {skills.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {skills.slice(0, 6).map((s) => (
                  <Badge key={s} tone="neutral">{s}</Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MiniStat icon={<Zap className="h-4 w-4 text-amber-500" />} label="Level" value={`${info.level}`} />
        <MiniStat icon={<Flame className="h-4 w-4 text-orange-500" />} label="Streak" value={`${streak.current}`} />
        <MiniStat icon={<BookOpen className="h-4 w-4 text-primary" />} label="Lessons" value={`${lessons}`} />
        <MiniStat icon={<Swords className="h-4 w-4 text-violet-500" />} label="Challenges" value={`${challengeCount}`} />
        <MiniStat icon={<Award className="h-4 w-4 text-emerald-500" />} label="XP" value={`${target.xp.toLocaleString()}`} />
      </div>

      {target.userAchievements.length > 0 ? (
        <section>
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Trophy className="h-5 w-5 text-amber-500" /> Achievements
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {target.userAchievements.map((a) => (
              <Card key={a.id} className="p-4 flex items-center gap-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-lg">
                  {a.achievement.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{a.achievement.title}</p>
                  <p className="text-xs text-muted">Unlocked {formatDate(a.unlockedAt)}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {target.certificates.length > 0 ? (
        <section>
          <h2 className="font-semibold mb-3">Certificates</h2>
          <ul className="space-y-2">
            {target.certificates.map((c) => (
              <li key={c.id} className="card p-4 flex items-center justify-between gap-3">
                <span className="font-medium">{c.pathTitle}</span>
                <span className="text-xs text-muted">{formatDate(c.completedAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-muted">
        {achievementCount} total achievements · {quizCount} quizzes passed · {projectCount} projects built
      </p>
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-3 flex flex-col items-center gap-1 text-center">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft">{icon}</span>
      <span className="text-lg font-bold leading-none">{value}</span>
      <span className={cn("text-[10px] uppercase tracking-wide text-muted")}>{label}</span>
    </Card>
  );
}