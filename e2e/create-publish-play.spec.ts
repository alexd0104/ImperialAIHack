import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

// Q2 smoke: Studio creates a Memory → approves it → publishes it → the House plays a Story.
// In e2e the Studio writes to the offline mock store (STUDIO_MOCK_STORE=true), but generation
// and the House bundle read MongoDB only, so the chain can't be joined end to end yet
// (Request in docs/STATUS.md). The test seeds the scenes the pipeline would have made, and
// plays the House from the demo fixture bundle (same player, same flow).

const DEMO_TOKEN = "e2e-demo";
const mockStore = join(process.env.STORAGE_DIR ?? "storage", "studio-mock");
const id = () => randomBytes(12).toString("hex");

async function login(page: Page) {
  const password = process.env.STUDIO_PASSWORD;
  if (!password) throw new Error("Set a synthetic STUDIO_PASSWORD for browser tests.");
  expect((await page.request.post("/api/auth/login", { data: { password } })).ok()).toBe(true);
}

async function data<T>(response: Promise<{ json(): Promise<unknown> }>): Promise<T> {
  return ((await (await response).json()) as { data: T }).data;
}

async function pngBuffer(page: Page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 600;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No canvas");
    context.fillStyle = "#888";
    context.fillRect(0, 0, 800, 600);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return Buffer.from(base64 ?? "", "base64");
}

test("Q2 create a Memory, approve, publish, then the House plays a Story", async ({ page }) => {
  test.setTimeout(90_000);
  await login(page);

  // Set-up already covered by create-house / create-story specs: done through the API.
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

  // S3: start the Memory and add a photo.
  await page.goto(`/studio/stories/${story.id}/memories/new`);
  await page.getByLabel("Name this Memory").fill("Christmas by the fire");
  await page.getByRole("button", { name: "Start this Memory" }).click();
  await expect(page).toHaveURL(/\/studio\/memories\/[a-f0-9]{24}$/);
  const memoryId = page.url().split("/").at(-1) ?? "";
  const uploaded = page.waitForResponse(
    (response) => response.url().endsWith("/assets") && response.status() === 201,
  );
  await page
    .getByText("Add photos or videos")
    .locator("input[type=file]")
    .setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: await pngBuffer(page) });
  const asset = await data<{ id: string; url: string }>(uploaded);
  await expect(page.getByRole("img", { name: "Photo added to this Memory" })).toBeVisible();

  // S4 → S5: answer a question, then the sheet shows it.
  await page.getByRole("link", { name: "Continue" }).click();
  await page.getByLabel("Who is in the photos?").fill("Mum, Grandad Jim");
  await page.getByRole("button", { name: "Review the Memory sheet" }).click();
  await expect(page.getByRole("heading", { name: "Here is your Memory" })).toBeVisible();
  await expect(page.getByText("Mum, Grandad Jim")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bring to life" })).toBeEnabled();

  // Generation (mock) can't read the offline store: seed the finished scene it would write.
  const sceneId = id();
  const assetPath = decodeURIComponent(asset.url.replace(/^\/api\/files\//, ""));
  await mkdir(join(mockStore, "scenes"), { recursive: true });
  await writeFile(
    join(mockStore, "scenes", `${sceneId}.json`),
    JSON.stringify({
      id: sceneId,
      houseId: house.id,
      memoryId,
      assetId: asset.id,
      order: 0,
      outputs: { restored: assetPath },
      status: "done",
      createdAt: new Date().toISOString(),
    }),
  );

  // S7: one main action approves every scene and moves on to Place.
  await page.goto(`/studio/memories/${memoryId}/review`);
  await page.getByRole("button", { name: "Keep and continue" }).click();
  await expect(page).toHaveURL(/\/place$/);

  // S8: publish.
  await page.getByRole("button", { name: "Send to Frank’s house" }).click();
  await expect(page.getByRole("heading", { name: "Sent with love" })).toBeVisible();

  // B18: add a second Memory to the Story that is already in the House.
  await page.getByRole("link", { name: "Add a Memory to this Story" }).click();
  await page.getByLabel("Name this Memory").fill("The garden");
  await page.getByRole("button", { name: "Start this Memory" }).click();
  await expect(page).toHaveURL(/\/studio\/memories\/[0-9a-f]{24}$/);
  const added = page.url().split("/").pop() ?? "";
  expect(added).not.toBe(memoryId);
  const updated = await page.request.get(`/api/stories/${story.id}`);
  expect((await updated.json()).data.memoryOrder).toEqual([memoryId, added]);

  // House: choose a room → tap the Object → polaroids → the first Memory plays.
  await page.goto(`/house/${DEMO_TOKEN}`);
  await page.getByTestId("room-card").first().click();
  await expect(page.getByTestId("room-scene")).toBeVisible();
  await page.getByTestId("room-object").first().click();
  await expect(page.getByTestId("polaroid").first()).toBeVisible();
  await page.getByTestId("polaroid").first().click();
  await expect(page.getByTestId("memory-player")).toBeVisible();
  // The fixture's first clip is missing on purpose: the still takes its place, never an error.
  // (the next scene is pre-rendered behind it, hence first()).
  await expect(page.getByTestId("scene-still").first()).toBeVisible();
});
