import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Asset, Memory, Room, Scene, Story } from "@/lib/contracts";

vi.mock("server-only", () => ({}));

import { createPhotoRoom } from "@/app/api/houses/_room-ops";
import { getEntity, insertEntity } from "@/app/api/stories/_store";
import { saveFile } from "@/lib/storage";
import { DELETE, PATCH } from "./[id]/route";

const hex = (n: number) => n.toString(16).padStart(24, "0");
const house = hex(1);
const now = new Date().toISOString();
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "memorai-s11-"));
  vi.stubEnv("STORAGE_DIR", directory);
  vi.stubEnv("AI_MODE", "mock");
  vi.stubEnv("STUDIO_MOCK_STORE", "true");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

async function photoAsset(id: string) {
  const bytes = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#aa8866" },
  })
    .jpeg()
    .toBuffer();
  const saved = await saveFile(house, `objects/${id}.jpg`, bytes);
  const asset = Asset.parse({
    ...saved,
    id,
    houseId: house,
    kind: "photo",
    mime: "image/jpeg",
    createdAt: now,
  });
  await insertEntity("assets", asset);
  return asset;
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const send = (method: string, body?: unknown) =>
  new Request("http://localhost/api/rooms/x", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

async function styleRoom(id: string) {
  const room = Room.parse({
    id,
    houseId: house,
    name: "Garden",
    source: "style",
    style: "garden",
    backgroundPath: "/rooms/garden.svg",
    slots: [],
    createdAt: now,
  });
  await insertEntity("rooms", room);
  return room;
}

describe("room management (S11)", () => {
  it("renames and switches to a style background", async () => {
    const room = await styleRoom(hex(10));
    const res = await PATCH(
      send("PATCH", { name: " Den ", background: { kind: "style", style: "kitchen" } }),
      ctx(room.id),
    );
    expect(res.status).toBe(200);
    const saved = await getEntity("rooms", room.id);
    expect(saved?.name).toBe("Den");
    expect(saved?.style).toBe("kitchen");
    expect(saved?.background).toEqual({ kind: "style", style: "kitchen" });
  });

  it("swaps in a cleaned photo, and keeps the old background if the photo is missing", async () => {
    const room = await styleRoom(hex(11));
    const missing = await PATCH(
      send("PATCH", { background: { kind: "photo", assetId: hex(99) } }),
      ctx(room.id),
    );
    expect(missing.status).toBe(404);
    expect((await getEntity("rooms", room.id))?.backgroundPath).toBe("/rooms/garden.svg");

    const asset = await photoAsset(hex(20));
    const res = await PATCH(
      send("PATCH", { background: { kind: "photo", assetId: asset.id } }),
      ctx(room.id),
    );
    expect(res.status).toBe(200);
    const saved = await getEntity("rooms", room.id);
    expect(saved?.source).toBe("photo");
    expect(saved?.backgroundPath).toMatch(/^[a-f0-9]{24}\/rooms\//);
    expect((await stat(join(directory, saved?.backgroundPath ?? ""))).size).toBeGreaterThan(0);
  });

  it("creates a photo room from an uploaded photo", async () => {
    const asset = await photoAsset(hex(21));
    const room = await createPhotoRoom(hex(12), house, "Study", asset.id);
    expect(room?.source).toBe("photo");
    expect(room?.slots.length).toBeGreaterThan(0);
  });

  it("delete cascades Stories, Memories, Scenes, Assets and files", async () => {
    const room = await styleRoom(hex(13));
    const other = await styleRoom(hex(14));
    const photo = await photoAsset(hex(30));
    const story = Story.parse({
      id: hex(40),
      houseId: house,
      roomId: room.id,
      slotId: "bench",
      title: "Bench",
      object: { kind: "svg", path: "camera" },
      createdAt: now,
    });
    const keep = Story.parse({ ...story, id: hex(41), roomId: other.id });
    const memory = Memory.parse({
      id: hex(50),
      houseId: house,
      storyId: story.id,
      title: "Summer",
      status: "draft",
      createdAt: now,
    });
    const scene = Scene.parse({
      id: hex(60),
      houseId: house,
      memoryId: memory.id,
      assetId: photo.id,
      order: 0,
      status: "pending",
      createdAt: now,
    });
    const own = await saveFile(house, "photos/memory.jpg", new Uint8Array([1, 2, 3]));
    const memoryAsset = Asset.parse({ ...photo, ...own, id: hex(31), memoryId: memory.id });
    await insertEntity("stories", story);
    await insertEntity("stories", keep);
    await insertEntity("memories", memory);
    await insertEntity("scenes", scene);
    await insertEntity("assets", memoryAsset);

    const res = await DELETE(send("DELETE"), ctx(room.id));
    expect(res.status).toBe(200);
    expect(await getEntity("rooms", room.id)).toBeNull();
    expect(await getEntity("stories", story.id)).toBeNull();
    expect(await getEntity("memories", memory.id)).toBeNull();
    expect(await getEntity("scenes", scene.id)).toBeNull();
    expect(await getEntity("assets", memoryAsset.id)).toBeNull();
    // The other Room and its Story are untouched; the asset file of the memory is gone.
    expect(await getEntity("rooms", other.id)).not.toBeNull();
    expect(await getEntity("stories", keep.id)).not.toBeNull();
    expect(await readdir(join(directory, house, "objects"))).toEqual([`${photo.id}.jpg`]);
    expect(await readdir(join(directory, house, "photos"))).toEqual([]);
  });
});
