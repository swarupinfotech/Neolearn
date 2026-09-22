"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeEditor } from "@/components/editor/code-editor";
import { runClientCode } from "@/lib/client-exec";
import { Play, RotateCcw, TerminalSquare } from "lucide-react";
import { cn } from "@/lib/cn";

const LANGS = [
  { id: "python", label: "Python", sample: `print("Hello, world!")\n\nfor i in range(1, 6):\n    print(f"{i} squared = {i**2}")` },
  {
    id: "javascript",
    label: "JavaScript",
    sample: `console.log("Hello, world!");\n\nconst fib = (n) => n < 2 ? n : fib(n - 1) + fib(n - 2);\nconsole.log(fib(10));`,
  },
  {
    id: "sql",
    label: "SQL",
    sample: `CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT);\nINSERT INTO users(name) VALUES ('Ada'), ('Grace'), ('Alan');\nSELECT name FROM users ORDER BY name;`,
  },
  {
    id: "html",
    label: "HTML / CSS",
    sample: `<div style="font-family: sans-serif">\n  <h1 style="color: #22c55e">Hello</h1>\n  <p>Live preview of HTML & CSS.</p>\n</div>`,
  },
] as const;

export function Playground() {
  const [lang, setLang] = useState<(typeof LANGS)[number]["id"]>("python");
  const [code, setCode] = useState<string>(LANGS[0].sample);
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState(false);

  function switchLang(next: (typeof LANGS)[number]["id"]) {
    if (next === lang) return;
    setLang(next);
    const entry = LANGS.find((l) => l.id === next);
    setCode(entry?.sample ?? "");
    setOutput("");
  }

  async function run() {
    setRunning(true);
    setOutput("");
    const r = await runClientCode(lang, code, 5000);
    setRunning(false);
    if (r.ok) {
      setOutput(r.output || "(no output)");
    } else {
      setOutput(`Error: ${r.error ?? "unknown"}`);
      toast.error("Execution error");
    }
  }

  const previewLang = lang === "html";

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Language">
            {LANGS.map((l) => (
              <button
                key={l.id}
                role="tab"
                aria-selected={lang === l.id}
                onClick={() => switchLang(l.id)}
                className={cn(
                  "h-8 px-3 rounded-lg text-xs font-semibold border transition-colors",
                  lang === l.id
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface2 text-muted hover:text-fg"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={run} disabled={running}>
            <Play className="h-3.5 w-3.5" /> {running ? "Running…" : "Run"}
          </Button>
        </div>

        <CodeEditor language={lang} value={code} onChange={setCode} height="360px" ariaLabel="Playground editor" />

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted flex items-center gap-1">
            <TerminalSquare className="h-3.5 w-3.5" /> Sandboxed: network &amp; file access disabled
          </span>
          <Button size="sm" variant="ghost" onClick={() => setCode(LANGS.find((l) => l.id === lang)?.sample ?? "")}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset sample
          </Button>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Output
          </h2>
          {previewLang && output ? <Badge tone="blue">Live preview</Badge> : null}
        </div>
        {previewLang ? (
          renderPreview(output)
        ) : (
          <pre className="rounded-lg bg-[#0d1117] text-green-200 p-4 text-xs font-mono whitespace-pre-wrap overflow-auto min-h-72 max-h-[440px] leading-relaxed">
            {output || "Run your code to see the output here."}
          </pre>
        )}
      </section>
    </div>
  );
}

function renderPreview(html: string) {
  const safe = String(html ?? "").replace(/<script[\s\S]*?<\/script>/gi, "&lt;script removed&gt;");
  return (
    <div className="rounded-lg border border-border bg-white min-h-72 p-4">
      <iframe title="HTML preview" sandbox="allow-same-origin" className="w-full h-[440px] bg-white rounded" srcDoc={`<html><body style="font-family:sans-serif">${safe}</body></html>`} />
    </div>
  );
}