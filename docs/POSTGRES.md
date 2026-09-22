# Running NeoLearn on PostgreSQL

The repo defaults to SQLite so the project runs with zero setup. The Prisma schema is deliberately kept **PostgreSQL-compatible**: only portable column types are used (`String id @default(cuid())`, `DateTime @default(now())`, Prisma `Json`), with no `@db.*` hints, `BigInt`, `Decimal`, or SQLite-only features. Provider switch is one line.

## 1. Spin up a database

Local (Docker) or hosted (Neon, Supabase, RDS, …):

```bash
docker run -d --name neolearn-pg -e POSTGRES_USER=neolearn \
  -e POSTGRES_PASSWORD=neolearn -e POSTGRES_DB=neolearn \
  -p 5432:5432 postgres:16
```

## 2. Point Prisma at it

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then in `.env.local`:

```dotenv
DATABASE_URL="postgresql://neolearn:neolearn@localhost:5432/neolearn?schema=public"
```

## 3. Apply the schema

For a brand-new Postgres (recommended — the SQLite dev DB has no data you need to keep):

```bash
npx prisma db push        # dev: push schema directly
# or, for a managed migration workflow:
npx prisma migrate dev --name init
```

Seed the demo content (idempotent):

```bash
npx tsx prisma/seed.ts
```

> `db push` and `db migrate` ignore `--env-file`; pass the connection via a shell variable if your env setup differs:
> `set DATABASE_URL=... && npx prisma db push`

## 4. Verify

```bash
npm run typecheck
npm test                    # tests create their own file:./test.db — unaffected
npm run build
```

## Notes & caveats

- **Prisma `Json` columns** become `jsonb` automatically; scalar arrays and nested objects are handled transparently. Nullable `Json` fields stay nullable.
- **Enums** map to native Postgres enums. `prisma db push` on an existing live DB *may* need `--accept-data-loss` if a column type changes; prefer `prisma migrate dev` in production.
- **Case sensitivity:** quoted identifiers are case-sensitive in Postgres. Prisma quotes model/field names it generates, so `communityPost`, `CourseModule`, etc. behave as in SQLite. If you query with raw SQL, use the exact casing or double-quotes.
- **Unique constraint for XP rewards** (`@@unique([userId, type, sourceId])` on `XpTransaction`) works identically on Postgres — it's what makes repeated awards impossible.
- **SQLite → Postgres migration is not automatic.** The two stores are only interchangeable for *new* databases. Do not copy `dev.db` bytes into Postgres; use `prisma migrate deploy` + your own data export/import if you must preserve data.
- **Rate limiting** (`src/lib/rate-limit.ts`) and other in-process state still work unchanged because the provider is abstracted behind Prisma — only `DATABASE_URL` changes.

## Production checklist

- Use `prisma migrate deploy` (not `db push`) on release.
- Set `NEXT_PUBLIC_APP_URL` to the real origin and `NODE_ENV=production` (forces secure cookies; see `isSecure()` in `src/lib/session.ts`).
- Generate a real `AUTH_SECRET`.
- Configure SMTP so verification/reset emails send instead of printing to logs.
- Consider a connection pooler for serverless deployments.