// E2E runs against an isolated database provisioned by the Playwright
// webServer command (see playwright.config.ts webServer.command). This
// module must be imported before anything that touches @/lib/db so the
// Prisma client binds to the e2e database rather than the dev database.
//
// The schema provider is postgresql, so a SQLite file URL (file:./e2e.db)
// is invalid here. E2E_DATABASE_URL must point at a throwaway PostgreSQL
// database - never at the Supabase instance used by dev or production.
process.env.DATABASE_URL =
  process.env.E2E_DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/neolearn_e2e?schema=public";

export { prisma } from "../../../src/lib/db";
