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
  Swords,
  FolderKanban,
  Route,
  Target,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { levelInfo } from "@/services/level";
import { getStreak } from "@/services/streak";
import { getDailyMission } from "@/services/daily";
import { recommendCourses, nextLessonFor } from "@/services/recommendations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CourseCard } from "@/components/course/course-card";
import { DailyMissionCard } from "@/components/dashboard/daily-mission-card";
import { track } from "@/lib/events";

export const metadata: Metadata = { title: "Dashboard | NeoLearn", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const user = await requireUser();

  const [streak, daily] = await Promise.all([
    getStreak(user.id),
    getDailyMission(user.id),
  ]).catch(() => [
    { current: 0, longest: 0, today: false, days: [] as { date: string; active: boolean }[] },
    { dateKey: "", tasks: [] as { key: string; label: string; target: number; done: number }[], rewardXp: 0, allComplete: false, claimed: false },
  ]);

  const [courseProgress, completedLessons, achievementCount, xpHistory, recommendations, nextUp, skills] =
    await Promise.all([
      prisma.courseProgress.findMany({
        where: { userId: user.id },
        include: { course: { select: { id: true, slug: true, title: true, category: true, xpReward: true } } },
        orderBy: { updatedAt: "desc" },
        take: 4,
      }),
      prisma.lessonProgress.count({ where: { userId: user.id, status: "completed" } }),
      // The total, not the "take: 3" preview used for the achievements list.
      prisma.userAchievement.count({ where: { userId: user.id } }),
      prisma.xpTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      recommendCourses(user.id, 6),
      nextLessonFor(user.id),
      prisma.onboarding.findUnique({ where: { userId: user.id } }),
    ]);

  // Solved/finished ids are needed to suggest something the learner has not
  // already done, so they are resolved before the dependent lookups.
  const [solvedChallenges, passedProjects, passedQuizzes] = await Promise.all([
    prisma.challengeAttempt.findMany({
      where: { userId: user.id, hiddenPassed: true },
      select: { challengeId: true },
      distinct: ["challengeId"],
    }),
    prisma.projectSubmission.findMany({
      where: { userId: user.id, passed: true },
      select: { projectId: true },
      distinct: ["projectId"],
    }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, passed: true },
      select: { quizId: true },
      distinct: ["quizId"],
    }),
  ]);

  const solvedChallengeIds = solvedChallenges.map((c) => c.challengeId);
  const passedProjectIds = passedProjects.map((p) => p.projectId);

  const [achievements, pathProgress, nextChallenge, nextProject] = await Promise.all([
    prisma.userAchievement.findMany({
      where: { userId: user.id },
      include: { achievement: true },
      orderBy: { unlockedAt: "desc" },
      take: 3,
    }),
    prisma.userPathProgress.findMany({
      where: { userId: user.id },
      include: { path: { select: { slug: true, title: true, color: true } } },
      orderBy: { progress: "desc" },
      take: 3,
    }),
    // Easiest unsolved challenge, so the suggestion is always actionable.
    prisma.challenge.findFirst({
      where: { status: "PUBLISHED", id: { notIn: solvedChallengeIds } },
      orderBy: [{ difficulty: "asc" }, { xpReward: "asc" }],
      select: { slug: true, title: true, difficulty: true },
    }),
    // Easiest unfinished project, same idea.
    prisma.project.findFirst({
      where: { status: "PUBLISHED", id: { notIn: passedProjectIds } },
      orderBy: [{ difficulty: "asc" }, { order: "asc" }],
      select: { slug: true, title: true, difficulty: true },
    }),
  ]);

  const skillStats = {
    challengesSolved: solvedChallenges.length,
    projectsPassed: passedProjects.length,
    quizzesPassed: passedQuizzes.length,
  };

  const info = levelInfo(user.xp);

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
          sub={`${courseProgress.length} course${courseProgress.length === 1 ? "" : "s"} started`}
        />
        <StatCard
          icon={<Trophy className="h-5 w-5 text-violet-500" />}
          label="Achievements"
          value={String(achievementCount)}
          sub="Earn more along the way"
        />
      </div>

      {/* Skills breakdown */}
      <section className="card p-5" aria-labelledby="dash-skills">
        <h2 id="dash-skills" className="font-semibold mb-3">
          Your skill footprint
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <SkillStat label="Challenges solved" value={skillStats.challengesSolved} icon={<Swords className="h-4 w-4" />} />
          <SkillStat label="Projects passed" value={skillStats.projectsPassed} icon={<FolderKanban className="h-4 w-4" />} />
          <SkillStat label="Quizzes passed" value={skillStats.quizzesPassed} icon={<Target className="h-4 w-4" />} />
          <SkillStat
            label="Paths in progress"
            value={pathProgress.length}
            icon={<Route className="h-4 w-4" />}
          />
        </div>
        {skills ? (
          <p className="text-xs text-muted mt-3">
            {skills.experienceLevel}
            {skills.goal ? ` · goal: ${skills.goal}` : ""}
            {Array.isArray(skills.topics) && skills.topics.length > 0
              ? ` · interested in ${(skills.topics as unknown[]).map(String).join(", ")}`
              : ""}
          </p>
        ) : (
          <p className="text-xs text-muted mt-3">
            <Link href="/onboarding" className="text-primary hover:underline">
              Tell us your goals
            </Link>{" "}
            to get better recommendations.
          </p>
        )}
      </section>

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
          {/* Pick up exactly where the learner stopped */}
          {nextUp ? (
            <section className="card p-5 border-l-4 border-l-primary">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Pick up where you left off</p>
              <h2 className="font-semibold text-lg mt-1">{nextUp.lessonTitle}</h2>
              <p className="text-sm text-muted mt-0.5">
                in <Link href={`/courses/${nextUp.courseSlug}`} className="hover:text-primary">{nextUp.courseTitle}</Link>
              </p>
              <Link href={`/learn/${nextUp.lessonId}`} className="inline-block mt-4">
                <Button>
                  Continue lesson <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </section>
          ) : null}

          {/* Continue learning */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Your courses</h2>
            </div>
            {courseProgress.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {courseProgress.map((p) => {
                  const pct = Math.round((p.completedLessons / Math.max(1, p.totalLessons)) * 100);
                  return (
                    <Card key={p.course.id} className="card-hover">
                      <div className="flex items-start justify-between gap-2">
                        <Badge tone="blue">{p.course.category}</Badge>
                        {p.completed ? <Badge tone="green">Complete</Badge> : null}
                      </div>
                      <h3 className="font-semibold mt-2 line-clamp-1">{p.course.title}</h3>
                      <ProgressBar value={pct} className="mt-3" label={`${p.completedLessons}/${p.totalLessons} lessons`} />
                      <p className="text-xs text-muted mt-2">{pct}% done · +{p.course.xpReward} XP on completion</p>
                      <Link href={`/courses/${p.course.slug}`} className="block mt-4">
                        <Button size="sm" variant="secondary" className="w-full">
                          {p.completed ? "Review course" : "Resume course"} <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </Card>
                  );
                })}
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

          {/* Learning paths in progress */}
          {pathProgress.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Route className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Learning paths</h2>
              </div>
              <div className="space-y-2">
                {pathProgress.map((p) => (
                  <Link key={p.id} href={`/paths/${p.path.slug}`}>
                    <Card className="card-hover p-4">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="font-medium text-sm">{p.path.title}</span>
                        {p.completed ? <Badge tone="green">Certified</Badge> : <span className="text-xs text-muted">{p.progress}%</span>}
                      </div>
                      <ProgressBar value={p.progress} />
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {/* Recommended */}
          {recommendations.length > 0 ? (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Recommended for you</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendations.slice(0, 3).map((c) => (
                  <div key={c.slug} className="relative">
                    <CourseCard
                      course={{
                        id: c.slug,
                        slug: c.slug,
                        title: c.title,
                        description: c.description,
                        category: c.category,
                        language: c.language,
                        difficulty: c.difficulty,
                        rating: c.rating,
                        students: c.students,
                        duration: c.duration,
                        icon: c.icon,
                        color: c.color,
                        xpReward: c.xpReward,
                        tags: c.tags,
                      }}
                    />
                    <p className="text-[11px] text-muted mt-1.5 px-1">Recommended: {c.reason}</p>
                  </div>
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

          {(nextChallenge || nextProject) && (
            <section className="card p-5">
              <h2 className="font-semibold mb-3">Put it into practice</h2>
              <div className="space-y-2">
                {nextChallenge ? (
                  <Link href={`/challenges/${nextChallenge.slug}`} className="block">
                    <div className="rounded-lg border border-border p-3 card-hover">
                      <p className="text-xs text-muted flex items-center gap-1">
                        <Swords className="h-3.5 w-3.5" /> Next challenge
                      </p>
                      <p className="text-sm font-medium mt-1">{nextChallenge.title}</p>
                      <Badge tone="amber">{nextChallenge.difficulty}</Badge>
                    </div>
                  </Link>
                ) : null}
                {nextProject ? (
                  <Link href={`/projects/${nextProject.slug}`} className="block">
                    <div className="rounded-lg border border-border p-3 card-hover">
                      <p className="text-xs text-muted flex items-center gap-1">
                        <FolderKanban className="h-3.5 w-3.5" /> Next project
                      </p>
                      <p className="text-sm font-medium mt-1">{nextProject.title}</p>
                      {nextProject.difficulty ? <Badge tone="neutral">{nextProject.difficulty}</Badge> : null}
                    </div>
                  </Link>
                ) : null}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function SkillStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
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