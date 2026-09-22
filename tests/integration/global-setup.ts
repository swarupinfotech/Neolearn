import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

/**
 * One-time setup for integration tests: push the Prisma schema into an
 * isolated SQLite file and run the seed so services have real data to
 * operate against. The dev database is never touched.
 */
export default async function globalSetup() {
  const root = process.cwd();
  const dbUrl = "file:./test.db";
  const env = { ...process.env, DATABASE_URL: dbUrl, SEED_VERBOSE: "0" };

  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: root,
    env,
    stdio: "pipe",
  });
  execSync("npx tsx prisma/seed.ts", { cwd: root, env, stdio: "pipe" });

  return async () => {
    for (const file of ["prisma/test.db", "prisma/test.db-journal", "prisma/test.db-wal", "prisma/test.db-shm"]) {
      try {
        rmSync(path.join(root, file), { force: true });
      } catch {
        /* ignore */
      }
    }
  };
}