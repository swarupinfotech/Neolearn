import type { Metadata } from "next";
import { Users, Code2, Trophy, Target } from "lucide-react";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "About" };

const values = [
  {
    icon: Code2,
    title: "Learn by doing",
    body: "Every concept is paired with runnable code, a quiz or a challenge. Passive reading isn't learning.",
  },
  {
    icon: Target,
    title: "Server-authoritative rewards",
    body: "XP, streaks, certificates and leaderboard positions are validated on the server — never trusted from the client.",
  },
  {
    icon: Users,
    title: "Community first",
    body: "Questions, answers and moderation tools built so learners help learners.",
  },
  {
    icon: Trophy,
    title: "Progress you can prove",
    body: "Verifiable certificates with public verification URLs and forgery-resistant IDs.",
  },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <header>
        <h1 className="text-4xl font-bold">About NeoLearn</h1>
        <p className="text-muted mt-4 text-lg">
          NeoLearn is an original, open coding-learning platform: interactive micro-lessons, real
          sandboxes, gamified progress and verifiable outcomes — built from scratch with Next.js,
          TypeScript, Prisma and Tailwind CSS.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 gap-5 mt-10">
        {values.map((v) => (
          <Card key={v.title}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary mb-3">
              <v.icon className="h-5 w-5" />
            </span>
            <h2 className="font-semibold">{v.title}</h2>
            <p className="text-sm text-muted mt-1.5">{v.body}</p>
          </Card>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-3">Our promise</h2>
        <ul className="list-disc pl-5 space-y-2 text-muted text-sm">
          <li>No copied branding, logos, artwork or proprietary code — everything here is original.</li>
          <li>No fake buttons: every feature either works or clearly shows its unavailable state.</li>
          <li>User code never runs on the main web server — sandboxes are isolated WASM/worker environments.</li>
          <li>Privacy-respecting analytics: coarse events only, no sensitive payloads.</li>
        </ul>
      </section>
    </div>
  );
}