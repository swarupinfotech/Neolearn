@echo off
rem Provision an isolated e2e database, seed it, then start the dev server.
if not defined E2E_PORT set E2E_PORT=3310
if exist prisma\e2e.db* del /q prisma\e2e.db*
set DATABASE_URL=file:./e2e.db
call npx prisma db push --skip-generate --accept-data-loss
if errorlevel 1 exit /b 1
call npx tsx prisma/seed.ts
if errorlevel 1 exit /b 1
call npx next dev -p %E2E_PORT%
