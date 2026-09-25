import { execSync } from "node:child_process";
import { Client } from "pg";
import { INTEGRATION_ENABLED, SCHEMA, testDatabaseUrl } from "./setup-env";

/**
 * One-time setup for integration tests: push the Prisma schema into an isolated
 * PostgreSQL schema and run the seed so services have real data to operate
 * against. Neither dev nor production data is ever touched.
 *
 * Skipped with a clear warning when TEST_DATABASE_URL is not configured.
 */
export default async function globalSetup() {
  if (!INTEGRATION_ENABLED) {
    return () => {
      console.warn(
        "\n[tests] integration suite SKIPPED - set TEST_DATABASE_URL to a throwaway PostgreSQL database (direct connection) to enable it.\n"
      );
    };
  }

  const root = process.cwd();
  const dbUrl = testDatabaseUrl();
  const env = { ...process.env, DATABASE_URL: dbUrl, SEED_VERBOSE: "0" };
  const shell = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "/bin/sh";

  const run = (cmd: string) =>
    execSync(cmd, {
      cwd: root,
      env,
      stdio: "pipe",
      shell,
      // the database may be remote, so schema sync is not instant
      timeout: 15 * 60 * 1000,
    });

  run("npx prisma db push --skip-generate --accept-data-loss");
  run("npx tsx prisma/seed.ts");

  return async () => {
    const client = new Client({ connectionString: dbUrl });
    try {
      await client.connect();
      await client.query(`DROP SCHEMA IF EXISTS "${SCHEMA}" CASCADE`);
    } catch {
      /* the instance may already be gone - nothing left to clean up */
    } finally {
      await client.end().catch(() => {});
    }
  };
}
