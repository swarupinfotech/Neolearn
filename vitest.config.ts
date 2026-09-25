import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(__dirname, "./src"),
  "@tests": path.resolve(__dirname, "./tests"),
};

/**
 * `npm test` runs the unit suite, which is pure and always runnable.
 *
 * The integration suite needs a throwaway database. Point TEST_DATABASE_URL at a
 * PostgreSQL instance the app role may run `prisma db push` against - a local
 * Postgres, a Docker container, or a dedicated Supabase branch. It must be a
 * direct connection: transaction poolers drop the `?schema=` search_path that
 * provides the isolation, and the test database must never be the one
 * production uses.
 *
 * The check is fail-closed. Without TEST_DATABASE_URL the integration files are
 * excluded from the run entirely, so a misconfigured environment cannot write to
 * the real database.
 */
function hasDedicatedTestDatabase(): boolean {
  if (process.env.TEST_DATABASE_URL) return true;
  for (const file of [".env.test", ".env.local", ".env"]) {
    const full = path.join(__dirname, file);
    if (!fs.existsSync(full)) continue;
    if (/^TEST_DATABASE_URL\s*=\s*\S/m.test(fs.readFileSync(full, "utf8"))) return true;
  }
  return false;
}

const integrationEnabled = hasDedicatedTestDatabase();

if (!integrationEnabled) {
  console.warn(
    "\n[vitest] integration suite EXCLUDED - set TEST_DATABASE_URL to a throwaway PostgreSQL database (direct connection) to run it.\n"
  );
}

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          testTimeout: 20000,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          environment: "node",
          include: integrationEnabled ? ["tests/integration/**/*.test.ts"] : [],
          testTimeout: 20000,
          hookTimeout: 60000,
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/integration/setup-env.ts"],
        },
      },
    ],
  },
});
