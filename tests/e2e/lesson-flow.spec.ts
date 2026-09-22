import { test, expect } from "@playwright/test";
import { login } from "./support/helpers";
import { prisma } from "./support/db";

test("completes a lesson and awards exactly the lesson XP", async ({ page }) => {
  const lesson = await prisma.lesson.findFirst({ where: { slug: "python-printing" } });
  expect(lesson).toBeTruthy();

  await login(page);
  const before = await prisma.user.findUniqueOrThrow({ where: { username: "demo_user" } });

  await page.goto(`/learn/${lesson!.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(lesson!.title);
  await page.getByRole("button", { name: "Mark lesson complete" }).click();

  await expect(page.getByRole("button", { name: /Completed/ })).toBeVisible();
  await expect(page.getByText(/Lesson complete!/).first()).toBeVisible();

  const after = await prisma.user.findUniqueOrThrow({ where: { username: "demo_user" } });
  expect(after.xp).toBe(before.xp + lesson!.xpReward);
});