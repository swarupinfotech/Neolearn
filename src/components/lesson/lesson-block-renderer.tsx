"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/editor/code-editor";
import { runClientCode } from "@/lib/client-exec";
import { InlineQuiz, type InlineQuestion } from "@/components/quiz/inline-question";
import { ChallengeBlock } from "@/components/lesson/challenge-block";
import { Play, CheckCircle2 } from "lucide-react";

export type Block =
  | { kind: "text"; title?: string; body: string }
  | { kind: "example"; title?: string; code: string; language: string }
  | { kind: "code"; title?: string; code: string; language: string; instructions?: string }
  | { kind: "quiz"; question: InlineQuestion }
  | { kind: "challenge_block"; title?: string; description?: string; starterCode: string; language: string; challengeSlug?: string; functionName?: string; publicTests?: { name: string; input?: unknown; expected: unknown }[] }
  | { kind: "complete"; title?: string; message?: string }
  | { kind: "tips"; items: string[] };

interface Props {
  lessonId: string;
  blocks: Record<string, unknown>[];
}

export function LessonBlockRenderer({ lessonId, blocks }: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const completionReportedRef = useRef(false);

  const markCompleteApi = useCallback(async () => {
    if (completionReportedRef.current) return;
    completionReportedRef.current = true;
    try {
      const res = await fetch("/api/lessons/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lessonId: lessonId, progressPct: 100, completed: true }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.xp > 0) toast.success(`Lesson complete! +${data.xp} XP`);
      } else {
        completionReportedRef.current = false;
        toast.error(data.error ?? "Could not save progress");
      }
    } catch {
      completionReportedRef.current = false;
    }
  }, [lessonId]);

  // Auto-complete once every quiz block is answered correctly.
  useEffect(() => {
    const quizIndexes = blocks
      .map((b, i) => (b.kind === "quiz" ? i : -1))
      .filter((i) => i >= 0);
    if (quizIndexes.length > 0 && quizIndexes.every((i) => checked[i])) {
      void markCompleteApi();
    }
  }, [checked, blocks, markCompleteApi]);

  return (
    <>
      {blocks.map((block, index) => {
        const b = block as Block;
        switch (b.kind) {
          case "text":
            return (
              <section key={index} className="card p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge tone="blue">Concept</Badge>
                  {b.title ? <h2 className="font-semibold">{b.title}</h2> : null}
                </div>
                <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-fg/90">
                  {b.body}
                </div>
              </section>
            );

          case "tips":
            return (
              <section key={index} className="card p-5 sm:p-6 border-amber-200 dark:border-amber-900">
                <div className="flex items-center gap-2 mb-3">
                  <Badge tone="amber">Tips</Badge>
                </div>
                <ul className="space-y-2 text-sm">
                  {b.items.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-amber-500">•</span>
                      <span className="text-fg/90">{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );

          case "example":
            return (
              <section key={index} className="card p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge tone="violet">Example</Badge>
                  {b.title ? <h2 className="font-semibold">{b.title}</h2> : null}
                </div>
                <CodeEditor language={b.language} value={b.code} readOnly onChange={() => {}} height="200px" />
              </section>
            );

          case "code":
            return (
              <TryItBlock key={index} block={b} />
            );

          case "quiz": {
            const isDone = Boolean(checked[index]);
            return (
              <section key={index} className="card p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge tone="amber">Knowledge check</Badge>
                  <h2 className="font-semibold">Question</h2>
                  {isDone ? <CheckCircle2 className="h-4 w-4 text-primary" aria-label="Answered" /> : null}
                </div>
                <InlineQuiz
                  question={b.question}
                  disabled={isDone}
                  onResult={(correct) => {
                    if (correct) setChecked((prev) => ({ ...prev, [index]: true }));
                  }}
                />
              </section>
            );
          }

          case "challenge_block":
            return <ChallengeBlock key={index} block={b} onSolved={() => void markCompleteApi()} />;

          case "complete":
            return (
              <section key={index} className="card-2 p-5 sm:p-6 text-center border border-primary/40 bg-primary-soft">
                <CheckCircle2 className="h-8 w-8 text-primary mx-auto mb-2" />
                <h2 className="font-semibold text-lg">{b.title ?? "You did it!"}</h2>
                {b.message ? <p className="text-sm text-muted mt-1">{b.message}</p> : null}
              </section>
            );

          default:
            return null;
        }
      })}
    </>
  );
}

function TryItBlock({ block }: { block: Extract<Block, { kind: "code" }> }) {
  const [code, setCode] = useState(block.code);
  const [result, setResult] = useState<{ ok: boolean; output: string; error: string | null } | null>(null);
  const [running, setRunning] = useState(false);

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Badge tone="green">Try it</Badge>
        <h2 className="font-semibold">{block.title ?? "Run the code"}</h2>
      </div>
      {block.instructions ? <p className="text-sm text-muted mb-3">{block.instructions}</p> : null}
      <CodeEditor language={block.language} value={code} onChange={setCode} height="240px" />
      <div className="flex items-center gap-2 mt-3">
        <Button
          size="sm"
          onClick={async () => {
            setRunning(true);
            setResult(null);
            const r = await runClientCode(block.language, code, 4000);
            setResult(r);
            setRunning(false);
          }}
          disabled={running}
        >
          <Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setCode(block.code);
            setResult(null);
          }}
        >
          Reset
        </Button>
      </div>
      {result ? (
        <div className="mt-3 rounded-lg bg-[#0d1117] border border-border overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60 text-xs text-muted">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Output
          </div>
          <pre className="p-3 text-xs font-mono text-green-200 whitespace-pre-wrap code-scroll max-h-64 overflow-y-auto">
            {result.ok ? result.output || "(no output)" : result.error}
          </pre>
        </div>
      ) : null}
    </section>
  );
}