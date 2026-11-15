import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiErrorResponse, apiSuccess, House, Room } from "@/lib/contracts";

vi.mock("server-only", () => ({}));

import { findMockHouse } from "./_mock-store";
import { POST as createRoom } from "./[id]/rooms/route";
import { POST as createHouse } from "./route";

let directory: string;
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "memorai-s1-"));
  vi.stubEnv("STORAGE_DIR", directory);
  vi.stubEnv("AI_MODE", "mock");
  vi.stubEnv("STUDIO_MOCK_STORE", "true");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

function request(body: unknown, key?: string) {
  return new Request("http://localhost/api/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { "Idempotency-Key": key } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
async function house(key?: string) {
  const response = await createHouse(request({ firstName: " Frank ", consent: true }, key));
  expect(response.status).toBe(201);
  return apiSuccess(House).parse(await response.json()).data;
}
const roomInput = { name: "Garden", source: "style", style: "garden" };
function room(houseId: string, body: unknown = roomInput, key?: string) {
  return createRoom(request(body, key), { params: Promise.resolve({ id: houseId }) });
}

describe("S1 House and style Room routes", () => {
  it("stores consent time and a private token, but never returns the token", async () => {
    const created = await house();
    expect(created.firstName).toBe("Frank");
    expect(created.token).toBeUndefined();
    const stored = await findMockHouse(created.id);
    expect(stored?.token).toMatch(/^[\w-]{43}$/);
    expect(stored?.consentAt).toBe(created.createdAt);
    expect(stored?.dontShow).toEqual([]);
  });

  it.each([
    {},
    { firstName: "Frank" },
    { firstName: "Frank", consent: false },
    { firstName: "Frank", consent: "true" },
    { firstName: " ", consent: true },
    { firstName: "x".repeat(41), consent: true },
    "invalid json",
  ])("rejects invalid House %j without writing", async (body) => {
    const response = await createHouse(request(body));
    expect(response.status).toBe(422);
    expect(ApiErrorResponse.parse(await response.json()).error.code).toBe("validation_failed");
    expect(await readdir(directory)).toEqual([]);
  });

  it.each(["garden", "kitchen", "living"])(
    "creates a %s Room with empty fixed Slots and an exported SVG",
    async (style) => {
      const created = await house();
      const response = await room(created.id, { ...roomInput, style });
      expect(response.status).toBe(201);
      const result = apiSuccess(Room).parse(await response.json()).data;
      expect(result.houseId).toBe(created.id);
      expect(result.backgroundPath).toBe(
        `/rooms/${style === "living" ? "living-room.jpg" : `${style}.svg`}`,
      );
      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.slots.every((slot) => slot.storyId === undefined)).toBe(true);
      expect(result.backgroundJobId).toBeUndefined();
    },
  );

  it("requires an existing House and rejects unsafe ids", async () => {
    for (const id of [randomUUID(), "../../outside", ""]) {
      const response = await room(id);
      expect(response.status).toBe(id ? 404 : 422);
      ApiErrorResponse.parse(await response.json());
    }
    expect(await readdir(directory)).toEqual([]);
  });

  it.each([
    { name: "Photo", source: "photo" },
    { ...roomInput, style: "bedroom" },
    { ...roomInput, name: " " },
    "invalid json",
  ])("rejects unsupported Room %j", async (body) => {
    const created = await house();
    const response = await room(created.id, body);
    expect(response.status).toBe(422);
    ApiErrorResponse.parse(await response.json());
    expect(await readdir(join(directory, "studio-mock"))).toEqual(["houses"]);
  });

  it("replays concurrent and repeated submissions without duplicate Houses or Rooms", async () => {
    const houseKey = randomUUID();
    const houses = await Promise.all([house(houseKey), house(houseKey)]);
    expect(houses[0]).toEqual(houses[1]);
    const roomKey = randomUUID();
    const responses = await Promise.all([
      room(houses[0].id, roomInput, roomKey),
      room(houses[0].id, roomInput, roomKey),
    ]);
    expect(await responses[0].json()).toEqual(await responses[1].json());
    expect(await readdir(join(directory, "studio-mock", "houses"))).toHaveLength(1);
    expect(await readdir(join(directory, "studio-mock", "rooms"))).toHaveLength(1);
    const conflict = await createHouse(request({ firstName: "Mary", consent: true }, houseKey));
    expect(conflict.status).toBe(409);
    expect((await findMockHouse(houses[0].id))?.firstName).toBe("Frank");
    expect((await room(houses[0].id, { ...roomInput, style: "living" }, roomKey)).status).toBe(409);
  });

  it("rejects an invalid idempotency key and never activates the mock adapter in another mode", async () => {
    expect(
      (await createHouse(request({ firstName: "Frank", consent: true }, "../bad"))).status,
    ).toBe(422);
    vi.stubEnv("AI_MODE", "disabled");
    const response = await createHouse(request({ firstName: "Frank", consent: true }));
    expect(response.status).toBe(500);
    ApiErrorResponse.parse(await response.json());
    expect(await readdir(directory)).toEqual([]);
  });
});
