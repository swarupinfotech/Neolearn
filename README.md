# NeoLearn

A gamified, full-stack coding-learning platform. Users take lessons, quizzes, challenges and projects, earn XP, level up, unlock achievements, keep streaks, and interact through community posts — with real code brain executed in a sandboxed browser-side WASM runtime (no cloud code runner needed).

## Stack

- **Framework:** Next.js 16 (App Router, Turbopack, React 19)
- **Language:** TypeScript 5.7 (strict, `noUncheckedIndexedAccess`)
- **Database:** PostgreSQL (Supabase) via Prisma 6, connected through the Supabase pooler in transaction mode — see `docs/POSTGRES.md`
- **Sandbox:** `quickjs-emscripten` (JS), `pyodide` (Python), `sql.js` (SQL) — all in-process/WASM, no host access
- **Auth:** custom session (signed JWT in HTTP-only cookie + CSRF), bcrypt password hashing, email verification & password reset (nodemailer, dev-mode prints links)
- **Code editor:** CodeMirror 6 via `@uiw/react-codemirror`
- **Testing:** Vitest (unit + integration), Playwright (e2e against real dev server)
- **UI:** Tailwind CSS v4, `next-themes`, `sonner` toasts, `lucide-react`

## Quickstart

```bash
# 1. Install dependencies (also copies Pyodide assets to public/)
npm install

# 2. Configure environment
cp .env.example .env.local   # then edit values (AUTH_SECRET etc.)

# 3. Push the schema to Supabase and seed demo content
npm run db:push
npm run db:seed

# 4. Run
npm run dev                 # http://localhost:3000
```

> `DATABASE_URL` must be the Supabase **transaction pooler** (port 6543) with the
> project ref in the username — `<role>.<PROJECT_REF>` — and `pgbouncer=true`.
> A plain `postgres` user fails with `ENOIDENTIFIER: no tenant identifier provided`.
> Direct connections (port 5432) exhaust Supabase's 15-connection pool under
> serverless load (`EMAXCONNSESSION`).

## Demo accounts

| Email                    | Role          | Notes                                  |
| ------------------------ | ------------- | -------------------------------------- |
| `admin@neolearn.dev`    | ADMIN         | Lift `ADMIN_BOOTSTRAP_EMAIL` to promote |
| `demo@neolearn.dev`     | USER          | Main demo user (has completed onboarding) |
| `sara@neolearn.dev`     | USER          | Secondary profile sample               |
| `dev@neolearn.dev`      | USER          | Sample "dev dabbler"                    |

There is **no default password**. Set `SEED_DEMO_PASSWORD` before seeding, otherwise
the seed aborts rather than creating accounts with a shared credential:

```bash
SEED_DEMO_PASSWORD='<strong password>' npm run db:seed
```

The seed only creates an account when it does not already exist, so re-running it
never resets a password you have since changed. To bootstrap an admin explicitly:

```bash
ADMIN_BOOTSTRAP_EMAIL=you@example.com ADMIN_BOOTSTRAP_PASSWORD='<strong password>' npm run db:seed
```

Demo users have completed onboarding, so login lands directly on `/dashboard`. `ADMIN_BOOTSTRAP_EMAIL` (default `admin@neolearn.dev`) promotes the first matching account to ADMIN on signup.

## Scripts

| Command                | Purpose                                   |
| ---------------------- | ----------------------------------------- |
| `npm run dev`          | Development server                        |
| `npm run build`        | Production build (`next build`)           |
| `npm start`            | Serve production build                    |
| `npm run lint`         | ESLint (flat config)                      |
| `npm run typecheck`    | `tsc --noEmit`                            |
| `npm test`             | Vitest — unit + integration               |
| `npm run test:e2e`     | Playwright e2e (spins up its own server)  |
| `npm run db:seed`      | Seed / reseed demo data (idempotent)      |
| `npm run db:push`      | Push schema to database                   |

## Testing

- **Unit / integration (62 tests):** `tests/unit`, `tests/integration`. Run against a throwaway `file:./test.db`.
  ```bash
  npm test                 # or: npx vitest run
  ```
- **E2E (5 tests):** `tests/e2e` — login/register flows, lesson completion XP, and a full quiz pass. The Playwright webServer command (`scripts/e2e-server.cmd`) recreates `prisma/e2e.db`, pushes the schema, seeds, then boots `next dev` on port 3310.
  ```bash
  npm run test:e2e
  ```

### Quality gate

```bash
npx tsc --noEmit
npm run lint
npm run build
npm test
npm run test:e2e
```

## Project layout

```
prisma/            schema (+ seed.ts with courses, quizzes, challenges…)
scripts/           e2e server bootstrap, pyodide asset copy
src/
  app/             App Router pages + API routes
  actions/         Server Actions ("use server")
  services/        Business logic (auth, sandbox, xp, quizzes…)
  components/      UI + feature components
  lib/             prisma client, sessions, tokens, validation, email
tests/             unit, integration, e2e specs + support helpers
public/            static assets (vendored WASM)
```

## Key behaviors

- **XP rewards:** lesson 10, quiz 20, challenge 30, daily mission 50, course 100, project 40 — awarded once per `(userId, type, sourceId)` via a DB unique constraint.
- **Achievements:** e.g. `challenge-first` (+20 XP) unlocks on first challenge solve; `quiz-master` needs 3 passed quizzes.
- **Sandbox isolation:** all three runtimes are WASM in a worker; Python's `open`/`urlopen` are disabled inside the sandbox; JS runs in QuickJS with a memory limit and interrupt-based timeout.

## Environments

`.env.example` documents every variable (SMTP, AI mentor, payments, OAuth). Only `AUTH_SECRET` is required for a working dev setup; email dev-mode prints verification links to the server log.