// SQL sandbox worker — executes SQL against SQLite-WASM (sql.js) in-browser.

let initPromise = null;

self.onmessage = async (ev) => {
  const code = String(ev.data?.code ?? "");
  const started = Date.now();
  const output = [];

  try {
    if (!initPromise) {
      initPromise = import("/sql.js/sql-wasm.js").then(async (mod) => {
        const locator = new URL("/sql.js/sql-wasm.wasm", self.location.origin);
        const init = mod.default || mod;
        return init({ wasmBinary: null, locateFile: () => locator.href });
      });
    }
    const SQL = await initPromise;
    const db = new SQL.Database();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; }, 6000);
    try {
      const results = db.exec(code);
      clearTimeout(timer);
      if (timedOut) {
        self.postMessage({ type: "result", error: "SQL execution timed out.", executionMs: Date.now() - started });
        return;
      }
      if (results.length === 0) {
        output.push("(no result set)");
      } else {
        const r = results[0];
        const cols = r.columns;
        const fmtCol = cols.map((c) => String(c).padEnd(14)).join(" ");
        output.push(fmtCol);
        output.push("-".repeat(fmtCol.length));
        for (const row of r.values) {
          output.push(row.map((c) => (c === null || c === undefined ? "NULL" : String(c)).padEnd(14)).join(" "));
        }
        output.push(`${r.values.length} row(s)`);
      }
      self.postMessage({ type: "result", output: output.join("\n"), executionMs: Date.now() - started });
    } catch (e) {
      clearTimeout(timer);
      self.postMessage({
        type: "result",
        error: String(e && e.message ? e.message : e).slice(0, 400),
        executionMs: Date.now() - started,
      });
    } finally {
      try { db.close(); } catch { /* ignore */ }
    }
  } catch (e) {
    self.postMessage({
      type: "result",
      error: `SQL sandbox unavailable: ${String(e && e.message ? e.message : e).slice(0, 300)}`,
      executionMs: Date.now() - started,
    });
  }
};