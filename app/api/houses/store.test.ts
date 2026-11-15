import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiErrorResponse, apiSuccess, House, Room } from "@/lib/contracts";
import { db } from "@/lib/db";
import { POST as postRoom } from "./[id]/rooms/route";
import { POST as postHouse } from "./route";

const key = "c8edb664-5601-4f0c-8973-bd2e9205144c";
function request(body: unknown) {
  return new Request("http://localhost/api/houses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
}
const input = { firstName: "Frank", consent: true };

beforeEach(() => {
  vi.stubEnv("STUDIO_MOCK_STORE", "false");
  vi.stubEnv("AI_MODE", "mock");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("S1 integration with F4 collections", () => {
  it("uses MongoDB even in AI mock mode, with ObjectId-compatible ids and private tokens", async () => {
    const insert = vi
      .spyOn(db.houses, "insert")
      .mockImplementation(async (value) => House.parse(value));
    const response = await postHouse(request(input));
    expect(response.status).toBe(201);
    const result = apiSuccess(House).parse(await response.json()).data;
    expect(result.id).toMatch(/^[a-f0-9]{24}$/);
    expect(result.token).toBeUndefined();
    const written = House.parse(insert.mock.calls[0][0]);
    expect(written.token).toMatch(/^[\w-]{43}$/);
    expect(written.consentAt).toBe(written.createdAt);
    expect(written.id).toBe(result.id);
  });

  it("recovers a duplicate-key insert from MongoDB without replacing the existing House", async () => {
    let stored: House | undefined;
    vi.spyOn(db.houses, "insert").mockImplementation(async (value) => {
      if (stored) throw Object.assign(new Error("Duplicate"), { code: 11000 });
      stored = House.parse(value);
      return stored;
    });
    const find = vi.spyOn(db.houses, "findById").mockImplementation(async () => stored ?? null);
    const first = await postHouse(request(input));
    const second = await postHouse(request(input));
    expect(second.status).toBe(201);
    expect(await first.json()).toEqual(await second.json());
    expect(find).toHaveBeenCalledWith(stored?.id);
    expect((await postHouse(request({ ...input, firstName: "Mary" }))).status).toBe(409);
  });

  it("looks up the parent House and writes the Room through the shared collections", async () => {
    const house = House.parse({
      id: "a".repeat(24),
      firstName: "Frank",
      consentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    const find = vi.spyOn(db.houses, "findById").mockResolvedValue(house);
    const insert = vi
      .spyOn(db.rooms, "insert")
      .mockImplementation(async (value) => Room.parse(value));
    const response = await postRoom(
      request({ name: "Kitchen", source: "style", style: "kitchen" }),
      { params: Promise.resolve({ id: house.id }) },
    );
    expect(response.status).toBe(201);
    const result = apiSuccess(Room).parse(await response.json()).data;
    expect(find).toHaveBeenCalledWith(house.id);
    expect(insert).toHaveBeenCalledWith(result);
    expect(result.houseId).toBe(house.id);
    expect(result.slots.every((slot) => !slot.storyId)).toBe(true);
  });

  it("does not switch to offline storage when MongoDB fails", async () => {
    vi.spyOn(db.houses, "insert").mockRejectedValue(new Error("Synthetic connection failure"));
    const response = await postHouse(request(input));
    expect(response.status).toBe(500);
    expect(ApiErrorResponse.parse(await response.json()).error.code).toBe("internal");
  });
});
