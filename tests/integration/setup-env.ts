import "./load-env";

/**
 * Integration tests run against a throwaway database. TEST_DATABASE_URL must be
 * a PostgreSQL instance where the app role can create schemas - a local
 * Postgres, a Docker container or a dedicated Supabase *branch*.
 *
 * It must never be the database production uses, and it must be a direct
 * connection: PgBouncer-style transaction poolers (Supabase port 6543 with
 * `pgbouncer=true`) strip the `?schema=` startup parameter, so every query
 * silently lands in `public` and the "isolated" schema provides no isolation at
 * all. `testDatabaseUrl` rejects that configuration outright.
 */

const SCHEMA = process.env.TEST_DB_SCHEMA ?? "neolearn_test";
const BASE_URL = process.env.TEST_DATABASE_URL;

/** True when a dedicated test database is configured. */
export const INTEGRATION_ENABLED = !!BASE_URL;

/** Build the test database URL, pinned to the isolated schema. */
export function testDatabaseUrl(): string {
  if (!BASE_URL) {
    throw new Error(
      "Integration tests need TEST_DATABASE_URL pointing at a throwaway PostgreSQL database. See vitest.config.ts."
    );
  }
  const url = new URL(BASE_URL);

  // PgBouncer (and anything else that rewrites the search_path) would make the
  // schema prefix a no-op, so refuse instead of writing to the wrong tables.
  if (url.searchParams.get("pgbouncer") === "true" || url.port === "6543") {
    throw new Error(
      "TEST_DATABASE_URL must use a direct Postgres connection, not a transaction pooler. " +
        "Poolers drop the `?schema=` search_path, so tests would run against `public`."
    );
  }

  url.searchParams.set("schema", SCHEMA);
  return url.toString();
}

// Fail closed: without a dedicated test database we overwrite the inherited
// DATABASE_URL with an unreachable one, so an integration test can never fall
// through to the real database even if it is invoked outside Vitest.
if (BASE_URL) {
  process.env.DATABASE_URL = testDatabaseUrl();
} else {
  process.env.DATABASE_URL = "postgresql://invalid:invalid@127.0.0.1:1/invalid";
}

export { SCHEMA };
