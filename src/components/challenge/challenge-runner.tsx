"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/editor/code-editor";
import { runClientCode } from "@/lib/client-exec";
import { CheckCircle2, XCircle, Play, Send } from "lucide-react";
import { cn } from "@/lib/cn";

interface TestCase {
  name: string;
  input?: unknown;
  stdin?: string;
  expected: unknown;
}

interface SubmitResponse {
  ok: boolean;
  passed?: boolean;
  results?: { name: string; passed: boolean; error?: string | null }[];
  rewardedXp?: number;
  error?: string;
}

export function ChallengeRunner({
  gradingMode,
  language,
  languageLabel,
  functionName,
  starterCode,
  publicTests,
  hiddenInputs,
  challengeId,
  slug,
  xpReward,
}: {
  gradingMode: "function" | "stdout";
  language: string;
  languageLabel: string;
  functionName: string;
  starterCode: string;
  publicTests: TestCase[];
  /** stdin for each hidden test. Expected outputs are never sent here. */
  hiddenInputs: string[];
  challengeId: string;
  slug: string;
  xpReward: number;
  userId: string;
}) {
  const [code, setCode] = useState(starterCode || "# Write your solution\n");
  const [localResults, setLocalResults] = useState<{ name: string; passed: boolean; error?: string }[] | null>(null);
  const [submitted, setSubmitted] = useState<SubmitResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // One output box per hidden test input.
  const [outputs, setOutputs] = useState<string[]>(() => hiddenInputs.map(() => ""));
  const [noOutput, setNoOutput] = useState<boolean[]>(() => hiddenInputs.map(() => false));

  const isStdout = gradingMode === "stdout";

  function pyRepr(v: unknown): string {
    if (v === null) return "None";
    if (typeof v === "boolean") return v ? "True" : "False";
    if (typeof v === "string") return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(pyRepr).join(", ")}]`;
    if (typeof v === "object") {
      return `{${Object.entries(v as Record<string, unknown>)
        .map(([k, val]) => `${JSON.stringify(k)}: ${pyRepr(val)}`)
        .join(", ")}}`;
    }
    return String(v);
  }

  function buildSource(t: TestCase): string {
    const args = ((t.input ?? []) as unknown[])
      .map((v) => (language.toLowerCase() === "python" ? pyRepr(v) : JSON.stringify(v)))
      .join(", ");
    return language.toLowerCase() === "python"
      ? `${code}\n\nprint(${functionName}(${args}))`
      : `${code}\n\nconsole.log(JSON.stringify(${functionName}(${args})));`;
  }

  function deepEqual(a: unknown, b: unknown): boolean {
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
    }
    if (a && b && typeof a === "object" && typeof b === "object") {
      const ka = Object.keys(a as object);
      const kb = Object.keys(b as object);
      return ka.length === kb.length && ka.every((k) => deepEqual((a as never)[k], (b as never)[k]));
    }
    return a === b;
  }

  async function runPublic() {
    setRunning(true);
    setLocalResults(null);
    const out: { name: string; passed: boolean; error?: string }[] = [];
    for (const t of publicTests) {
      const r = await runClientCode(language, buildSource(t), 4000);
      let passed = false;
      if (r.ok && r.output) {
        try {
          passed = deepEqual(JSON.parse(r.output.trim()), t.expected);
        } catch {
          passed = r.output.trim() === String(t.expected);
        }
      }
      out.push({ name: t.name, passed, error: passed ? undefined : (r.error ?? r.output.slice(0, 200)) });
    }
    setLocalResults(out);
    setRunning(false);
    if (out.length > 0 && out.every((o) => o.passed)) {
      toast.success("All public tests passed! Submit to validate hidden tests.");
    }
  }

  async function submitForHidden(payload?: { outputs?: string[] }) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/challenges/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeId, code, language, ...payload }),
      });
      const data = (await res.json()) as SubmitResponse;
      if (data.ok) {
        setSubmitted(data);
        if (data.passed) {
          toast.success(
            data.rewardedXp ? `Challenge solved! +${data.rewardedXp} XP` : "Challenge solved! (XP already earned)"
          );
        } else {
          toast.error("Hidden tests failed. Review the failing tests.");
        }
      } else {
        toast.error(data.error ?? "Could not submit.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setSubmitting(false);
    }
  }

  const allPublicPassed = localResults !== null && localResults.length > 0 && localResults.every((r) => r.passed);
  // An empty output is legitimate, but only when the learner has said so
  // explicitly. Otherwise a forgotten textarea would silently grade as "".
  const outputsReady =
    outputs.length > 0 && outputs.every((o, i) => o.trim().length > 0 || noOutput[i] === true);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="font-semibold">Your solution</h2>
          <p className="text-xs text-muted mt-0.5">
            {isStdout ? (
              <>Write a complete {languageLabel} program that reads from standard input.</>
            ) : (
              <>
                Define a function <code className="font-mono text-primary">{functionName}</code>.
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {submitted?.passed ? <Badge tone="green">Solved</Badge> : null}
        </div>
      </div>

      <CodeEditor language={language} value={code} onChange={setCode} height="320px" ariaLabel="Challenge solution editor" />

      {isStdout ? (
        <StdoutGradingPanel
          hiddenInputs={hiddenInputs}
          outputs={outputs}
          noOutput={noOutput}
          onChange={(next) => setOutputs(next)}
          onToggleNoOutput={(i) => {
            setNoOutput((prev) => {
              const next = [...prev];
              next[i] = !next[i];
              return next;
            });
            // Ticking "prints nothing" clears any pasted text, and pasting
            // text again clears the tick, so the two can never disagree.
            setOutputs((prev) => {
              const next = [...prev];
              next[i] = noOutput[i] ? (next[i] ?? "") : "";
              return next;
            });
          }}
          submitting={submitting}
          onSubmit={() => void submitForHidden({ outputs })}
          ready={outputsReady}
        />
      ) : (
        <div className="flex flex-wrap gap-2 mt-4">
          <Button size="sm" variant="secondary" onClick={runPublic} disabled={running}>
            <Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run public tests"}
          </Button>
          <Button
            size="sm"
            onClick={() => void submitForHidden()}
            disabled={submitting || !allPublicPassed}
            title={allPublicPassed ? "" : "Pass public tests first"}
          >
            <Send className="h-3.5 w-3.5" /> {submitting ? "Grading…" : "Submit to hidden tests"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCode(starterCode || "# Write your solution\n")}>
            Reset
          </Button>
        </div>
      )}

      {!isStdout && !allPublicPassed && localResults ? (
        <p className="text-xs text-muted mt-2">Pass all public tests locally before submitting to the hidden test grader.</p>
      ) : null}

      {localResults ? (
        <div className="mt-5">
          <p className="text-sm font-medium mb-2">Public test results</p>
          <ul className="space-y-2">
            {localResults.map((r, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-2.5 text-sm",
                  r.passed ? "border-primary/40 bg-primary-soft" : "border-rose-300 bg-rose-50 dark:bg-rose-950/40"
                )}
              >
                {r.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="font-medium">{r.name}</span>
                  {!r.passed && r.error ? (
                    <pre className="text-xs text-muted mt-1 whitespace-pre-wrap overflow-x-auto">{r.error}</pre>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {submitted ? (
        <div className="mt-5">
          <p className="text-sm font-medium mb-2">Hidden test results (server-validated)</p>
          <ul className="space-y-2">
            {(submitted.results ?? []).map((r, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-2.5 text-sm",
                  r.passed ? "border-primary/40 bg-primary-soft" : "border-rose-300 bg-rose-50 dark:bg-rose-950/40"
                )}
              >
                {r.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <span className="font-medium">{r.name}</span>
                  {!r.passed && r.error ? (
                    <pre className="text-xs text-muted mt-1 whitespace-pre-wrap overflow-x-auto">{r.error}</pre>
                  ) : null}
                </div>
              </li>
            ))}
            {(submitted.results ?? []).length === 0 ? <li className="text-sm text-muted">No feedback returned.</li> : null}
          </ul>
        </div>
      ) : null}

      <p className="text-[11px] text-muted mt-4">
        Challenge <code className="font-mono">{slug}</code> · {xpReward} XP
      </p>
    </section>
  );
}

/**
 * Output-based grading UI.
 *
 * Shows one block per hidden test with its input, and collects the
 * output the learner observed locally. The expected output is compared
 * server-side and never sent to the browser.
 */
function StdoutGradingPanel({
  hiddenInputs,
  outputs,
  noOutput,
  onChange,
  onToggleNoOutput,
  submitting,
  onSubmit,
  ready,
}: {
  hiddenInputs: string[];
  outputs: string[];
  noOutput: boolean[];
  onChange: (next: string[]) => void;
  onToggleNoOutput: (index: number) => void;
  submitting: boolean;
  onSubmit: () => void;
  ready: boolean;
}) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-muted">
        Run your program once per input below, then paste what it prints. If your program prints nothing for a
        test, tick that box instead of leaving the textarea empty.
      </p>
      {hiddenInputs.map((input, i) => {
        const id = `stdout-${i}`;
        const printsNothing = noOutput[i] === true;
        return (
          <div key={i} className="rounded-lg border border-border bg-surface2 p-3">
            <p className="text-xs font-medium text-muted mb-1">Test {i + 1} — input</p>
            <pre className="text-xs font-mono whitespace-pre-wrap mb-2 max-h-24 overflow-y-auto">
              {input || "(no input)"}
            </pre>
            <label className="text-xs font-medium text-muted block mb-1" htmlFor={id}>
              Your output
            </label>
            <textarea
              id={id}
              value={outputs[i] ?? ""}
              disabled={printsNothing}
              onChange={(e) => {
                const next = [...outputs];
                next[i] = e.target.value;
                onChange(next);
                if (e.target.value.length > 0 && noOutput[i]) onToggleNoOutput(i);
              }}
              rows={2}
              spellCheck={false}
              placeholder={printsNothing ? "This program prints nothing for this input." : "Paste the exact output here…"}
              className="w-full rounded-lg border border-border bg-surface p-2 text-xs font-mono disabled:opacity-60"
            />
            <label className="mt-2 flex items-center gap-1.5 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={printsNothing}
                onChange={() => onToggleNoOutput(i)}
                className="rounded border-border"
              />
              My program prints nothing for this input
            </label>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onSubmit} disabled={submitting || !ready}>
          <Send className="h-3.5 w-3.5" /> {submitting ? "Grading…" : "Submit output for grading"}
        </Button>
        {!ready ? (
          <span className="text-xs text-muted self-center">
            Give an output for every test, or tick &ldquo;prints nothing&rdquo;.
          </span>
        ) : null}
      </div>
    </div>
  );
}
