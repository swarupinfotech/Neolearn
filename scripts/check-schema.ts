// Read-only probe: reports whether the expansion columns exist in the
// database DATABASE_URL points at. Runs a SELECT against
// information_schema, so it is safe against production and works through
// a transaction pooler (unlike prisma db push, which needs DDL).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXPECTED: Record<string, string[]> = {
  Course: ["longDescription", "objectives", "technology", "tags", "xpReward", "order"],
  Quiz: ["description", "order", "status"],
  QuizAttempt: ["correctCount"],
  Challenge: ["gradingMode", "inputFormat"],
  Project: ["difficulty", "objectives", "technologies", "tasks", "criteria"],
  LearningPath: ["longDescription", "level", "xpReward", "prerequisitePathIds", "order"],
};

async function main() {
  const rows = await prisma.$queryRaw<{ table_name: string; column_name: string }[]>`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('Course','Quiz','QuizAttempt','Challenge','Project','LearningPath')
  `;
  const have = new Set(rows.map((r) => `${r.table_name}.${r.column_name}`));

  let missing = 0;
  for (const [table, cols] of Object.entries(EXPECTED)) {
    for (const col of cols) {
      const ok = have.has(`${table}.${col}`);
      if (!ok) missing += 1;
      console.log(`${ok ? "OK     " : "MISSING"}  ${table}.${col}`);
    }
  }

  console.log(`\n${missing === 0 ? "Schema is up to date." : `${missing} column(s) missing — the new build will 500 until prisma/sql is applied.`}`);
}

main()
  .catch((e) => {
    console.error("probe failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
