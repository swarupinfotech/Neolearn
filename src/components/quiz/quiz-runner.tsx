"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";
import { CheckCircle2, XCircle } from "lucide-react";

export interface ClientQuestion {
  id: string;
  type: string;
  prompt: string;
  code?: string | null;
  options?: unknown;
  order: number;
  points: number;
}

interface RunnerQuiz {
  id: string;
  title: string;
  type: string;
  timerMinutes: number | null;
  passingScore: number;
  course?: { slug: string; title: string } | null;
}

interface SubmitFeedback {
  questionId: string;
  correct: boolean;
  explanation?: string | null;
}

interface SubmitResult {
  ok: boolean;
  score?: number;
  maxScore?: number;
  percent?: number;
  passed?: boolean;
  rewardedXp?: number;
  suspicious?: boolean;
  feedback?: SubmitFeedback[];
  error?: string;
}

type Answers = Record<string, string | string[]>;

/** Short label shown next to a question so the learner knows what to do. */
const QUESTION_KIND: Record<string, string> = {
  MULTI_SELECT: "Select all that apply",
  DEBUGGING: "Find the bug",
  SCENARIO: "Security scenario",
  OUTPUT: "What does it print?",
};

export function QuizRunner({ quiz, questions }: { quiz: RunnerQuiz; questions: ClientQuestion[] }) {
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState<SubmitResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const startTime = useMemo(() => new Date().toISOString(), []);

  function setAnswer(qid: string, value: string) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }
  function setMulti(qid: string, value: string[]) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }
  function setMatch(qid: string, picks: string[]) {
    setAnswers((prev) => ({ ...prev, [qid]: picks }));
  }

  const unanswered = questions.filter((q) => {
    const v = answers[q.id];
    return v === undefined || v === "" || (Array.isArray(v) && v.every((x) => !x));
  }).length;

  async function submit() {
    setIsPending(true);
    try {
      // MATCH is edited as one dropdown pick per left-hand item, so the UI
      // state is a bare list of rights. The grader compares [left, right]
      // pairs, so the pairs are reconstructed here from the question's
      // interleaved options.
      const payload: Record<string, unknown> = { ...answers };
      for (const q of questions) {
        if (q.type !== "MATCH") continue;
        const opts = stringList(q.options);
        const lefts = opts.filter((_, i) => i % 2 === 0);
        const picks = (answers[q.id] as string[] | undefined) ?? [];
        payload[q.id] = lefts.map((left, i) => [left, picks[i] ?? ""]);
      }

      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          answers: payload,
          startedAt: startTime,
        }),
      });
      const data = (await res.json()) as SubmitResult;
      if (data.ok) {
        setSubmitted(data);
        if (data.rewardedXp && data.rewardedXp > 0) {
          toast.success(`+${data.rewardedXp} XP earned!`);
        }
      } else {
        toast.error(data.error ?? "Could not submit quiz.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setIsPending(false);
    }
  }

  if (submitted) {
    return <ResultScreen quiz={quiz} result={submitted} questions={questions} answers={answers} />;
  }

  return (
    <div className="space-y-6">
      <header className="card p-5">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge tone="blue">{quiz.type === "ASSESSMENT" ? "Assessment" : "Quiz"}</Badge>
          {quiz.timerMinutes ? <Badge tone="amber">{quiz.timerMinutes} min timer</Badge> : null}
          <Badge tone="neutral">Pass: {quiz.passingScore}%</Badge>
        </div>
        <h1 className="text-2xl font-bold">{quiz.title}</h1>
        {quiz.course ? (
          <p className="text-sm text-muted mt-1">Part of: {quiz.course.title}</p>
        ) : null}
        <p className="text-xs text-muted mt-3">
          {questions.length} questions · {unanswered > 0 ? `${unanswered} unanswered` : "all answered"}
        </p>
      </header>

      <div className="space-y-5">
        {questions.map((q, qi) => (
          <section key={q.id} className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Badge tone="neutral">Q{qi + 1}</Badge>
              <span className="text-xs text-muted">{q.points} pts</span>
              {QUESTION_KIND[q.type] ? (
                <Badge tone="blue">{QUESTION_KIND[q.type]}</Badge>
              ) : null}
            </div>
            <p className="font-medium">{q.prompt}</p>
            {q.code ? (
              <pre className="mt-2 rounded-lg bg-[#0d1117] text-green-300 p-3 text-xs overflow-x-auto">{q.code}</pre>
            ) : null}

            <div className="mt-4">
              <QuestionInput
                q={q}
                value={answers[q.id]}
                onChange={(v) => {
                  if (q.type === "MATCH") setMatch(q.id, v as unknown as string[]);
                  else if (q.type === "MULTI_SELECT") setMulti(q.id, v as unknown as string[]);
                  else setAnswer(q.id, v as string);
                }}
              />
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-16 md:bottom-4 flex justify-end">
        <Button size="lg" onClick={submit} disabled={isPending || unanswered > 0}>
          {isPending ? "Grading…" : "Submit answers"}
        </Button>
      </div>
    </div>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: ClientQuestion;
  value?: string | string[];
  onChange: (v: string | string[]) => void;
}) {
  switch (q.type) {
    case "TRUE_FALSE":
      return <ChoiceList options={["true", "false"]} selected={value as string} onSelect={onChange} />;
    case "MCQ":
    case "CORRECT":
    // Judgement questions render as a single-choice list; only the
    // surrounding copy and the server-side grading key differ.
    case "DEBUGGING":
    case "SCENARIO":
      return <ChoiceList options={stringList(q.options)} selected={value as string} onSelect={onChange} />;
    case "MULTI_SELECT":
      return (
        <MultiSelectList
          options={stringList(q.options)}
          selected={(value as string[]) ?? []}
          onSelect={onChange}
        />
      );
    case "FILL":
    case "OUTPUT":
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer…"
          className="w-full sm:w-96 h-10 px-3 rounded-lg border border-border bg-surface text-sm"
          aria-label="Your answer"
        />
      );
    case "MATCH":
      return <MatchInput options={stringList(q.options)} value={(value as string[]) ?? []} onChange={onChange} />;
    default:
      return (
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer…"
          className="w-full sm:w-96 h-10 px-3 rounded-lg border border-border bg-surface text-sm"
          aria-label="Your answer"
        />
      );
  }
}

function stringList(options: unknown): string[] {
  if (!options) return [];
  const arr = Array.isArray(options) ? options : [options];
  return arr
    .map((o) => {
      if (typeof o === "string") return o;
      if (Array.isArray(o)) return String(o[1] ?? o[0] ?? "");
      if (o && typeof o === "object") {
        const anyO = o as Record<string, unknown>;
        return String(anyO.right ?? anyO.value ?? Object.values(anyO)[0] ?? "");
      }
      return String(o);
    })
    .filter((s) => typeof s === "string");
}

function ChoiceList({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected?: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="grid gap-2" role="radiogroup" aria-label="Options">
      {options.map((opt, i) => {
        const key = String(i);
        const isSel = selected === key || selected === opt;
        return (
          <button
            key={key}
            role="radio"
            aria-checked={isSel}
            onClick={() => onSelect(key)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-left text-sm transition-colors",
              isSel ? "border-primary ring-2 ring-primary/40 bg-primary-soft" : "hover:border-primary/50"
            )}
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-bold">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function MultiSelectList({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string[];
  onSelect: (v: string[]) => void;
}) {
  const chosen = new Set(selected);
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted">Select every option that applies.</p>
      {options.map((opt, i) => {
        const key = String(i);
        const isSel = chosen.has(key) || chosen.has(opt);
        return (
          <button
            key={key}
            type="button"
            role="checkbox"
            aria-checked={isSel}
            onClick={() => {
              const next = [...chosen];
              if (isSel) {
                const at = next.indexOf(chosen.has(key) ? key : opt);
                if (at >= 0) next.splice(at, 1);
              } else {
                next.push(key);
              }
              onSelect(next);
            }}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-left text-sm transition-colors",
              isSel ? "border-primary ring-2 ring-primary/40 bg-primary-soft" : "hover:border-primary/50"
            )}
          >
            <span
              className={cn(
                "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold",
                isSel ? "border-primary bg-primary text-white dark:text-[#052e16]" : "border-border"
              )}
              aria-hidden="true"
            >
              {isSel ? "✓" : ""}
            </span>
            <span className="flex-1">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function MatchInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const lefts = options.filter((_, i) => i % 2 === 0);
  return (
    <div>
      {lefts.map((left, i) => {
        const rightId = value[i] ?? "";
        return (
          <div key={left} className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="w-44 font-medium text-sm">{left}</span>
            <select
              value={rightId}
              onChange={(e) => {
                const copy = [...value];
                copy[i] = e.target.value;
                onChange(copy);
              }}
              className="h-9 px-2 rounded-lg border border-border bg-surface text-sm"
              aria-label={`Match ${left}`}
            >
              <option value="">— choose —</option>
              {options.filter((_, j) => j % 2 === 1).map((right) => (
                <option key={right} value={right}>{right}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

function ResultScreen({
  quiz,
  result,
  questions,
  answers,
}: {
  quiz: RunnerQuiz;
  result: SubmitResult;
  questions: ClientQuestion[];
  answers: Answers;
}) {
  const feedback = new Map((result.feedback ?? []).map((f) => [f.questionId, f]));
  const correctCount = questions.filter((q) => feedback.get(q.id)?.correct).length;

  return (
    <div className="space-y-6">
      <header className={cn("card p-6 text-center", result.passed ? "border border-primary/50 bg-primary-soft" : "border border-rose-300 bg-rose-50 dark:bg-rose-950/40")}>
        <h1 className="text-2xl font-bold">
          {result.passed ? "Quiz passed! 🎉" : "Not quite — keep practicing"}
        </h1>
        <p className="text-5xl font-extrabold mt-3">
          {result.percent}%<span className="text-base font-medium text-muted"> · {correctCount}/{questions.length} correct</span>
        </p>
        {result.rewardedXp ? (
          <p className="mt-2 text-primary font-semibold">+{result.rewardedXp} XP earned</p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            {result.suspicious ? "Submission looked too fast — replay to earn XP." : "XP already earned for a past pass."}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a href={`/courses/${quiz.course?.slug ?? ""}`}>
            <Button variant="secondary">Back to course</Button>
          </a>
          <a href={`/quiz/${quiz.id}`}>
            <Button>Retake quiz</Button>
          </a>
        </div>
      </header>

      <div className="space-y-4">
        {questions.map((q, qi) => {
          const f = feedback.get(q.id);
          return (
            <section key={q.id} className="card p-5">
              <div className="flex items-start gap-3">
                {f?.correct ? (
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted mb-1">Question {qi + 1} · {q.points} pts</p>
                  <p className="font-medium">{q.prompt}</p>
                  {q.code ? (
                    <pre className="mt-2 rounded-lg bg-[#0d1117] text-green-300 p-3 text-xs overflow-x-auto">{q.code}</pre>
                  ) : null}
                  {q.type === "MCQ" || q.type === "CORRECT" || q.type === "DEBUGGING" || q.type === "SCENARIO" ? (
                    <p className="mt-2 text-sm text-muted">
                      Your answer: <span className="text-fg font-medium">{answerText(q, stringList(q.options), answers[q.id])}</span>
                    </p>
                  ) : null}
                  {q.type === "MULTI_SELECT" ? (
                    <p className="mt-2 text-sm text-muted">
                      Your answer:{" "}
                      <span className="text-fg font-medium">
                        {((answers[q.id] as string[]) ?? [])
                          .map((idx) => stringList(q.options)[Number(idx)] ?? idx)
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </span>
                    </p>
                  ) : null}
                  {q.type === "TRUE_FALSE" ? (
                    <p className="mt-2 text-sm text-muted">
                      Your answer: <span className="text-fg font-medium">{answers[q.id] ?? "—"}</span>
                    </p>
                  ) : null}
                  {q.type === "FILL" || q.type === "OUTPUT" ? (
                    <p className="mt-2 text-sm text-muted">
                      Your answer: <span className="text-fg font-medium">{String(answers[q.id] ?? "—")}</span>
                    </p>
                  ) : null}
                  {f?.explanation ? (
                    <p className="mt-3 text-sm text-muted bg-surface2 rounded-lg p-3 border border-border">{f.explanation}</p>
                  ) : null}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function answerText(q: ClientQuestion, options: string[], raw?: string | string[]): string {
  if (raw === undefined) return "—";
  const idx = Number(raw);
  if (Number.isFinite(idx) && options[idx]) return options[idx];
  return String(raw);
}