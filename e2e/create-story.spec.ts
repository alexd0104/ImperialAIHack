import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const password = process.env.STUDIO_PASSWORD;
  if (!password) throw new Error("Set a synthetic STUDIO_PASSWORD for browser tests.");
  expect((await page.request.post("/api/auth/login", { data: { password } })).ok()).toBe(true);
});

test("S1 links to S2, library choices autosave, and the provisional Slot stays unreserved", async ({
  page,
}) => {
  await page.goto("/studio/house/new");
  await page.getByLabel("Their first name").fill("Frank");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create the House", exact: true }).click();
  await page.getByRole("link", { name: "Choose an Object", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/stories\/new\?roomId=/);
  await page.getByRole("radio", { name: "Flower", exact: true }).check();
  await page.getByLabel("Name this Story").fill("Summers in the garden");
  await page.reload();
  await expect(page.getByLabel("Name this Story")).toHaveValue("Summers in the garden");
  await expect(page.getByRole("radio", { name: "Flower", exact: true })).toBeChecked();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith("/stories") && response.status() === 201,
  );
  await page.getByRole("button", { name: "Create the Story", exact: true }).click();
  const story = (await (await responsePromise).json()).data;
  await expect(
    page.getByRole("heading", { name: "Your Story is ready for Memories" }),
  ).toBeVisible();
  expect(story.publishedAt).toBeUndefined();
  expect(story.object.path).toBe("flower");
  const room = (await (await page.request.get(`/api/rooms/${story.roomId}`)).json()).data;
  expect(
    room.slots.find((slot: { id: string }) => slot.id === story.slotId).storyId,
  ).toBeUndefined();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your Story is ready for Memories" }),
  ).toBeVisible();
});

test("phone photo upload resizes, survives reload and progresses to a stored mock Object", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const house = (
    await (
      await page.request.post("/api/houses", { data: { firstName: "Mary", consent: true } })
    ).json()
  ).data;
  const room = (
    await (
      await page.request.post(`/api/houses/${house.id}/rooms`, {
        data: { name: "Kitchen", source: "style", style: "kitchen" },
      })
    ).json()
  ).data;
  await page.goto(`/studio/stories/new?roomId=${room.id}`);
  await page.getByRole("radio", { name: "Use your own photo", exact: true }).check();
  const image = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 3000;
    canvas.height = 1500;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas");
    context.fillStyle = "white";
    context.fillRect(0, 0, 3000, 1500);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const uploaded = page.waitForResponse(
    (response) => response.url().endsWith("/assets") && response.status() === 201,
  );
  await page
    .getByLabel("Photo of your Object", { exact: true })
    .setInputFiles({
      name: "sample.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  const asset = (await (await uploaded).json()).data;
  const dimensions = await page.evaluate(async (url) => {
    const bitmap = await createImageBitmap(await (await fetch(url)).blob());
    const result = [bitmap.width, bitmap.height];
    bitmap.close();
    return result;
  }, asset.url);
  expect(dimensions).toEqual([2048, 1024]);
  expect(asset.mime).toBe("image/jpeg");
  await page.getByLabel("Name this Story").fill("Tea with family");
  await page.reload();
  await expect(page.getByText("Photo saved. You can leave this page and come back.")).toBeVisible();
  await expect(page.getByLabel("Name this Story")).toHaveValue("Tea with family");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const created = page.waitForResponse(
    (response) => response.url().endsWith("/stories") && response.status() === 201,
  );
  await page.getByRole("button", { name: "Create the Story", exact: true }).click();
  const story = (await (await created).json()).data;
  await expect(page.getByRole("heading", { name: "Preparing your Object" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your Story is ready for Memories" })).toBeVisible(
    { timeout: 15000 },
  );
  const stored = (await (await page.request.get(`/api/stories/${story.id}`)).json()).data;
  expect(stored.object.kind).toBe("glb");
  expect(stored.publishedAt).toBeUndefined();
  expect((await page.request.get(`/api/files/${stored.object.path}`)).ok()).toBe(true);
});

test("lost creation response retries the same Story instead of creating another", async ({
  page,
}) => {
  const house = (
    await (
      await page.request.post("/api/houses", { data: { firstName: "Frank", consent: true } })
    ).json()
  ).data;
  const room = (
    await (
      await page.request.post(`/api/houses/${house.id}/rooms`, {
        data: { name: "Garden", source: "style", style: "garden" },
      })
    ).json()
  ).data;
  await page.goto(`/studio/stories/new?roomId=${room.id}`);
  await page.getByLabel("Name this Story").fill("Sunday mornings");
  let firstId: string | undefined;
  await page.route(
    "**/api/rooms/*/stories",
    async (route) => {
      const response = await route.fetch();
      firstId = (await response.json()).data.id;
      await route.abort("failed");
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Create the Story", exact: true }).click();
  await expect(
    page.locator("form").getByRole("button", { name: "Create another Story" }),
  ).toBeVisible();
  await page.reload();
  const retry = page.waitForResponse(
    (response) => response.url().endsWith("/stories") && response.status() === 201,
  );
  await page.getByRole("button", { name: "Create the Story", exact: true }).click();
  expect((await (await retry).json()).data.id).toBe(firstId);
  await expect(
    page.getByRole("heading", { name: "Your Story is ready for Memories" }),
  ).toBeVisible();
});
