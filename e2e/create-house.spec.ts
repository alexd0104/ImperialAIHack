import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const password = process.env.STUDIO_PASSWORD;
  if (!password) throw new Error("Set a synthetic STUDIO_PASSWORD for S1 browser tests.");
  const login = await page.request.post("/api/auth/login", { data: { password } });
  expect(login.ok()).toBe(true);
});

test("consent, autosave, keyboard room selection and real mock API creation", async ({ page }) => {
  await page.goto("/studio/house/new");
  await expect(page.getByRole("button", { name: "Create the House", exact: true })).toBeDisabled();
  await page.getByLabel("Their first name").fill("Frank");
  await page.getByRole("radio", { name: "Garden", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Kitchen", exact: true })).toBeChecked();
  await page.getByRole("checkbox").check();
  await page.reload();
  await expect(page.getByLabel("Their first name")).toHaveValue("Frank");
  await expect(page.getByRole("radio", { name: "Kitchen", exact: true })).toBeChecked();
  await expect(page.getByRole("checkbox")).toBeChecked();
  await expect(page.getByRole("button", { name: "Create the House", exact: true })).toBeInViewport({
    ratio: 1,
  });
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.getByRole("button", { name: "Create the House", exact: true }).click();
  await expect(page.getByRole("heading", { name: "The House is ready" })).toBeVisible();
  await expect(page.getByText("Frank · Kitchen", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "The House is ready" })).toBeVisible();
});

test("a lost Room response can be retried without creating another House or Room", async ({
  page,
}) => {
  await page.goto("/studio/house/new");
  await page.getByLabel("Their first name").fill("Mary");
  await page.getByRole("radio", { name: "Living room", exact: true }).check();
  await page.getByRole("checkbox").check();
  let firstRoomId: string | undefined;
  const houseIds: string[] = [];
  page.on("response", async (response) => {
    if (response.url().endsWith("/api/houses") && response.status() === 201) {
      houseIds.push((await response.json()).data.id);
    }
  });
  await page.route(
    "**/api/houses/*/rooms",
    async (route) => {
      const response = await route.fetch();
      firstRoomId = (await response.json()).data.id;
      await route.abort("failed");
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Create the House", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Your choices are still here" }),
  ).toBeVisible();
  await page.reload();
  const roomResponse = page.waitForResponse(
    (response) => response.url().includes("/rooms") && response.status() === 201,
  );
  await page.getByRole("button", { name: "Create the House", exact: true }).click();
  expect((await (await roomResponse).json()).data.id).toBe(firstRoomId);
  await expect(page.getByRole("heading", { name: "The House is ready" })).toBeVisible();
  expect(houseIds).toHaveLength(2);
  expect(new Set(houseIds).size).toBe(1);
});

test("phone layout, empty-name validation and expired-session recovery", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio/house/new");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the House", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Enter a first name" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByLabel("Their first name").fill("Frank");
  await page.context().clearCookies();
  await page.getByRole("button", { name: "Create the House", exact: true }).click();
  await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
  await page.getByRole("link", { name: "Sign in again" }).click();
  await expect(page.getByLabel("Password")).toBeVisible();
  await page.getByLabel("Password").fill(process.env.STUDIO_PASSWORD ?? "");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByLabel("Their first name")).toHaveValue("Frank");
});

test("both creation endpoints require a session", async ({ playwright, baseURL }) => {
  const request = await playwright.request.newContext({ baseURL });
  for (const path of ["/api/houses", "/api/houses/missing/rooms"]) {
    const response = await request.post(path, { data: {} });
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe("unauthorized");
  }
  await request.dispose();
});
