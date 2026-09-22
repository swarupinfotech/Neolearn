"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/editor/code-editor";
import { runClientCode } from "@/lib/client-exec";
import { Play, CheckCircle2, XCircle } from "lucide-react";

export interface ChallengeTest {
  name: string;
  input?: unknown;
  expected: unknown;
}

interface Props {
  block: {
    title?: string;
    description?: string;
    starterCode: string;
    language: string;
    challengeSlug?: string;
    functionName?: string;
    publicTests?: ChallengeTest[];
  };
  onSolved?: () => void;
}

export function ChallengeBlock({ block, onSolved }: Props) {
  const [code, setCode] = useState(block.starterCode);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<"idle" | "passed" | "failed">("idle");
  const [results, setResults] = useState<{ name: string; passed: boolean; output?: string }[]>([]);

  const fn = block.functionName ?? "solution";

  async function formatInput(language: string, input: unknown[]): Promise<string> {
    if (language === "python") {
      return input.map((v) => pyRepr(v)).join(", ");
    }
    return input.map((v) => JSON.stringify(v)).join(", ");
  }

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

  async function run() {
    const tests = block.publicTests ?? [];
    if (tests.length === 0) {
      toast.error("No public tests available for this exercise in this lesson.");
      return;
    }
    setRunning(true);
    setPhase("idle");
    const out: { name: string; passed: boolean; output?: string }[] = [];

    for (const t of tests) {
      const args = (t.input ?? []) as unknown[];
      const src =
        block.language === "python"
          ? `${code}\n\nprint(${fn}(${await formatInput("python", args)}))`
          : `console.log(JSON.stringify(${fn}(${args.map((a) => JSON.stringify(a)).join(", ")})))`;
      const r = await runClientCode(block.language, src, 4000);
      const expectedStr = JSON.stringify(t.expected ?? null);
      const gotStr = (r.output || "").trim();
      const passed = r.ok && looseEqual(gotStr, expectedStr);
      out.push({
        name: t.name,
        passed,
        output: r.error ?? gotStr.slice(0, 300) ?? "(no output)",
      });
    }
    setResults(out);
    const allPassed = out.length > 0 && out.every((o) => o.passed);
    setPhase(allPassed ? "passed" : "failed");
    setRunning(false);

    if (allPassed) {
      toast.success("All public tests passed! Submit to unlock the hidden tests.");
      onSolved?.();
    } else {
      toast.error("Some tests failed. Review the output.");
    }
  }

  function looseEqual(got: string, expectedJson: string): boolean {
    try {
      const g = JSON.parse(got);
      return deepEqual(g, JSON.parse(expectedJson));
    } catch {
      return got === expectedJson.replace(/^"|"$/g, "");
    }
  }

  function deepEqual(a: unknown, b: unknown): boolean {
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.length === b.length && a.every((x, i) => deepEqual(x, b[i]));
    }
    if (a && b && typeof a === "object" && typeof b === "object") {
      const ka = Object.keys(a);
      const kb = Object.keys(b);
      return ka.length === kb.length && ka.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
    }
    return a === b;
  }

  return (
    <section className="card p-5 sm:p-6 border-primary/30">
      <div className="flex items-center gap-2 mb-3">
        <Badge tone="green">Coding challenge</Badge>
        <h2 className="font-semibold">{block.title ?? "Solve it"}</h2>
      </div>
      {block.description ? <p className="text-sm text-muted mb-3 whitespace-pre-wrap">{block.description}</p> : null}
      <pre className="mb-3 rounded-lg bg-surface2 border border-border p-3 text-xs font-mono whitespace-pre-wrap code-scroll">
        def {fn}(*args): … {"//"}  const {fn} = (...args) =&gt; …
      </pre>
      <CodeEditor
        language={block.language}
        value={code}
        onChange={setCode}
        height="200px"
        ariaLabel="Challenge solution editor"
      />
      <div className="flex flex-wrap gap-2 mt-3">
        <Button size="sm" onClick={run} disabled={running}>
          <Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run public tests"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setCode(block.starterCode)}>
          Reset
        </Button>
      </div>

      {results.length > 0 ? (
        <div className="mt-4 space-y-2">
          {results.map((r, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg border p-2.5 text-sm ${
                r.passed
                  ? "border-primary/40 bg-primary-soft"
                  : "border-rose-300 bg-rose-50 dark:bg-rose-950/40"
              }`}
            >
              {r.passed ? (
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-500 mt-0.5" />
              )}
              <div>
                <span className="font-medium">{r.name}</span>
                {!r.passed && r.output ? (
                  <pre className="text-xs text-muted mt-1 whitespace-pre-wrap overflow-x-auto">{r.output}</pre>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {phase === "passed" ? (
        <p className="mt-4 text-sm font-medium text-primary">
          All public tests passed — the full challenge (with hidden tests) lives at the Challenges page.
        </p>
      ) : null}
    </section>
  );
}