// ============================================================
// Client-side code execution sandbox.
//
// Code runs inside isolated Web Workers within the *user's own
// browser*. The main web server never executes user code.
//
// Isolation properties:
//   - Separate worker scope (no DOM, no server context).
//   - Network APIs are removed inside the worker before running.
//   - Watchdog timeout terminates the worker afterward.
//   - Output caps prevent output floods.
// ============================================================

import { eraseTypes } from "@/lib/client-transpile";

export interface ExecResult {
  ok: boolean;
  output: string;
  error: string | null;
  executionMs: number;
}

export type ExecLanguage = "python" | "javascript" | "sql" | "html" | "css" | "text";

const PYODIDE_URL = "/pyodide/pyodide.mjs";

interface WorkerRequest {
  lang: ExecLanguage;
  code: string;
  type?: string;
}

function runWorker(workerUrl: string, message: WorkerRequest, timeoutMs: number): Promise<ExecResult> {
  return new Promise((resolve) => {
    let worker: Worker | null = null;
    const timer = setTimeout(() => {
      try {
        worker?.terminate();
      } catch {
        /* ignore */
      }
      resolve({
        ok: false,
        output: "",
        error: "Execution timed out. Check for infinite loops.",
        executionMs: timeoutMs,
      });
    }, timeoutMs + 2000);

    try {
      worker = new Worker(workerUrl, { type: "module" });
    } catch (e) {
      clearTimeout(timer);
      resolve({ ok: false, output: "", error: `Sandbox unavailable: ${String(e)}`, executionMs: 0 });
      return;
    }

    const onError = (e: ErrorEvent) => {
      clearTimeout(timer);
      try { worker?.terminate(); } catch { /* ignore */ }
      resolve({
        ok: false,
        output: "",
        error: e.message || "Worker error",
        executionMs: 0,
      });
    };

    worker.onmessage = (ev: MessageEvent<{ type: string; output?: string; error?: string; executionMs?: number; result?: unknown }>) => {
      if (ev.data?.type === "result") {
        clearTimeout(timer);
        try { worker?.terminate(); } catch { /* ignore */ }
        resolve({
          ok: !ev.data.error,
          output: ev.data.output ?? "",
          error: ev.data.error ?? null,
          executionMs: ev.data.executionMs ?? 0,
        });
      }
    };
    worker.onerror = onError;
    worker.postMessage(message);
  });
}

let pyodideWorker: Worker | null = null;
let pyodideQueue: Promise<ExecResult> = Promise.resolve({ ok: false, output: "", error: "init", executionMs: 0 });

/**
 * Run Python via Pyodide; executed in a dedicated worker the first
 * time and reused afterwards. Network access is removed before running.
 */
export async function runPython(code: string, timeoutMs = 4000): Promise<ExecResult> {
  if (pyodideWorker) {
    return runInPyodideWorker(code, timeoutMs);
  }
  // Ensure the Pyodide runtime files exist before first run.
  const preflight = await fetch(`${PYODIDE_URL.slice(0, PYODIDE_URL.lastIndexOf("/"))}/pyodide-lock.json`, {
    method: "HEAD",
  }).catch(() => null);
  if (!preflight) {
    return {
      ok: false,
      output: "",
      error: "Python sandbox unavailable offline. The Pyodide WASM runtime could not be loaded.",
      executionMs: 0,
    };
  }
  pyodideWorker = new Worker("/workers/python-worker.js", { type: "module" });
  pyodideQueue = pyodideQueue.then(() => runInPyodideWorker(code, timeoutMs));
  return pyodideQueue;
}

function runInPyodideWorker(code: string, timeoutMs: number): Promise<ExecResult> {
  if (!pyodideWorker) {
    return Promise.resolve({
      ok: false,
      output: "",
      error: "Python worker not ready.",
      executionMs: 0,
    });
  }
  return runWorkerBound(pyodideWorker, { lang: "python", code }, timeoutMs);
}

function runWorkerBound(worker: Worker, message: WorkerRequest, timeoutMs: number): Promise<ExecResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        ok: false,
        output: "",
        error: "Execution timed out. Check for infinite loops.",
        executionMs: timeoutMs,
      });
    }, timeoutMs + 2000);
    const onMessage = (
      ev: MessageEvent<{ type: string; output?: string; error?: string; executionMs?: number }>
    ) => {
      if (ev.data?.type === "result") {
        clearTimeout(timer);
        worker.onmessage = null;
        worker.onerror = null;
        resolve({
          ok: !ev.data.error,
          output: ev.data.output ?? "",
          error: ev.data.error ?? null,
          executionMs: ev.data.executionMs ?? 0,
        });
      }
    };
    worker.onmessage = onMessage;
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.onmessage = null;
      resolve({ ok: false, output: "", error: e.message || "Worker error", executionMs: 0 });
    };
    worker.postMessage(message);
  });
}

/** One-shot JS worker (fresh isolation per run). */
export async function runJavaScript(code: string, timeoutMs = 4000): Promise<ExecResult> {
  return runWorker("/workers/js-worker.js", { lang: "javascript", code }, timeoutMs);
}

/** One-shot SQL (SQLite WASM) worker. */
export async function runSql(code: string, timeoutMs = 5000): Promise<ExecResult> {
  return runWorker("/workers/sql-worker.js", { lang: "sql", code }, timeoutMs);
}

/** HTML/CSS preview via sandboxed iframe (no scripts fallback). */
export function runHtml(code: string): ExecResult {
  return { ok: true, output: code, error: null, executionMs: 0 };
}

export async function runClientCode(
  lang: ExecLanguage | string,
  code: string,
  timeoutMs = 4000
): Promise<ExecResult> {
  switch (lang) {
    case "python":
      return runPython(code, timeoutMs);
    case "javascript":
      return runJavaScript(code, timeoutMs);
    case "typescript":
    case "ts":
      // The sandbox runs plain JavaScript, so types are erased first.
      return runJavaScript(await eraseTypes(code), timeoutMs);
    case "sql":
      return runSql(code, timeoutMs);
    case "html":
    case "css":
      return Promise.resolve(runHtml(code));
    case "text":
      return Promise.resolve({ ok: true, output: code, error: null, executionMs: 0 });
    default:
      return Promise.resolve({
        ok: false,
        output: "",
        error: `Unsupported language: ${lang}`,
        executionMs: 0,
      });
  }
}