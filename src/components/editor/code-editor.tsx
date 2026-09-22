"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * CodeMirror 6 editor, loaded client-side only.
 * Dark theme follows the app theme.
 */
const CodeMirror = dynamic(() => import("@uiw/react-codemirror").then((m) => m.default), {
  ssr: false,
  loading: () => (
    <div className="h-[240px] rounded-lg border border-border bg-[#0d1117] animate-pulse" />
  ),
});

interface Props {
  language?: string;
  value: string;
  onChange: (value: string) => void;
  height?: string;
  readOnly?: boolean;
  placeholder?: string;
  ariaLabel?: string;
}

const extCache: Record<string, unknown[]> = {};

async function getExtensions(language: string): Promise<unknown[]> {
  if (extCache[language]) return extCache[language];
  let ext: unknown[] = [];
  switch (language) {
    case "python": {
      const { python } = await import("@codemirror/lang-python");
      ext = [python()];
      break;
    }
    case "javascript":
    case "typescript": {
      const { javascript } = await import("@codemirror/lang-javascript");
      ext = [javascript()];
      break;
    }
    case "html":
    case "xml": {
      const [{ html }, { css }] = await Promise.all([
        import("@codemirror/lang-html"),
        import("@codemirror/lang-css"),
      ]);
      ext = [html(), css()];
      break;
    }
    case "sql": {
      const { sql } = await import("@codemirror/lang-sql");
      ext = [sql()];
      break;
    }
    default: {
      const { javascript } = await import("@codemirror/lang-javascript");
      ext = [javascript()];
    }
  }
  extCache[language] = ext;
  return ext;
}

export function CodeEditor({
  language = "python",
  value,
  onChange,
  height = "240px",
  readOnly = false,
  placeholder,
  ariaLabel,
}: Props) {
  const [extensions, setExtensions] = useState<unknown[]>([]);

  useEffect(() => {
    let active = true;
    getExtensions(language).then((ext) => {
      if (active) setExtensions(ext);
    });
    return () => {
      active = false;
    };
  }, [language]);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-[#0d1117] text-left">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions as never}
        height={height}
        readOnly={readOnly}
        theme="dark"
        placeholder={placeholder}
        aria-label={ariaLabel}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          indentOnInput: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          foldGutter: true,
        }}
        style={{ fontSize: 14 }}
      />
    </div>
  );
}