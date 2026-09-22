// JavaScript sandbox worker — one-shot isolation per run.
// Network APIs are removed before executing user code.

self.onmessage = (ev) => {
  const started = Date.now();
  const code = String(ev.data?.code ?? "");
  const timeoutMs = Number(ev.data?.timeoutMs ?? 4000);
  const output = [];
  const MAX_OUTPUT = 100000;

  // Remove network access for the user's code.
  try {
    globalThis.fetch = undefined;
    globalThis.XMLHttpRequest = undefined;
    globalThis.WebSocket = undefined;
  } catch { /* ignore */ }

  const push = (line) => {
    const s = String(line ?? "");
    if (output.join("\n").length < MAX_OUTPUT) output.push(s.slice(0, MAX_OUTPUT));
  };

  const timer = setTimeout(() => {
    self.postMessage({ type: "result", error: "Execution timed out. Check for infinite loops.", executionMs: timeoutMs });
    self.close();
  }, timeoutMs);

  try {
    const sandboxed = new Function(
      "console",
      "setTimeout",
      "setInterval",
      "clearTimeout",
      "clearInterval",
      `
with ({}) {
${code}
}
`
    );
    const fakeConsole = {
      log: (...a) => push(a.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(" ")),
      error: (...a) => push(a.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(" ")),
      warn: (...a) => push(a.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(" ")),
      info: (...a) => push(a.map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x))).join(" ")),
    };
    const noopTimer = () => ({});
    sandboxed(fakeConsole, noopTimer, noopTimer, () => {}, () => {});
    clearTimeout(timer);
    self.postMessage({ type: "result", output: output.join("\n"), executionMs: Date.now() - started });
  } catch (e) {
    clearTimeout(timer);
    self.postMessage({ type: "result", error: String(e && e.message ? e.message : e).slice(0, 500), executionMs: Date.now() - started });
  }
  self.close();
};