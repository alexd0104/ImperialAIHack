import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as upload } from "@/app/api/houses/[id]/assets/route";
import { POST as create } from "@/app/api/rooms/[id]/stories/route";
import {
  ApiErrorResponse,
  AssetView,
  apiSuccess,
  House,
  JobView,
  Room,
  Story,
} from "@/lib/contracts";
import { db } from "@/lib/db";
import { getEntity, insertEntity, replaceEntity } from "./_store";
import { GET as progress } from "./[id]/object-job/route";

const houseId = "a".repeat(24);
const roomId = "b".repeat(24);
const timestamp = "2026-11-14T12:00:00.000Z";
const room = Room.parse({
  id: roomId,
  houseId,
  name: "Garden",
  source: "style",
  style: "garden",
  backgroundPath: "/rooms/garden.svg",
  slots: [{ id: "bench", x: 0.2, y: 0.6, scale: 0.2 }],
  createdAt: timestamp,
});
let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "memorai-s2-"));
  vi.stubEnv("STORAGE_DIR", directory);
  vi.stubEnv("STUDIO_MOCK_STORE", "true");
  vi.stubEnv("AI_MODE", "mock");
  vi.stubEnv("MOCK_FAIL_RATE", "0");
  await insertEntity(
    "houses",
    House.parse({ id: houseId, firstName: "Frank", consentAt: timestamp, createdAt: timestamp }),
  );
  await insertEntity("rooms", room);
});
afterEach(async () => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}
function request(body: unknown, key = randomUUID()) {
  return new Request("http://localhost/api/rooms/room/stories", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const library = { title: "Summers", slotId: "bench", object: { kind: "library", name: "flower" } };
async function photo(targetHouse = houseId) {
  const data = new FormData();
  data.append(
    "file",
    new Blob([await readFile("mocks/media/photo.jpg")], { type: "image/jpeg" }),
    "object.jpg",
  );
  return upload(
    new Request("http://localhost/api/houses/house/assets", { method: "POST", body: data }),
    context(targetHouse),
  );
}

describe("S2 creation and mock progression", () => {
  it("creates an unpublished library Story without reserving the provisional Slot", async () => {
    const response = await create(request(library), context(roomId));
    expect(response.status).toBe(201);
    const story = apiSuccess(Story).parse(await response.json()).data;
    expect(story.object).toEqual({ kind: "svg", path: "flower" });
    expect(story.slotId).toBe("bench");
    expect(story.publishedAt).toBeUndefined();
    expect((await getEntity("rooms", roomId))?.slots[0].storyId).toBeUndefined();
  });
  it.each([
    {},
    "not json",
    { ...library, title: " " },
    { ...library, title: "x".repeat(81) },
    { ...library, object: { kind: "library", name: "unknown" } },
  ])("rejects invalid input %j", async (body) => {
    const response = await create(request(body), context(roomId));
    expect(response.status).toBe(422);
    ApiErrorResponse.parse(await response.json());
  });
  it("rejects missing Rooms and invalid or occupied Slots", async () => {
    expect((await create(request(library), context("c".repeat(24)))).status).toBe(404);
    expect((await create(request({ ...library, slotId: "missing" }), context(roomId))).status).toBe(
      409,
    );
    await replaceEntity("rooms", {
      ...room,
      slots: room.slots.map((slot) => ({ ...slot, storyId: "published-story" })),
    });
    expect((await create(request(library), context(roomId))).status).toBe(409);
  });
  it("retries concurrent submissions without duplicates and refuses changed input", async () => {
    const key = randomUUID();
    const responses = await Promise.all([
      create(request(library, key), context(roomId)),
      create(request(library, key), context(roomId)),
    ]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(await responses[0].json()).toEqual(await responses[1].json());
    expect(await readdir(join(directory, "studio-mock/stories"))).toHaveLength(1);
    expect(
      (await create(request({ ...library, title: "Changed" }, key), context(roomId))).status,
    ).toBe(409);
  });
  it("stores a House-scoped photo and returns only AssetView fields", async () => {
    const response = await photo();
    expect(response.status).toBe(201);
    const json = await response.json();
    const asset = apiSuccess(AssetView).parse(json).data;
    expect(json.data.path).toBeUndefined();
    expect(json.data.falUrl).toBeUndefined();
    expect(asset.url).toContain(`/api/files/${houseId}/objects/`);
    expect(asset.memoryId).toBeUndefined();
    expect((await getEntity("assets", asset.id))?.houseId).toBe(houseId);
  });
  it("rejects bad content, oversized requests, and photos from another House", async () => {
    const data = new FormData();
    data.append("file", new Blob(["not jpeg"], { type: "image/jpeg" }), "fake.jpg");
    expect(
      (
        await upload(
          new Request("http://localhost/upload", { method: "POST", body: data }),
          context(houseId),
        )
      ).status,
    ).toBe(422);
    expect(
      (
        await upload(
          new Request("http://localhost/upload", {
            method: "POST",
            headers: { "Content-Length": "20000000" },
            body: "x",
          }),
          context(houseId),
        )
      ).status,
    ).toBe(413);
    const asset = apiSuccess(AssetView).parse(await (await photo()).json()).data;
    const stored = await getEntity("assets", asset.id);
    if (!stored) throw new Error("Missing fixture");
    await replaceEntity("assets", { ...stored, houseId: "c".repeat(24) });
    expect(
      (
        await create(
          request({ ...library, object: { kind: "photo", assetId: asset.id } }),
          context(roomId),
        )
      ).status,
    ).toBe(422);
  });
  it.each([false, true])(
    "persists mock progress with fallback=%s and no publication",
    async (fallback) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(timestamp));
      vi.stubEnv("MOCK_FAIL_RATE", fallback ? "1" : "0");
      const asset = apiSuccess(AssetView).parse(await (await photo()).json()).data;
      const story = apiSuccess(Story).parse(
        await (
          await create(
            request({ ...library, object: { kind: "photo", assetId: asset.id } }),
            context(roomId),
          )
        ).json(),
      ).data;
      expect(story.object.jobId).toBeTruthy();
      const job = await getEntity("jobs", story.object.jobId ?? "");
      expect(job?.lockedUntil).toBe("9999-12-31T23:59:59.999Z");
      const initial = await (
        await progress(new Request("http://localhost/job"), context(story.id))
      ).json();
      expect(apiSuccess(JobView).parse(initial).data.status).toBe("running");
      expect(initial.data.falKeyLabel).toBeUndefined();
      expect(initial.data.steps[0].output).toBeUndefined();
      vi.setSystemTime(new Date(Date.parse(timestamp) + 4000));
      const final = apiSuccess(JobView).parse(
        await (await progress(new Request("http://localhost/job"), context(story.id))).json(),
      ).data;
      expect(final.status).toBe(fallback ? "fallback" : "done");
      const saved = await getEntity("stories", story.id);
      expect(saved?.object.kind).toBe(fallback ? "svg" : "glb");
      expect(saved?.publishedAt).toBeUndefined();
      if (!fallback && saved)
        expect((await readFile(join(directory, saved.object.path))).subarray(0, 4).toString()).toBe(
          "glTF",
        );
      const again = apiSuccess(JobView).parse(
        await (await progress(new Request("http://localhost/job"), context(story.id))).json(),
      ).data;
      expect(again).toEqual(final);
    },
  );
  it("uses F4 collections by default instead of silently changing stores", async () => {
    vi.stubEnv("STUDIO_MOCK_STORE", "false");
    const find = vi.spyOn(db.rooms, "findById").mockResolvedValue(room);
    expect(await getEntity("rooms", roomId)).toEqual(room);
    expect(find).toHaveBeenCalledWith(roomId);
    find.mockRejectedValue(new Error("Synthetic DB failure"));
    expect((await create(request(library), context(roomId))).status).toBe(500);
  });
});
