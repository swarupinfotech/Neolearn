import { test, expect } from "@playwright/test";
import { DEMO_PASSWORD } from "./support/helpers";

test("logs in an existing demo user and lands on the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill("demo_user");
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
});

test("rejects a bad password", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill("demo_user");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Log in" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
});

test("registers a new account and lands on the dashboard", async ({ page }) => {
  const uniq = `e2e${Date.now().toString().slice(-8)}`;
  await page.goto("/signup");
  await page.getByLabel("Email").fill(`${uniq}@neolearn.test`);
  await page.getByLabel("Username").fill(uniq);
  await page.getByLabel("Display name").fill("E2E Runner");
  await page.getByLabel("Password", { exact: true }).fill(DEMO_PASSWORD);
  await page.getByLabel("Confirm password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/dashboard/);
});