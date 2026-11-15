import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { House, Room } from "@/lib/contracts";

vi.mock("server-only", () => ({}));
const generate = vi.fn();
vi.mock("@/lib/ai/room-generate", async (original) => ({
  ...(await original<typeof import("@/lib/ai/room-generate")>()),
  generateRoomPhoto: (description: string) => generate(description),
}));

import { insertMockHouse } from "@/app/api/houses/_mock-store";
import { getEntity } from "@/app/api/stories/_store";
import { POST } from "./route";

const hex = (n: number) => n.toString(16).padStart(24, "0");
const house = hex(1);
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "memorai-b16-"));
  vi.stubEnv("STORAGE_DIR", directory);
  vi.stubEnv("AI_MODE", "mock");
  vi.stubEnv("STUDIO_MOCK_STORE", "true");
  await insertMockHouse(
    House.parse({
      id: house,
      firstName: "Rose",
      consentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      token: "t".repeat(43),
    }),
  );
  generate.mockReset();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(async () => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  await rm(directory, { recursive: true, force: true });
});

const ctx = { params: Promise.resolve({ id: house }) };
const post = (body: unknown) =>
  new Request(`http://localhost/api/houses/${house}/rooms/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
const jpeg = () =>
  sharp({ create: { width: 40, height: 30, channels: 3, background: "#987" } })
    .jpeg()
    .toBuffer();

describe("POST /api/houses/:id/rooms/generate (B17)", () => {
  it("creates a Room with the generated background", async () => {
    generate.mockResolvedValue(await jpeg());
    const res = await POST(post({ name: "Lyon kitchen", description: "the old kitchen" }), ctx);
    expect(res.status).toBe(201);
    const room = Room.parse((await res.json()).data);
    expect(room.source).toBe("description");
    expect(room.background).toMatchObject({ kind: "description", text: "the old kitchen" });
    expect(room.backgroundPath).toMatch(/^.+\/rooms\/.+\.jpg$/);
    expect(room.slots.length).toBeGreaterThan(0);
  });

  it("falls back to the closest standard Room when generation fails", async () => {
    generate.mockRejectedValue(new Error("fal down"));
    const res = await POST(post({ name: "Back garden", description: "garden with roses" }), ctx);
    expect(res.status).toBe(201);
    const room = Room.parse((await res.json()).data);
    expect(room).toMatchObject({ source: "style", style: "garden" });
    expect(room.background).toEqual({ kind: "style", style: "garden" });
  });

  it("replaces the background of an existing Room and keeps its name", async () => {
    generate.mockResolvedValue(await jpeg());
    const created = Room.parse(
      (await (await POST(post({ name: "Den", description: "a den" }), ctx)).json()).data,
    );
    const res = await POST(post({ roomId: created.id, description: "a den with a piano" }), ctx);
    expect(res.status).toBe(200);
    const stored = await getEntity("rooms", created.id);
    expect(stored?.name).toBe("Den");
    expect(stored?.background).toMatchObject({ text: "a den with a piano" });
    expect(stored?.backgroundPath).not.toBe(created.backgroundPath);
  });

  it("rejects a request with neither name nor roomId", async () => {
    const res = await POST(post({ description: "a room" }), ctx);
    expect(res.status).toBe(422);
  });
});
