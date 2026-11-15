import { expect, test } from "@playwright/test";

// B18: the Studio home Room picker, with its "+ Add room" card (here: name + description,
// generated in mock mode by the B17 route).
test("Add room from a name and a description shows a new Room card", async ({ page }) => {
  test.setTimeout(60_000);
  const password = process.env.STUDIO_PASSWORD;
  if (!password) throw new Error("Set a synthetic STUDIO_PASSWORD for browser tests.");
  expect((await page.request.post("/api/auth/login", { data: { password } })).ok()).toBe(true);
  const house = (
    (await (
      await page.request.post("/api/houses", { data: { firstName: "Frank", consent: true } })
    ).json()) as { data: { id: string } }
  ).data;

  await page.goto(`/studio?house=${house.id}`);
  await page.getByRole("button", { name: "Add room" }).click();
  // Nothing chosen yet: the form says what is missing instead of sending.
  await page.getByRole("button", { name: "Add the room" }).click();
  await expect(page.getByText("Give the room a name.")).toBeVisible();

  await page.getByLabel("Name", { exact: true }).fill("Mum’s kitchen");
  await page.getByLabel("Or describe the room").fill("A small kitchen with a green table");
  await page.getByRole("button", { name: "Add the room" }).click();
  await expect(page.getByRole("link", { name: "New Story here: Mum’s kitchen" })).toBeVisible({
    timeout: 30_000,
  });
});
