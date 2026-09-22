import { test, expect } from "@playwright/test";
import { login } from "./support/helpers";
import { prisma } from "./support/db";

test("answers every quiz question correctly and passes", async ({ page }) => {
  const quiz = await prisma.quiz.findUnique({
    where: { slug: "js-quiz" },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  expect(quiz).toBeTruthy();
  expect(quiz!.questions.length).toBeGreaterThan(0);

  await login(page);
  await page.goto(`/quiz/${quiz!.id}`);
  await expect(page.getByRole("button", { name: "Submit answers" })).toBeVisible();

  let textInputIndex = 0;
  let choiceGroupIndex = 0;
  for (const q of quiz!.questions) {
    if (q.type === "MCQ" || q.type === "CORRECT" || q.type === "TRUE_FALSE") {
      const idx = Number(Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer);
      await page.getByRole("radiogroup").nth(choiceGroupIndex).getByRole("radio").nth(idx).click();
      choiceGroupIndex += 1;
    } else if (q.type === "FILL" || q.type === "OUTPUT") {
      const value = String(Array.isArray(q.correctAnswer) ? q.correctAnswer[0] : q.correctAnswer);
      await page.getByLabel("Your answer").nth(textInputIndex).fill(value);
      textInputIndex += 1;
    }
  }

  // Server flags implausibly fast submissions (<500ms/question), so pause.
  await page.waitForTimeout(3500);
  await page.getByRole("button", { name: "Submit answers" }).click();

  await expect(page.getByText("Quiz passed!")).toBeVisible();
  await expect(page.getByText("+20 XP earned", { exact: true })).toBeVisible();
});