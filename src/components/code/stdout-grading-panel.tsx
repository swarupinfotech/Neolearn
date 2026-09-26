"use client";

import { Button } from "@/components/ui/button";

export interface StdoutCase {
  /** Stable key, usually the test name. */
  key: string;
  /** Heading shown above the input block. */
  label: string;
  /** The input the program is fed. Rendered read-only. */
  input?: string;
  /** Extra hint rendered under the input, e.g. a description of the case. */
  hint?: string;
}

/**
 * Output-based grading UI, shared by challenges and projects.
 *
 * One block per test case: the input is shown, and the learner pastes what
 * their program printed. Expected values are never sent to the browser —
 * the comparison happens server-side.
 *
 * An empty output is legitimate, but only when the learner says so
 * explicitly, so a forgotten textarea never silently grades as "".
 */
export function StdoutGradingPanel({
  cases,
  outputs,
  noOutput,
  onChange,
  onToggleNoOutput,
  submitting,
  onSubmit,
  ready,
  submitLabel = "Submit output for grading",
  submitBusyLabel = "Grading…",
  instruction,
  emptyHint = "Give an output for every test, or tick “prints nothing”.",
}: {
  cases: StdoutCase[];
  outputs: string[];
  noOutput: boolean[];
  onChange: (next: string[]) => void;
  onToggleNoOutput: (index: number) => void;
  submitting: boolean;
  onSubmit: () => void;
  ready: boolean;
  submitLabel?: string;
  submitBusyLabel?: string;
  instruction?: string;
  emptyHint?: string;
}) {
  return (
    <div className="mt-4 space-y-3">
      <p className="text-sm text-muted">
        {instruction ??
          "Run your program once per input below, then paste what it prints. If your program prints nothing for a test, tick that box instead of leaving the textarea empty."}
      </p>
      {cases.map((c, i) => {
        const id = `stdout-${c.key.replace(/[^a-z0-9]+/gi, "-")}-${i}`;
        const printsNothing = noOutput[i] === true;
        return (
          <div key={id} className="rounded-lg border border-border bg-surface2 p-3">
            <p className="text-xs font-medium text-muted mb-1">{c.label}</p>
            <pre className="text-xs font-mono whitespace-pre-wrap mb-2 max-h-24 overflow-y-auto">
              {c.input || "(no input)"}
            </pre>
            {c.hint ? <p className="text-xs text-muted mb-2">{c.hint}</p> : null}
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
          {submitting ? submitBusyLabel : submitLabel}
        </Button>
        {!ready ? <span className="text-xs text-muted self-center">{emptyHint}</span> : null}
      </div>
    </div>
  );
}

/** True when every case has either pasted output or an explicit "prints nothing". */
export function outputsReady(outputs: string[], noOutput: boolean[]): boolean {
  return outputs.length > 0 && outputs.every((o, i) => o.trim().length > 0 || noOutput[i] === true);
}
