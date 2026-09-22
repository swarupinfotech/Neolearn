import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const src = join(process.cwd(), "node_modules", "pyodide");
const dest = join(process.cwd(), "public", "pyodide");

const sqlSrc = join(process.cwd(), "node_modules", "sql.js", "dist");
const sqlDest = join(process.cwd(), "public", "sql.js");

function copyDir(from, to) {
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    const s = join(from, entry);
    const d = join(to, entry);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

console.log("Copying Pyodide runtime → /public/pyodide");
copyDir(src, dest);
if (existsSync(sqlSrc)) {
  console.log("Copying sql.js WASM → /public/sql.js");
  copyDir(sqlSrc, sqlDest);
}
console.log("Runtime assets ready.");