// E2E runs against an isolated database provisioned by the Playwright
// webServer command (see playwright.config.ts webServer.command). This
// module must be imported before anything that touches @/lib/db so the
// Prisma client binds to the e2e database rather than dev.db.
process.env.DATABASE_URL = process.env.E2E_DATABASE_URL ?? "file:./e2e.db";

export { prisma } from "../../../src/lib/db";