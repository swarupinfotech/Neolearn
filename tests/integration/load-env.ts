import fs from "node:fs";
import path from "node:path";

/**
 * Minimal .env loader for the test harness - Vitest does not load Next's env
 * files, and the setup file runs before any app module. Precedence matches
 * Next.js: real environment variables win, .env.local overrides .env.
 */
function parse(file: string, force: boolean) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = /^([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (!match) continue;
    const key = match[1];
    if (!force && process.env[key] !== undefined) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const root = process.cwd();
parse(path.join(root, ".env"), false);
parse(path.join(root, ".env.local"), true);
// A committed .env.test is a default, so it never overrides a real variable -
// but it must still win over the machine's .env.
const beforeTest = new Map(["TEST_DATABASE_URL", "TEST_DB_SCHEMA"].map((k) => [k, process.env[k]]));
parse(path.join(root, ".env.test"), false);
for (const [key, value] of beforeTest) {
  if (value === undefined) delete process.env[key];
}

export {};
