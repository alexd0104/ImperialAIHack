import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiErrorResponse, apiSuccess, House, Memory, Room, Scene, Story } from "@/lib/contracts";
import { getEntity, insertEntity, listEntities, updateEntity } from "./_store";
import { POST as addMemory } from "./[id]/memories/route";
import { POST as publish } from "./[id]/publish/route";

// B18: a family adds a Memory to a Story that already exists (and is already in the House).
const houseId = "a".repeat(24);
const roomId = "b".repeat(24);
const storyId = "c".repeat(24);
const firstId = "d".repeat(24);
const at = "2026-11-15T09:00:00.000Z";

const context = (id: string) => ({ params: Promise.resolve({ id }) });
const post = (body: unknown) =>
  new Request("http://localhost/api/stories/x", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const scene = (id: string, memoryId: string, chosen: boolean) =>
  Scene.parse({
    id,
    houseId,
    memoryId,
    assetId: "e".repeat(24),
    order: 0,
    outputs: { restored: "houses/a/restored.jpg" },
    status: "done",
    ...(chosen && { choice: { use: "still", colour: "bw", restored: true, chosenAt: at } }),
    createdAt: at,
  });

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "memorai-b18-"));
  vi.stubEnv("STORAGE_DIR", directory);
  vi.stubEnv("STUDIO_MOCK_STORE", "true");
  vi.stubEnv("AI_MODE", "mock");
  await insertEntity(
    "houses",
    House.parse({ id: houseId, firstName: "Frank", consentAt: at, createdAt: at }),
  );
  await insertEntity(
    "rooms",
    Room.parse({
      id: roomId,
      houseId,
      name: "Garden",
      source: "style",
      style: "garden",
      backgroundPath: "/rooms/garden.svg",
      slots: [{ id: "bench", x: 0.2, y: 0.6, scale: 0.2, storyId }],
      createdAt: at,
    }),
  );
  // An existing, published Story with one published Memory.
  await insertEntity(
    "stories",
    Story.parse({
      id: storyId,
      houseId,
      roomId,
      slotId: "bench",
      title: "Summers",
      object: { kind: "svg", path: "/objects/flower.svg" },
      memoryOrder: [firstId],
      publishedAt: at,
      createdAt: at,
    }),
  );
  await insertEntity(
    "memories",
    Memory.parse({
      id: firstId,
      houseId,
      storyId,
      title: "The beach",
      status: "published",
      createdAt: at,
    }),
  );
  await insertEntity("scenes", scene("f".repeat(24), firstId, true));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

async function add(title: string) {
  const response = await addMemory(post({ title }), context(storyId));
  expect(response.status).toBe(201);
  return apiSuccess(Memory).parse(await response.json()).data;
}

describe("B18 adding a Memory to an existing Story", () => {
  it("appends a draft Memory after the existing ones, in the same House", async () => {
    const second = await add("  The garden  ");
    expect(second).toMatchObject({ houseId, storyId, title: "The garden", status: "draft" });
    const third = await add("Christmas");
    const story = await getEntity("stories", storyId);
    expect(story?.memoryOrder).toEqual([firstId, second.id, third.id]);
    // Publishing is not undone: the first Memory keeps playing in the House meanwhile.
    expect(story?.publishedAt).toBe(at);
    expect((await getEntity("memories", firstId))?.status).toBe("published");
  });

  it("refuses an empty title and an unknown Story", async () => {
    const empty = await addMemory(post({ title: "   " }), context(storyId));
    expect(empty.status).toBe(422);
    const missing = await addMemory(post({ title: "Lost" }), context("9".repeat(24)));
    expect(ApiErrorResponse.parse(await missing.json()).error.code).toBe("not_found");
    expect(await listEntities("memories", () => true)).toHaveLength(1);
  });

  it("re-publishes the Story once the new Memory is approved", async () => {
    const second = await add("The garden");
    await insertEntity("scenes", scene("1".repeat(24), second.id, false));
    const early = await publish(post({}), context(storyId));
    expect(ApiErrorResponse.parse(await early.json()).error.code).toBe("conflict");

    await updateEntity("scenes", "1".repeat(24), {
      choice: { use: "still", colour: "bw", restored: true, chosenAt: at },
    });
    const response = await publish(post({}), context(storyId));
    expect(response.status).toBe(200);
    expect((await getEntity("memories", second.id))?.status).toBe("published");
  });

  it("does not let an abandoned empty Memory block re-publishing", async () => {
    await add("Started, then left");
    const response = await publish(post({}), context(storyId));
    expect(response.status).toBe(200);
    expect((await getEntity("memories", firstId))?.status).toBe("published");
  });
});
