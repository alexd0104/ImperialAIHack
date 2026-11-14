import { expect, test } from "@playwright/test";

test("a signed-out visit to the Studio lands on the sign-in page", async ({ page }) => {
  await page.goto("/studio/new");
  await expect(page).toHaveURL(/\/studio\/login\?next=%2Fstudio%2Fnew$/);
  await expect(page.getByRole("heading", { level: 1, name: "Family Studio" })).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("a wrong password shows a gentle message", async ({ page }) => {
  await page.goto("/studio/login");
  await page.getByLabel("Password").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
});
