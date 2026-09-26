import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/services/auth";
import { getChallengeBySlug, gradingModeFor } from "@/services/challenges";
import { Badge } from "@/components/ui/badge";
import { ChallengeRunner } from "@/components/challenge/challenge-runner";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = await prisma.challenge.findUnique({
    where: { slug },
    select: { title: true, description: true, category: true, difficulty: true },
  });
  if (!c) return { title: "Challenge not found" };
  const description = c.description.slice(0, 155);
  return {
    title: `${c.title} | NeoLearn`,
    description,
    openGraph: { title: `${c.title} — coding challenge`, description, type: "article" },
    twitter: { card: "summary", title: `${c.title} — coding challenge`, description },
  };
}

const LANGUAGE_LABEL: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  sql: "SQL",
  html: "HTML/CSS",
  c: "C",
  cpp: "C++",
  java: "Java",
  php: "PHP",
  go: "Go",
};

export default async function ChallengeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const challenge = await getChallengeBySlug(slug);
  if (!challenge || challenge.status !== "PUBLISHED") notFound();

  const mode = gradingModeFor(challenge);
  const language = challenge.language.toLowerCase();
  const label = LANGUAGE_LABEL[language] ?? challenge.language;

  const publicTests = (challenge.publicTests as unknown as {
    name: string;
    input?: unknown;
    stdin?: string;
    expected: unknown;
  }[]) ?? [];

  // Only the *inputs* of the hidden tests are shown. The expected outputs
  // stay on the server and are never serialized to the client.
  const hiddenInputs = (
    (challenge.hiddenTests as unknown as { name: string; stdin?: string }[]) ?? []
  ).map((t) => t.stdin ?? "");

  const attempts = await prisma.challengeAttempt.findMany({
    where: { userId: user.id, challengeId: challenge.id },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="card p-6">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge>{challenge.difficulty}</Badge>
          <Badge tone="blue">{challenge.category}</Badge>
          <Badge tone="neutral">{label}</Badge>
          <Badge tone="green">+{challenge.xpReward} XP</Badge>
          {mode === "stdout" ? <Badge tone="amber">Output-based grading</Badge> : null}
        </div>
        <h1 className="text-2xl sm:3xl sm:text-3xl font-bold">{challenge.title}</h1>
        <p className="text-muted mt-2 whitespace-pre-wrap">{challenge.description}</p>
        {attempts[0]?.passed ? (
          <p className="mt-3 text-sm text-primary font-medium">You have already solved this challenge.</p>
        ) : null}
      </header>

      {mode === "stdout" ? (
        <section className="card p-5 border-amber-300 dark:border-amber-800">
          <h2 className="font-semibold">How this challenge is graded</h2>
          <p className="text-sm text-muted mt-2">
            {label} does not run inside NeoLearn&apos;s in-browser sandbox, so this challenge is graded
            from your program&apos;s output. Compile and run your solution locally, then paste what it
            prints for each test input below. The server compares your output against the expected
            output — the expected values are never shown here.
          </p>
          {challenge.inputFormat ? (
            <p className="text-sm mt-3">
              <span className="font-medium">Input format: </span>
              <span className="text-muted">{challenge.inputFormat}</span>
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="card p-5">
        <h2 className="font-semibold mb-3 flex flex-wrap items-center justify-between gap-2">
          <span>Public tests</span>
          <span className="text-xs text-muted font-normal">
            {mode === "stdout"
              ? "Worked examples showing the exact input and output format."
              : "These show the shape of the problem. Hidden tests validate your final solution."}
          </span>
        </h2>
        <div className="space-y-2">
          {publicTests.map((t, i) => (
            <div key={i} className="rounded-lg border border-border bg-surface2 p-3 text-sm">
              <span className="font-mono text-primary">{t.name}</span>
              {mode === "stdout" ? (
                <pre className="text-xs mt-2 whitespace-pre-wrap">
                  <span className="text-muted">Input:</span>{"\n"}
                  {t.stdin || "(no input)"}
                  {"\n"}
                  <span className="text-muted">Expected output:</span>{"\n"}
                  {String(t.expected)}
                </pre>
              ) : (
                <p className="font-mono text-xs mt-1">
                  {renderTest(t, challenge.functionName)}
                </p>
              )}
            </div>
          ))}
          {publicTests.length === 0 ? <p className="text-sm text-muted">No public tests for this challenge.</p> : null}
        </div>
      </section>

      <ChallengeRunner
        gradingMode={mode}
        language={challenge.language}
        languageLabel={label}
        functionName={challenge.functionName}
        starterCode={challenge.starterCode}
        publicTests={publicTests}
        hiddenInputs={hiddenInputs}
        challengeId={challenge.id}
        slug={challenge.slug}
        xpReward={challenge.xpReward}
        userId={user.id}
      />
    </div>
  );
}

function renderTest(t: { name: string; input?: unknown; expected: unknown }, fn: string): string {
  const args = ((t.input ?? []) as unknown[]).map((v) => JSON.stringify(v));
  return `${fn}(${args.join(", ")}) → ${JSON.stringify(t.expected)}`;
}
