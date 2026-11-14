import { expect, type Page, test } from "@playwright/test";

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
  await expect(page.locator("form").getByRole("alert")).toBeVisible();
});

async function data<T>(response: Promise<{ json(): Promise<unknown> }>): Promise<T> {
  return ((await (await response).json()) as { data: T }).data;
}

async function seedMemory(page: Page) {
  const password = process.env.STUDIO_PASSWORD;
  if (!password) throw new Error("Set a synthetic STUDIO_PASSWORD for browser tests.");
  expect((await page.request.post("/api/auth/login", { data: { password } })).ok()).toBe(true);
  const house = await data<{ id: string }>(
    page.request.post("/api/houses", { data: { firstName: "Frank", consent: true } }),
  );
  const room = await data<{ id: string; slots: { id: string }[] }>(
    page.request.post(`/api/houses/${house.id}/rooms`, {
      data: { name: "Garden", source: "style", style: "garden" },
    }),
  );
  const story = await data<{ id: string }>(
    page.request.post(`/api/rooms/${room.id}/stories`, {
      data: {
        slotId: room.slots[0]?.id,
        title: "Summers in the garden",
        object: { kind: "library", name: "flower" },
      },
    }),
  );
  const memory = await data<{ id: string }>(
    page.request.post(`/api/stories/${story.id}/memories`, {
      data: { title: "Christmas by the fire" },
      headers: { "Idempotency-Key": crypto.randomUUID() },
    }),
  );
  return { house: house.id, story: story.id, memory: memory.id };
}

const nav = (page: Page) => page.getByRole("navigation", { name: "Studio" });

test("B12 header, back links step by step, and sign out", async ({ page }) => {
  const ids = await seedMemory(page);
  const m = `/studio/memories/${ids.memory}`;
  await page.goto(`/studio?house=${ids.house}`);
  await expect(nav(page).getByRole("link", { name: "Hear back", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // Home lists existing Stories, not only "create". (The offline mock store returns no
  // Stories in HouseDetail, so only the section is checked here.)
  await expect(page.getByRole("heading", { name: "Your Stories" })).toBeVisible();

  // Deep link: the header still reaches home.
  await page.goto(`${m}/review`);
  await expect(page.getByText("Step 4 of 5")).toBeVisible();
  await expect(nav(page).getByRole("link", { name: "Create" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await nav(page).getByRole("link", { name: "Hear back", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/studio\\?house=${ids.house}$`));

  // Back, step by step, from the deepest screen to home.
  await page.goto(`${m}/review`);
  const steps: [string, RegExp][] = [
    ["Back to the Memory sheet", new RegExp(`${m}/sheet$`)],
    ["Back to questions", new RegExp(`${m}/questions$`)],
    ["Back to photos", new RegExp(`${m}$`)],
    ["Back to the Story", new RegExp(`/studio/stories/${ids.story}/place$`)],
    ["Back to Hear back", new RegExp(`/studio\\?house=${ids.house}$`)],
  ];
  for (const [label, url] of steps) {
    await page.getByRole("link", { name: label }).click();
    await expect(page).toHaveURL(url);
  }

  // Sign out lands on sign-in, and the Studio is closed again.
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/studio\/login$/);
  await page.goto("/studio");
  await expect(page).toHaveURL(/\/studio\/login\?next=%2Fstudio$/);
});

test("B12 every Studio screen has the header and back link at phone and desktop widths", async ({
  page,
}) => {
  const ids = await seedMemory(page);
  const m = `/studio/memories/${ids.memory}`;
  const routes: [string, boolean][] = [
    [`/studio?house=${ids.house}`, false],
    ["/studio/house/new", true],
    ["/studio/stories/new", true],
    [`/studio/stories/${ids.story}/memories/new`, true],
    [m, true],
    [`${m}/questions`, true],
    [`${m}/sheet`, true],
    [`${m}/review`, true],
    [`/studio/stories/${ids.story}/place`, true],
    [`/studio/care?house=${ids.house}`, true],
  ];
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    for (const [route, hasBack] of routes) {
      await page.goto(route);
      await expect(nav(page), route).toBeVisible();
      // Sign out is on screen (not scrolled away) at every width.
      await expect(page.getByRole("button", { name: "Sign out" }), route).toBeInViewport();
      await expect(page.getByRole("link", { name: /^Back to / }), route).toHaveCount(
        hasBack ? 1 : 0,
      );
      // No sideways page scroll at phone width; the nav row scrolls on its own.
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        route,
      ).toBe(true);
      // Every nav target is at least 44 px tall.
      for (const box of await page
        .locator("header a, header button")
        .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height)))
        expect(box).toBeGreaterThanOrEqual(44);
    }
  }
});
