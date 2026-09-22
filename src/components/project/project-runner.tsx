"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/editor/code-editor";
import { runClientCode } from "@/lib/client-exec";
import { Play, Send, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

interface TestCase {
  name: string;
  input?: unknown;
  setup?: string;
  expected: unknown;
}

interface SubmitResponse {
  ok: boolean;
  passed?: boolean;
  results?: { name: string; passed: boolean; error?: string | null }[];
  rewardedXp?: number;
  error?: string;
}

export function ProjectRunner({
  language,
  starterCode,
  tests,
  projectId,
  xpReward,
}: {
  language: string;
  starterCode: string;
  tests: TestCase[];
  projectId: string;
  slug: string;
  xpReward: number;
}) {
  const [code, setCode] = useState(starterCode || "# Write your program\n### Implement main() that returns the required value\n");
  const [local, setLocal] = useState<{ name: string; passed: boolean; error?: string }[] | null>(null);
  const [submitted, setSubmitted] = useState<SubmitResponse | null>(null);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  function buildSource(t: TestCase): string {
    const args = ((t.input ?? []) as unknown[])
      .map((v) => (language.toLowerCase() === "python" ? pyRepr(v) : JSON.stringify(v)))
      .join(", ");
    return language.toLowerCase() === "python"
      ? `import types\n${code}\nprint(main(${args}))`
      : `${code}\nconsole.log(JSON.stringify(main(${args})));`;
  }

  async function runLocal() {
    setRunning(true);
    setLocal(null);
    const out: { name: string; passed: boolean; error?: string }[] = [];
    for (const t of tests) {
      const r = await runClientCode(language, buildSource(t), 6000);
      let passed = false;
      if (r.ok && r.output) {
        try {
          passed = deepEqual(JSON.parse(r.output.trim()), t.expected);
        } catch {
          passed = r.output.trim() === String(t.expected);
        }
      }
      out.push({ name: t.name, passed, error: passed ? undefined : (r.error ?? r.output.slice(0, 300)) });
    }
    setLocal(out);
    setRunning(false);
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ projectId, code, language }),
      });
      const data = (await res.json()) as SubmitResponse;
      if (data.ok) {
        setSubmitted(data);
        if (data.passed) {
          toast.success(data.rewardedXp ? `Project passed! +${data.rewardedXp} XP` : "Project passed! (XP already earned)");
        } else {
          toast.error("Server grading failed. Review the failing cases.");
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

  const allLocalPassed = local !== null && local.length > 0 && local.every((r) => r.passed);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="font-semibold">Build it</h2>
        {submitted?.passed ? <span className="text-sm font-semibold text-primary">Project complete ✓</span> : null}
      </div>

      <CodeEditor language={language} value={code} onChange={setCode} height="360px" ariaLabel="Project editor" />

      <div className="flex flex-wrap gap-2 mt-4">
        <Button size="sm" variant="secondary" onClick={runLocal} disabled={running}>
          <Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run locally"}
        </Button>
        <Button size="sm" onClick={submit} disabled={submitting || !allLocalPassed}>
          <Send className="h-3.5 w-3.5" /> {submitting ? "Grading…" : "Submit for grading"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setCode(starterCode)}>Reset</Button>
      </div>
      {!allLocalPassed && local ? (
        <p className="text-xs text-muted mt-2">Pass all local cases before submitting for server grading.</p>
      ) : null}

      {local ? (
        <div className="mt-5">
          <p className="text-sm font-medium mb-2">Local test results</p>
          <ul className="space-y-2">
            {local.map((r, i) => (
              <ResultRow key={i} name={r.name} passed={r.passed} error={r.error} />
            ))}
          </ul>
        </div>
      ) : null}

      {submitted ? (
        <div className="mt-5">
          <p className="text-sm font-medium mb-2">Server grading (authoritative)</p>
          <ul className="space-y-2">
            {(submitted.results ?? []).map((r, i) => (
              <ResultRow key={i} name={r.name} passed={r.passed} error={r.error ?? undefined} />
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function ResultRow({ name, passed, error }: { name: string; passed: boolean; error?: string }) {
  return (
    <li className={cn("flex items-start gap-2 rounded-lg border p-2.5 text-sm", passed ? "border-primary/40 bg-primary-soft" : "border-rose-300 bg-rose-50 dark:bg-rose-950/40")}>
      {passed ? <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" /> : <XCircle className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />}
      <div className="min-w-0">
        <span className="font-medium">{name}</span>
        {!passed && error ? <pre className="text-xs text-muted mt-1 whitespace-pre-wrap overflow-x-auto">{error}</pre> : null}
      </div>
    </li>
  );
}