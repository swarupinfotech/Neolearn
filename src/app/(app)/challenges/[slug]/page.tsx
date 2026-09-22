import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { getChallengeBySlug } from "@/services/challenges";
import { Badge } from "@/components/ui/badge";
import { ChallengeRunner } from "@/components/challenge/challenge-runner";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await prisma.challenge.findUnique({ where: { slug }, select: { title: true, description: true } });
  if (!c) return { title: "Challenge not found" };
  return { title: `${c.title} | NeoLearn`, description: c.description };
}

export default async function ChallengeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const challenge = await getChallengeBySlug(slug);
  if (!challenge || challenge.status !== "PUBLISHED") notFound();

  const publicTests = (challenge.publicTests as unknown as { name: string; input?: unknown; expected: unknown }[]) ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="card p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge>{challenge.difficulty}</Badge>
          <Badge tone="blue">{challenge.category}</Badge>
          <Badge tone="neutral">{challenge.language}</Badge>
          <Badge tone="green">+{challenge.xpReward} XP</Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold">{challenge.title}</h1>
        <p className="text-muted mt-2 whitespace-pre-wrap">{challenge.description}</p>
      </header>

      <section className="card p-5">
        <h2 className="font-semibold mb-3 flex items-center justify-between">
          <span>Public tests</span>
          <span className="text-xs text-muted font-normal">
            These show the shape of the problem. Hidden tests validate your final solution.
          </span>
        </h2>
        <div className="space-y-2">
          {publicTests.map((t, i) => (
            <div key={i} className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-lg border border-border bg-surface2 p-3 text-sm">
              <span className="font-mono text-primary">{t.name}</span>
              <span className="text-muted">→</span>
              <span className="font-mono text-xs">{renderTest(t, challenge.functionName)}</span>
            </div>
          ))}
          {publicTests.length === 0 ? <p className="text-sm text-muted">No public tests for this challenge.</p> : null}
        </div>
      </section>

      <ChallengeRunner
        language={challenge.language}
        functionName={challenge.functionName}
        starterCode={challenge.starterCode}
        publicTests={publicTests}
        challengeId={challenge.id}
        slug={challenge.slug}
        xpReward={challenge.xpReward}
        userId={user.id}
      />
    </div>
  );
}

function renderTest(t: { name: string; input?: unknown; expected: unknown }, fn: string): string {
  const args = ((t.input ?? []) as unknown[]).map((v) => (typeof v === "string" ? JSON.stringify(v) : JSON.stringify(v)));
  return `${fn}(${args.join(", ")}) → ${JSON.stringify(t.expected)}`;
}