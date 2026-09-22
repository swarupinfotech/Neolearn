"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { submitOnboarding } from "@/actions/onboarding";
import { cn } from "@/lib/cn";
import { toast } from "sonner";

const TOPICS = [
  "Python",
  "JavaScript",
  "Java",
  "C",
  "C++",
  "PHP",
  "TypeScript",
  "HTML/CSS",
  "SQL",
  "Cybersecurity",
];
const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const GOALS = ["Career", "College", "Interview", "Projects", "Hobby", "Cybersecurity"] as const;

export function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [topics, setTopics] = useState<string[]>([]);
  const [level, setLevel] = useState<(typeof LEVELS)[number] | null>(null);
  const [goal, setGoal] = useState<(typeof GOALS)[number] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleTopic(t: string) {
    setTopics((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    setError(null);
  }

  function next() {
    if (step === 1 && topics.length === 0) return setError("Select at least one topic.");
    if (step === 2 && !level) return setError("Select your experience level.");
    if (step === 3 && !goal) return setError("Select your primary goal.");
    setError(null);
    setStep((s) => s + 1);
  }

  function finish() {
    if (!level || !goal) return;
    startTransition(() => {
      submitOnboarding({ topics, experienceLevel: level, goal }).then((res) => {
        if (res.ok) {
          toast.success("Your learning dashboard is ready!");
          router.replace("/dashboard");
        } else {
          setError(res.error ?? "Failed to save. Try again.");
        }
      });
    });
  }

  const progress = Math.round((step / 4) * 100);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between text-xs text-muted mb-2">
          <span>Step {step} of 4</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 bg-surface2 rounded-full overflow-hidden" role="progressbar" aria-valuenow={progress}>
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 1 && (
        <section aria-labelledby="ob-topics">
          <h1 id="ob-topics" className="text-2xl font-bold mb-1">What do you want to learn?</h1>
          <p className="text-sm text-muted mb-5">Pick everything that interests you — you can change this later.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTopic(t)}
                aria-pressed={topics.includes(t)}
                className={cn(
                  "card p-4 text-left font-medium text-sm transition-colors",
                  topics.includes(t) ? "border-primary ring-2 ring-primary/40" : "hover:border-primary/50"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="ob-level">
          <h1 id="ob-level" className="text-2xl font-bold mb-1">How experienced are you?</h1>
          <p className="text-sm text-muted mb-5">This sets your starting difficulty.</p>
          <div className="grid gap-3">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => { setLevel(l); setError(null); }}
                aria-pressed={level === l}
                className={cn(
                  "card p-4 text-left font-medium transition-colors",
                  level === l ? "border-primary ring-2 ring-primary/40" : "hover:border-primary/50"
                )}
              >
                {l}
                <span className="block text-xs text-muted font-normal mt-1">
                  {l === "Beginner" && "New to programming — start with fundamentals."}
                  {l === "Intermediate" && "You know the basics — ready for deeper topics."}
                  {l === "Advanced" && "Confident developer — jump into challenges."}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section aria-labelledby="ob-goal">
          <h1 id="ob-goal" className="text-2xl font-bold mb-1">Why are you learning?</h1>
          <p className="text-sm text-muted mb-5">We&apos;ll shape your learning path around your goal.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {GOALS.map((g) => (
              <button
                key={g}
                onClick={() => { setGoal(g); setError(null); }}
                aria-pressed={goal === g}
                className={cn(
                  "card p-4 text-left font-medium text-sm transition-colors",
                  goal === g ? "border-primary ring-2 ring-primary/40" : "hover:border-primary/50"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 4 && (
        <section aria-labelledby="ob-summary">
          <h1 id="ob-summary" className="text-2xl font-bold mb-1">Your learning dashboard is ready</h1>
          <p className="text-sm text-muted mb-5">Here&apos;s what we&apos;ll set up for you:</p>
          <div className="card p-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted">Topics</span>
              <span className="font-medium text-right">{topics.join(", ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Experience</span>
              <span className="font-medium">{level}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Goal</span>
              <span className="font-medium">{goal}</span>
            </div>
          </div>
        </section>
      )}

      {error ? <p className="mt-4 text-sm text-rose-600" role="alert">{error}</p> : null}

      <div className="mt-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
          Back
        </Button>
        {step < 4 ? (
          <Button onClick={next}>Continue</Button>
        ) : (
          <Button onClick={finish} disabled={isPending}>
            {isPending ? "Setting up…" : "Open my dashboard"}
          </Button>
        )}
      </div>
    </div>
  );
}