"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export type InlineQuestion =
  | { id: string; type: "mcq"; prompt: string; code?: string; options: string[]; correct: string; explanation?: string }
  | { id: string; type: "true_false"; prompt: string; correct: "true" | "false"; explanation?: string }
  | { id: string; type: "fill"; prompt: string; accept: string[]; explanation?: string }
  | { id: string; type: "output"; prompt: string; code: string; accept: string[]; explanation?: string }
  | { id: string; type: "match"; prompt: string; pairs: { left: string; right: string }[]; explanation?: string };

interface Props {
  question: InlineQuestion;
  disabled?: boolean;
  onResult: (correct: boolean, explanation?: string) => void;
}

export function InlineQuiz({ question, disabled, onResult }: Props) {
  const [answer, setAnswer] = useState<string | Record<string, string> | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  const showFeedback = submitted && answer !== null;

  function submit() {
    if (answer === null) return;
    const ok = judge(question, answer);
    setCorrect(ok);
    setSubmitted(true);
    onResult(ok, question.explanation);
  }

  function judge(q: InlineQuestion, a: unknown): boolean {
    if (q.type === "mcq" || q.type === "true_false") return String(a) === q.correct;
    if (q.type === "fill" || q.type === "output") {
      const norm = String(a).trim().toLowerCase().replace(/\s+/g, " ");
      return q.accept.some((x) => {
        const n = norm;
        const c = x.trim().toLowerCase().replace(/\s+/g, " ");
        if (n === c) return true;
        const an = Number(n);
        const cn = Number(c);
        return Number.isFinite(an) && Number.isFinite(cn) && Math.abs(an - cn) < 1e-9;
      });
    }
    if (q.type === "match") {
      const pairs = a as Record<string, string>;
      return q.pairs.every((p) => {
        const selected = pairs[p.left];
        return selected && selected.trim().toLowerCase() === p.right.trim().toLowerCase();
      });
    }
    return false;
  }

  function reset() {
    setAnswer(null);
    setSubmitted(false);
    setCorrect(false);
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0">
          {showFeedback ? (
            correct ? (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            ) : (
              <XCircle className="h-5 w-5 text-rose-500" />
            )
          ) : (
            <Lightbulb className="h-5 w-5 text-amber-500" />
          )}
        </span>
        <div className="flex-1">
          <p className="font-medium">{question.prompt}</p>
          {"code" in question && question.code ? (
            <pre className="mt-2 rounded-lg bg-[#0d1117] text-green-300 p-3 text-xs overflow-x-auto code-scroll">
              {question.code}
            </pre>
          ) : null}

          <div className="mt-3 space-y-2">
            {question.type === "mcq" || question.type === "true_false" ? (
              <OptionsList
                options={
                  question.type === "true_false"
                    ? ["true", "false"]
                    : question.options
                }
                selected={answer as string | null}
                onSelect={(v) => setAnswer(v)}
                disabled={disabled || submitted}
                reveal={showFeedback ? correctAnswer(question) : null}
                correct={showFeedback ? correct : null}
              />
            ) : null}

            {question.type === "fill" ? (
              <input
                type="text"
                value={(answer as string) ?? ""}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={disabled || submitted}
                placeholder="Type your answer…"
                className="w-full sm:w-80 h-10 px-3 rounded-lg border border-border bg-surface text-sm"
                aria-label="Your answer"
              />
            ) : null}

            {question.type === "output" ? (
              <input
                type="text"
                value={(answer as string) ?? ""}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={disabled || submitted}
                placeholder="What is the output?"
                className="w-full sm:w-80 h-10 px-3 rounded-lg border border-border bg-surface text-sm"
                aria-label="Expected output"
              />
            ) : null}

            {question.type === "match" ? (
              <MatchPairs
                pairs={question.pairs}
                value={(answer as Record<string, string>) ?? null}
                onChange={(v) => setAnswer(v)}
                disabled={disabled || submitted}
                reveal={showFeedback ? correct : null}
              />
            ) : null}
          </div>

          {!showFeedback ? (
            <Button size="sm" className="mt-4" onClick={submit} disabled={answer === null || disabled}>
              Check answer
            </Button>
          ) : null}

          {showFeedback ? (
            <div className={cn("mt-4 rounded-lg border p-3 text-sm", correct ? "border-primary/40 bg-primary-soft" : "border-rose-300 bg-rose-50 dark:bg-rose-950/40")}>
              <p className={cn("font-semibold", correct ? "text-primary-strong dark:text-primary" : "text-rose-600")}>
                {correct ? "Correct!" : "Incorrect"}
              </p>
              {question.explanation ? (
                <p className="mt-1 text-muted">{question.explanation}</p>
              ) : null}
              <button
                onClick={reset}
                className="mt-2 text-xs font-medium text-primary hover:underline"
                disabled={disabled}
              >
                Try again
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function correctAnswer(q: InlineQuestion): string {
  if (q.type === "mcq") return q.correct;
  if (q.type === "true_false") return q.correct;
  return "";
}

function OptionsList({
  options,
  selected,
  onSelect,
  disabled,
  reveal,
  correct,
}: {
  options: string[];
  selected: string | null;
  onSelect: (v: string) => void;
  disabled?: boolean;
  reveal: string | null;
  correct: boolean | null;
}) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label="Answer options">
      {options.map((opt, i) => {
        const isSelected = selected === String(i) || selected === opt;
        const isCorrectOption = reveal !== null && opt === reveal;
        return (
          <button
            key={i}
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(String(i))}
            disabled={disabled}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-left text-sm transition-colors",
              isSelected && !reveal && "border-primary ring-2 ring-primary/40 bg-primary-soft",
              reveal !== null && isCorrectOption && "border-primary bg-primary-soft",
              reveal !== null && isSelected && !isCorrectOption && "border-rose-300 bg-rose-50 dark:bg-rose-950/40",
              !isSelected && "hover:border-primary/50"
            )}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-bold">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1">{opt}</span>
            {correct === true && isSelected ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
            {correct === false && isSelected ? <XCircle className="h-4 w-4 text-rose-500" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function MatchPairs({
  pairs,
  value,
  onChange,
  disabled,
  reveal,
}: {
  pairs: { left: string; right: string }[];
  value: Record<string, string> | null;
  onChange: (v: Record<string, string>) => void;
  disabled?: boolean;
  reveal: boolean | null;
}) {
  return (
    <div>
      {pairs.map((p) => (
        <div key={p.left} className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="w-40 font-medium text-sm">{p.left}</span>
          <select
            value={value?.[p.left] ?? ""}
            onChange={(e) => onChange({ ...(value ?? {}), [p.left]: e.target.value })}
            disabled={disabled || reveal !== null}
            className={cn(
              "h-9 px-2 rounded-lg border border-border bg-surface text-sm",
              reveal === true && "border-primary",
              reveal === false && "border-rose-300"
            )}
            aria-label={`Match ${p.left}`}
          >
            <option value="">— choose —</option>
            {pairs.map((pp) => (
              <option key={pp.right} value={pp.right}>
                {pp.right}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}