import type { Metadata } from "next";
import Link from "next/link";
import {
  Code2,
  Play,
  Flame,
  Trophy,
  Rocket,
  Users,
  Target,
  Zap,
  CheckCircle2,
  Star,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { CourseCard } from "@/components/course/course-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "NeoLearn — Learn. Code. Practice. Build.",
  description:
    "Interactive coding lessons, quizzes, challenges and real projects. Earn XP, keep your streak and earn verifiable certificates.",
};

const why = [
  {
    icon: Play,
    title: "Interactive lessons",
    body: "Micro-blocks: concept → example → run code → quiz → challenge. No passive video-watching.",
  },
  {
    icon: Zap,
    title: "Real code execution",
    body: "Run Python, JavaScript, SQL and HTML in an isolated sandbox and get instant output.",
  },
  {
    icon: Flame,
    title: "XP, levels & streaks",
    body: "Every action earns XP. Level up, keep your daily streak and climb the leaderboard.",
  },
  {
    icon: Trophy,
    title: "Achievements & certificates",
    body: "Unlock achievements and earn verifiable, forgery-resistant certificates on completion.",
  },
  {
    icon: Target,
    title: "Daily missions",
    body: "A fresh mission every day: 1 lesson, 1 quiz, 1 challenge for bonus XP.",
  },
  {
    icon: Users,
    title: "Community powered",
    body: "Ask questions, answer others, bookmark and earn recognition for helping learners.",
  },
];

const pathSteps = [
  { step: "01", title: "Learn the fundamentals", body: "Bite-sized lessons with interactive code." },
  { step: "02", title: "Practice relentlessly", body: "Quizzes, challenges and a daily mission." },
  { step: "03", title: "Build real projects", body: "Calculator, weather dashboard, portfolio and more." },
  { step: "04", title: "Earn your certificate", body: "Complete a path and get a verifiable credential." },
];

const faqs = [
  { q: "Is NeoLearn free?", a: "Yes — the core learning experience (courses, lessons, quizzes, challenges) is free. Premium unlocks advanced content and certificates." },
  { q: "How does XP work?", a: "Lessons, quizzes, challenges, projects and daily missions all award XP. XP drives your level and leaderboard rank — awarded by the server only." },
  { q: "Do I need to install anything?", a: "No. The code playground runs in an isolated browser sandbox — Python (WASM), JavaScript (worker) and SQL all work in the browser." },
  { q: "Are certificates verifiable?", a: "Yes. Every certificate has a unique ID and a public verification URL that anyone can check." },
];

export default async function LandingPage() {
  const courses = await prisma.course.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { students: "desc" },
    take: 6,
  });
  const challengeCount = await prisma.challenge.count({ where: { status: "PUBLISHED" } });
  const lessonCount = await prisma.lesson.count();
  const userCount = await prisma.user.count();

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(34,197,94,0.12),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 relative">
          <div className="max-w-3xl">
            <Badge tone="green" className="mb-5">
              <Sparkle /> NeoLearn — Learn. Code. Practice. Build.
            </Badge>
            <h1 className="text-4xl sm:text-6xl font-extrabold leading-[1.05] tracking-tight">
              Learn to Code.
              <br />
              <span className="text-primary">Build Real Skills.</span>
            </h1>
            <p className="mt-5 text-lg text-muted max-w-2xl">
              Interactive lessons, real code execution, daily challenges and projects — with XP,
              levels, streaks and certificates that actually verify.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup">
                <Button size="lg">
                  Start Learning <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/courses">
                <Button size="lg" variant="secondary">
                  Explore Courses
                </Button>
              </Link>
            </div>
            <dl className="mt-10 grid grid-cols-3 max-w-lg gap-4">
              <div>
                <dt className="text-xs text-muted">Courses</dt>
                <dd className="text-2xl font-bold">{courses.length || 6}+</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Lessons</dt>
                <dd className="text-2xl font-bold">{lessonCount}+</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Challenges</dt>
                <dd className="text-2xl font-bold">{challengeCount}+</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* POPULAR COURSES */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SectionHeading title="Popular Courses" subtitle="Start with the most-loved learning tracks" href="/courses" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((c) => (
            <CourseCard
              key={c.id}
              course={{
                id: c.id,
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
              }}
            />
          ))}
        </div>
      </section>

      {/* WHY NEOLEARN */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <SectionHeading title="Why NeoLearn" subtitle="Everything you need to go from zero to shipping" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {why.map((w) => (
              <Card key={w.title} className="card-hover">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary mb-3">
                  <w.icon className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{w.title}</h3>
                <p className="text-sm text-muted mt-1.5">{w.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* LEARNING PATH */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SectionHeading title="Learning Path" subtitle="A structured route from beginner to job-ready" href="/paths" />
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pathSteps.map((s) => (
            <li key={s.step} className="card p-5">
              <span className="text-xs font-bold text-primary">{s.step}</span>
              <h3 className="font-semibold mt-2">{s.title}</h3>
              <p className="text-sm text-muted mt-1">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CODING CHALLENGES */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <SectionHeading
            title="Coding Challenges"
            subtitle="Public tests for practice, hidden tests for real validation"
            href="/challenges"
          />
          <div className="grid sm:grid-cols-3 gap-5">
            <Card>
              <Badge tone="green">Easy</Badge>
              <h3 className="font-semibold mt-3">Warm-up drills</h3>
              <p className="text-sm text-muted mt-1">Loops, strings, arrays — build muscle memory with instant feedback.</p>
            </Card>
            <Card>
              <Badge tone="amber">Medium</Badge>
              <h3 className="font-semibold mt-3">Algorithm thinking</h3>
              <p className="text-sm text-muted mt-1">Functions, data structures and debugging exercises.</p>
            </Card>
            <Card>
              <Badge tone="rose">Hard</Badge>
              <h3 className="font-semibold mt-3">Security & SQL</h3>
              <p className="text-sm text-muted mt-1">Secure coding, SQL mastery and real-world problem solving.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* COMMUNITY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="card p-8 sm:p-10 flex flex-col sm:flex-row items-center gap-6 justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Community
            </h2>
            <p className="text-muted mt-2 max-w-xl">
              {userCount}+ learners asking questions, sharing solutions and climbing the leaderboard
              together. Ask, answer, like and bookmark.
            </p>
          </div>
          <Link href="/community">
            <Button>Join the community</Button>
          </Link>
        </div>
      </section>

      {/* PROJECTS */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <SectionHeading title="Projects" subtitle="Build real things — with tests and XP rewards" href="/projects" />
          <div className="flex flex-wrap gap-3">
            {["Python Calculator", "Password Generator", "Quiz App", "URL Scanner", "Log Analyzer", "Todo App", "Weather Dashboard", "Portfolio Website", "SQL Analytics"].map((p) => (
              <span key={p} className="px-4 py-2 rounded-lg border border-border bg-bg text-sm font-medium">
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ACHIEVEMENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SectionHeading title="Achievements" subtitle="Collect them all" href="/achievements" />
        <div className="flex flex-wrap gap-4">
          {[
            { icon: "🎯", label: "First Lesson" },
            { icon: "🧠", label: "First Quiz" },
            { icon: "⚔️", label: "First Challenge" },
            { icon: "🔥", label: "7 Day Streak" },
            { icon: "🏆", label: "1000 XP" },
            { icon: "🐍", label: "Python Expert" },
          ].map((a) => (
            <div key={a.label} className="card px-4 py-3 flex items-center gap-2 text-sm font-medium">
              <span aria-hidden>{a.icon}</span> {a.label}
            </div>
          ))}
        </div>
      </section>

      {/* PRICING TEASER */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold">Simple pricing</h2>
          <p className="text-muted mt-2">Free forever for core learning. Premium when you&apos;re ready to go deeper.</p>
          <div className="mt-6">
            <Link href="/pricing">
              <Button size="lg" variant="outline">See plans</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <SectionHeading title="FAQ" />
        <div className="space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="card p-4 group">
              <summary className="font-medium cursor-pointer list-none flex items-center justify-between">
                {f.q}
                <ArrowRight className="h-4 w-4 rotate-90 transition-transform group-open:-rotate-90" />
              </summary>
              <p className="text-sm text-muted mt-3">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

function SectionHeading({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle?: string;
  href?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold">{title}</h2>
        {subtitle ? <p className="text-muted mt-1 text-sm sm:text-base">{subtitle}</p> : null}
      </div>
      {href ? (
        <Link href={href} className="text-sm font-medium text-primary hover:underline whitespace-nowrap">
          View all →
        </Link>
      ) : null}
    </div>
  );
}

function Sparkle() {
  return <Star className="h-3 w-3" />;
}

void CheckCircle2;
void Rocket;
void Code2;