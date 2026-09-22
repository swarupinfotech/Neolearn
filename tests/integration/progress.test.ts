import { describe, it, expect } from "vitest";
import { prisma } from "@/lib/db";
import { completeLesson } from "@/services/progress";
import { freshUser } from "./helpers";

describe("completeLesson", () => {
  it("awards lesson XP exactly once and tracks course progress", async () => {
    await freshUser(async (userId) => {
      const lesson = await prisma.lesson.findFirst({ where: { slug: "python-printing" } });
      expect(lesson).toBeTruthy();

      const res = await completeLesson(
        userId,
        lesson!.id,
        { progressPct: 100, completed: true },
        "10.0.2.1"
      );
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.lessonCompleted).toBe(true);
        expect(res.lessonRewarded).toBe(true);
        expect(res.xp).toBe(lesson!.xpReward);
      }
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(lesson!.xpReward);

      const lessonProgress = await prisma.lessonProgress.findUnique({
        where: { userId_lessonId: { userId, lessonId: lesson!.id } },
      });
      expect(lessonProgress?.status).toBe("completed");

      const courseProgress = await prisma.courseProgress.findFirst({ where: { userId } });
      expect(courseProgress?.completedLessons).toBeGreaterThanOrEqual(1);

      // Completing the same lesson again yields nothing.
      const again = await completeLesson(
        userId,
        lesson!.id,
        { progressPct: 100, completed: true },
        "10.0.2.1"
      );
      expect(again.ok).toBe(true);
      if (again.ok) expect(again.lessonRewarded).toBe(false);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: userId } })).xp).toBe(lesson!.xpReward);
    });
  });

  it("rejects bad progress payloads", async () => {
    await freshUser(async (userId) => {
      const res = await completeLesson(userId, "whatever", { progressPct: 500, completed: true }, "10.0.2.2");
      expect(res.ok).toBe(false);
    });
  });
});