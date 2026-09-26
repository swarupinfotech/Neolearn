// ============================================================
// Client-side TypeScript → JavaScript type erasure.
//
// The browser sandbox executes plain JavaScript, so a TypeScript
// snippet must have its types erased before it can run. We do that
// here with the real TypeScript compiler, lazily loaded so the
// compiler is only fetched when a learner actually runs a
// TypeScript snippet.
//
// Only erasure happens: no type checking, no type information, and
// the user's code still executes inside the browser worker exactly
// like any other snippet — the server never sees it.
// ============================================================

type Transpiler = (code: string) => string;

let transpilerPromise: Promise<Transpiler> | null = null;

/** True when the language needs type erasure before it can run. */
export function needsTypeErasure(lang: string): boolean {
  const l = lang.toLowerCase();
  return l === "typescript" || l === "ts";
}

async function loadTranspiler(): Promise<Transpiler> {
  const ts = await import("typescript");
  return (code: string) => {
    const out = ts.transpileModule(code, {
      compilerOptions: {
        // The sandbox runs the source through `new Function`, so the
        // output must be a plain script with no import/export syntax.
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.None,
        isolatedModules: true,
        removeComments: false,
        allowJs: true,
      },
      // Treat the snippet as its own file: no imports across files.
      fileName: "snippet.ts",
    });
    return out.outputText;
  };
}

/**
 * Erase TypeScript syntax. Returns JavaScript suitable for the browser
 * sandbox. On failure the original source is returned so the learner's
 * code still runs and surfaces a normal JavaScript error.
 */
export async function eraseTypes(code: string): Promise<string> {
  try {
    transpilerPromise ??= loadTranspiler();
    const transpile = await transpilerPromise;
    return transpile(code);
  } catch {
    return code;
  }
}
