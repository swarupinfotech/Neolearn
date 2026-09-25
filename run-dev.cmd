@echo off
cd /d "C:\Users\swaru\AppData\Local\Temp\opencode\Neolearn-repo"
set "DATABASE_URL=postgresql://postgres.tlivwnhtytfbyhrqcscm:NeoLearn2026!Postgres@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=2&connect_timeout=20"
set "AUTH_SECRET=dev-local-secret-hf8k2n9xmzw7db"
set "PORT=3000"
npx.cmd --yes next dev -p 3000
