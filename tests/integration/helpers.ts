import { prisma } from "@/lib/db";

let counter = 0;

export async function createTestUser(prefix = "tester"): Promise<string> {
  const uniq = `${prefix}_${process.pid}_${++counter}_${Date.now().toString().slice(-6)}`;
  const user = await prisma.user.create({
    data: {
      email: `${uniq}@neolearn.test`,
      username: uniq.slice(0, 24),
      displayName: "Test User",
      passwordHash: "unused",
      streak: { create: {} },
    },
  });
  return user.id;
}

export async function deleteTestUser(userId: string) {
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    /* already gone */
  }
}

export async function freshUser(fn: (userId: string) => Promise<void>) {
  const userId = await createTestUser();
  try {
    await fn(userId);
  } finally {
    await deleteTestUser(userId);
  }
}