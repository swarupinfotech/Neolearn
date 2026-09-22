// Python sandbox worker — runs user code inside Pyodide (WASM).
// Isolated per browser tab; network host APIs removed before running.

let pyodidePromise = null;

async function loadPyodideRuntime() {
  if (!pyodidePromise) {
    // Import from the locally-hosted Pyodide build.
    pyodidePromise = import("/pyodide/pyodide.mjs").then(async (mod) => {
      const py = await mod.loadPyodide({ indexURL: "/pyodide/" });
      return py;
    });
  }
  return pyodidePromise;
}

self.onmessage = async (ev) => {
  const code = String(ev.data?.code ?? "");
  const timeoutMs = Number(ev.data?.timeoutMs ?? 4000);
  const output = [];
  const started = Date.now();
  const MAX_OUTPUT = 100000;

  const push = (s) => {
    const str = String(s ?? "");
    if (output.join("").length < MAX_OUTPUT) output.push(str.slice(0, MAX_OUTPUT));
  };

  try {
    // Disable network access in the worker scope before Pyodide runs.
    globalThis.fetch = undefined;
    globalThis.XMLHttpRequest = undefined;
    globalThis.WebSocket = undefined;

    const py = await loadPyodideRuntime();
    py.setStdout({ batched: push });
    py.setStderr({ batched: push });

    const interrupt = new Int32Array(new ArrayBuffer(8));
    py.setInterruptBuffer(interrupt.buffer);
    const timer = setTimeout(() => {
      interrupt[0] = 2; // raise KeyboardInterrupt-style abort
    }, timeoutMs);

    try {
      py.runPython(`__top = ${JSON.stringify(JSON.stringify(code))}`); // unused guard
    } catch { /* ignore */ }

    py.runPython(`${code}`);
    clearTimeout(timer);
    // Flush any pending traceback
    self.postMessage({ type: "result", output: output.join(""), executionMs: Date.now() - started });
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    // Strip noisy traceback internals for a clean, friendly error.
    const clean = msg
      .replace(/Pyodide has suffered a fatal error.*$/s, "Python sandbox error")
      .split("\n")
      .slice(-8)
      .join("\n")
      .slice(0, 1200);
    self.postMessage({ type: "result", error: clean, executionMs: Date.now() - started });
  }
};