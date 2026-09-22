import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "DemoPass123!";

export async function login(page: Page, identifier = "demo_user") {
  await page.goto("/login");
  await page.getByLabel("Email or username").fill(identifier);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}