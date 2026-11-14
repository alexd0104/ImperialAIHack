import { expect, test } from "@playwright/test";

test("dev UI kit renders every base component", async ({ page }) => {
  const response = await page.goto("/dev/ui");
  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("heading", { level: 1, name: "memorAI UI kit" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send love" })).toBeVisible();
  await expect(page.getByRole("switch").first()).toBeVisible();

  // Tokens and fonts are wired: primary button uses terracotta and Nunito.
  const primary = page.getByRole("button", { name: "Bring to life" });
  await expect(primary).toHaveCSS("background-color", "rgb(217, 115, 78)");
  const font = await primary.evaluate((el) => getComputedStyle(el).fontFamily);
  expect(font).toMatch(/Nunito/i);

  // House targets meet the 64 px minimum.
  const play = page.getByRole("button", { name: "Play", exact: true });
  const box = await play.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(64);
});
