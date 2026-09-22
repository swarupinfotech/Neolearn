// Point Prisma at an isolated test database BEFORE any module that imports
// @/lib/db is loaded. Runs in every Vitest worker before its test file.
process.env.DATABASE_URL = "file:./test.db";

export {};