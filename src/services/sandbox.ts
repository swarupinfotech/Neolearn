// ============================================================
// NeoLearn server-side sandbox — used ONLY to validate hidden
// tests for challenges/projects. User code never touches main
// server APIs, the database, the filesystem or the network.
//
// Isolation strategy (in order):
//   1. WASM interpreter (Pyodide / QuickJS / SQL.js) — no host access.
//   2. Host APIs (open/read/network) removed inside the sandbox.
//   3. Watchdog timeout via interrupt buffer (Python) / interrupt
//      handler (JS).
//   4. Per-test output/result capture only.
// ============================================================

import { existsSync } from "node:fs";
import path from "node:path";
import type { PyodideInterface } from "pyodide";
import type { QuickJSWASMModule } from "quickjs-emscripten";
import type { SqlJsStatic } from "sql.js";

// `typescript` is a runtime dependency (not just a devDependency) because
// challenge grading needs it. It is listed in `serverExternalPackages` so
// Next does not bundle the compiler; this import stays a real Node require.
import * as ts from "typescript";

let pyodidePromise: Promise<PyodideInterface> | null = null;

async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = import("pyodide").then(async ({ loadPyodide }) => {
      const indexPath = require.resolve("pyodide");
      const indexURL = indexPath.replace(/[\\/][^\\/]*$/, "");
      const py = await loadPyodide({ indexURL });
      // Remove filesystem + network access helpers inside the sandbox.
      py.runPython(`
import builtins
builtins.open = lambda *a, **k: (_ for _ in ()).throw(PermissionError("filesystem access disabled"))
try:
    import urllib.request as _ur
    _ur.urlopen = lambda *a, **k: (_ for _ in ()).throw(PermissionError("network access disabled"))
except Exception:
    pass
`);
      return py;
    });
  }
  return pyodidePromise;
}

function jsonToPythonLiteral(value: unknown): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "None";
  if (typeof value === "string") {
    return JSON.stringify(value).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  }
  if (Array.isArray(value)) return `[${value.map(jsonToPythonLiteral).join(", ")}]`;
  if (typeof value === "object") {
    const parts = Object.entries(value as Record<string, unknown>).map(
      ([k, v]) => `${JSON.stringify(k)}: ${jsonToPythonLiteral(v)}`
    );
    return `{${parts.join(", ")}}`;
  }
  return "None";
}

export interface PythonResult {
  value?: unknown;
  error?: string;
  logs: string[];
}

/** Execute `functionName(*args)` defined by `code` inside Pyodide. */
export async function pythonFn(
  code: string,
  functionName: string,
  args: unknown[],
  timeoutMs = 4000
): Promise<PythonResult> {
  const py = await getPyodide();
  const interrupt = new Int32Array(new ArrayBuffer(8));
  py.setInterruptBuffer(interrupt);
  const logs: string[] = [];
  const timer = setTimeout(() => {
    interrupt[0] = 2;
  }, timeoutMs);
  try {
    const callArgs = args.map(jsonToPythonLiteral).join(", ");
    const src = `
${code}

__neolearn_result = ${functionName}(${callArgs})
__neolearn_result
`;
    const handle = py.runPython(src);
    let value: unknown;
    try {
      if (handle == null || typeof handle === "string" || typeof handle === "number" || typeof handle === "boolean") {
        value = handle;
      } else if (typeof handle.toJs === "function") {
        value = handle.toJs({ dict_converter: Object.fromEntries });
      } else {
        value = handle;
      }
    } finally {
      try {
        handle?.destroy?.();
      } catch {
        /* ignore */
      }
    }
    return { value, logs };
  } catch (e) {
    const msg = errorMessage(e, "Runtime error").replace(/File "<exec>", line \d+(, in .*)*/g, "").trim();
    return { error: msg.slice(0, 500), logs };
  } finally {
    clearTimeout(timer);
    try {
      py.setInterruptBuffer(new Int32Array(new ArrayBuffer(0)));
    } catch {
      /* ignore */
    }
  }
}

// ------------------------------------------------------------------
// TypeScript -> JavaScript
//
// QuickJS only understands plain JavaScript, so a real TypeScript
// challenge (with type annotations, interfaces, generics, enums and
// `as` casts) would fail to parse. We therefore erase the type layer
// with the TypeScript compiler before handing the source to the JS
// engine. Compilation happens on the server only; the browser client
// erases types separately so local runs work too.
// ------------------------------------------------------------------
export function transpileTypeScript(source: string): { code: string; error: string | null } {
  try {
    const out = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.None,
        removeComments: false,
        isolatedModules: true,
      },
    });
    const diagnostics = out.diagnostics ?? [];
    const fatal = diagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error);
    if (fatal.length > 0) {
      const first = fatal[0];
      const message = ts.flattenDiagnosticMessageText(first.messageText, " ");
      return { code: "", error: `TypeScript error: ${message}`.slice(0, 300) };
    }
    return { code: out.outputText, error: null };
  } catch (e) {
    return { code: "", error: e instanceof Error ? e.message.slice(0, 300) : "TypeScript compile failed" };
  }
}

// ------------------------------------------------------------------
// JavaScript (QuickJS WASM)
// ------------------------------------------------------------------
let quickjsPromise: Promise<QuickJSWASMModule> | null = null;
function getQuickJS() {
  if (!quickjsPromise) {
    quickjsPromise = import("quickjs-emscripten").then(({ getQuickJS }) => getQuickJS());
  }
  return quickjsPromise;
}

export interface JsResult {
  value?: unknown;
  error?: string;
  logs: string[];
}

/** Execute `functionName(...args)` defined by `code` inside QuickJS. */
export async function runJavaScript(
  code: string,
  functionName: string,
  args: unknown[],
  timeoutMs = 4000
): Promise<JsResult> {
  const QuickJS = await getQuickJS();
  const vm = QuickJS.newContext();
  const logs: string[] = [];
  let timedOut = false;
  try {
    vm.runtime.setMemoryLimit(128 * 1024 * 1024);
    vm.runtime.setInterruptHandler(() => timedOut);
    const timer = setTimeout(() => {
      timedOut = true;
    }, timeoutMs);

    const callArgs = args.map((a) => JSON.stringify(a)).join(", ");
    // The console is defined in plain JS inside the sandbox (no host
    // objects survive into the GC list, which keeps JS_FreeRuntime happy).
    const source = `
var __neolearn_logs = [];
function __neolearn_logger() {
  var parts = [];
  for (var i = 0; i < arguments.length; i++) {
    var a = arguments[i];
    parts.push(typeof a === "string" ? a : JSON.stringify(a));
  }
  __neolearn_logs.push(parts.join(" "));
}
globalThis.console = { log: __neolearn_logger, error: __neolearn_logger };
${code}
;
var __neolearn_result = (function () {
  try {
    var v = ${functionName}(${callArgs});
    return JSON.stringify({ ok: true, logs: __neolearn_logs, value: typeof v === "function" ? String(v) : v });
  } catch (e) {
    return JSON.stringify({ ok: false, logs: __neolearn_logs, err: String((e && e.message) || e) });
  }
})();
__neolearn_result;
`;
    const result = vm.evalCode(source);
    clearTimeout(timer);
    if (result.error) {
      let msg = "[object Object]";
      try {
        const msgHandle = vm.getProp(result.error, "message");
        msg = vm.getString(msgHandle);
        msgHandle.dispose();
      } catch {
        msg = String(vm.dump(result.error));
      } finally {
        result.error.dispose();
      }
      return { error: timedOut ? "Execution timed out" : String(msg).slice(0, 400), logs };
    }
    try {
      const str = vm.getString(result.value);
      result.value.dispose();
      const parsed = JSON.parse(str);
      if (Array.isArray(parsed?.logs)) logs.push(...parsed.logs);
      if (parsed?.ok === true) return { value: parsed.value, logs };
      return { error: String(parsed?.err ?? "JS runtime error").slice(0, 400), logs };
    } catch (e) {
      return { error: String(e).slice(0, 400), logs };
    }
  } catch (e) {
    return { error: timedOut ? "Execution timed out" : errorMessage(e, "JS runtime error").slice(0, 400), logs };
  } finally {
    try {
      vm.dispose();
    } catch {
      /* ignore */
    }
  }
}

// ------------------------------------------------------------------
// SQL (SQL.js WASM)
// ------------------------------------------------------------------
let sqlInitPromise: Promise<SqlJsStatic> | null = null;
async function getSqlJsModule() {
  if (!sqlInitPromise) {
    sqlInitPromise = import("sql.js").then(async (m) => {
      const factory = (m as unknown as { default?: unknown; initSqlJs?: unknown }).default;
      if (typeof factory !== "function") {
        throw new Error("sql.js: no initSqlJs factory found");
      }
      const candidateWasms = [
        path.join(process.cwd(), "node_modules", "sql.js", "dist"),
        path.join(process.cwd(), "public", "vendor"),
      ];
      const resolveFile = (f: string) => {
        for (const dir of candidateWasms) {
          const p = path.join(/*turbopackIgnore: true*/ dir, f);
          if (existsSync(/*turbopackIgnore: true*/ p)) return p;
        }
        return f;
      };
      const SQL = await (factory as (opts: { locateFile: (f: string) => string }) => Promise<SqlJsStatic>)({
        locateFile: resolveFile,
      });
      if (SQL?.Database) return SQL;
      throw new Error("sql.js: factory did not produce a Database module");
    });
  }
  return sqlInitPromise;
}

export interface SqlResult {
  rows?: unknown[][];
  error?: string;
}

/** Run a single SQL statement batch via SQL.js (SQLite dialect). */
export async function runSql(query: string, timeoutMs = 5000): Promise<SqlResult> {
  const SQL = await getSqlJsModule();
  const db = new SQL.Database();
  try {
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
    }, timeoutMs);
    const result = db.exec(query);
    clearTimeout(timer);
    if (timedOut) return { error: "SQL execution timed out" };
    const rows = result.length > 0 ? result[0].values : [];
    return { rows };
  } catch (e) {
    return { error: errorMessage(e, "SQL error").slice(0, 200) };
  } finally {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
}

// ------------------------------------------------------------------
// Output-based grading (languages with no in-browser runtime)
// ------------------------------------------------------------------

/**
 * Normalize a program's stdout so trivial formatting differences do not
 * fail an otherwise correct answer.
 *
 * Applied to BOTH sides of the comparison, so the hidden expectation
 * stored in the database is never echoed back to the learner: only the
 * pass/fail verdict of each hidden test leaves the server.
 *
 * Rules: CRLF -> LF, trailing whitespace stripped per line, trailing
 * blank lines removed, and a single trailing newline tolerated.
 */
export function normalizeStdout(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

/** Compare a learner's program output against a hidden expected output. */
export function stdoutMatches(actual: string, expected: string): boolean {
  return normalizeStdout(actual) === normalizeStdout(expected);
}

// ------------------------------------------------------------------
// Deep-equality used by graders (numeric-tolerant).
// ------------------------------------------------------------------
export function gradedEqual(actual: unknown, expected: unknown): boolean {
  if (typeof actual === "number" && typeof expected === "number") {
    return Math.abs(actual - expected) < 1e-9;
  }
  if (Array.isArray(actual) && Array.isArray(expected)) {
    if (actual.length !== expected.length) return false;
    return actual.every((a, i) => gradedEqual(a, expected[i]));
  }
  if (isPlainObject(actual) && isPlainObject(expected)) {
    const aKeys = Object.keys(actual);
    const eKeys = Object.keys(expected);
    if (aKeys.length !== eKeys.length) return false;
    return aKeys.every((k) => gradedEqual(actual[k], expected[k]));
  }
  return actual === expected;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function errorMessage(e: unknown, fallback: string): string {
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const msg = (e as { message?: unknown }).message;
    if (typeof msg === "string" && msg.length > 0) return msg;
  }
  return fallback;
}