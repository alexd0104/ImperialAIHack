import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { FalGateway } from "./fal";
import { compileRoomPrompt } from "./prompt-compiler";
import { closestRoomStyle, generateRoomPhoto } from "./room-generate";
import { ROOM_HEIGHT, ROOM_MAX_BYTES, ROOM_WIDTH } from "./room-photo";

const fixtureUrl = pathToFileURL(path.join(process.cwd(), "mocks/media/photo.jpg")).href;

function fakeFal(output: unknown) {
  const submit = vi.fn(async () => "req-1");
  const fal = {
    mode: "mock",
    upload: async () => "",
    submit,
    status: async () => "COMPLETED",
    result: async () => ({ requestId: "req-1", data: output as Record<string, unknown> }),
  } as unknown as FalGateway;
  return { fal, submit };
}

describe("compileRoomPrompt", () => {
  it("asks for a realistic room with no people and free surfaces", () => {
    const prompt = compileRoomPrompt("a sunny\nkitchen with blue tiles");
    expect(prompt).toContain("realistic");
    expect(prompt).toContain("a sunny kitchen with blue tiles");
    expect(prompt).toContain("No people");
    expect(prompt).toContain("empty surfaces");
  });
});

describe("generateRoomPhoto", () => {
  it("sends the compiled prompt and returns a 1194×834 jpeg under 400 KB", async () => {
    const { fal, submit } = fakeFal({ images: [{ url: fixtureUrl }] });
    const out = await generateRoomPhoto("a quiet living room", { fal, pollMs: 1 });
    expect(submit).toHaveBeenCalledWith("roomGenerate", {
      prompt: compileRoomPrompt("a quiet living room"),
    });
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([ROOM_WIDTH, ROOM_HEIGHT, "jpeg"]);
    expect(out.length).toBeLessThanOrEqual(ROOM_MAX_BYTES);
  });

  it("throws when the model returns no image (caller falls back)", async () => {
    const { fal } = fakeFal({ images: [] });
    await expect(generateRoomPhoto("a room", { fal, pollMs: 1 })).rejects.toThrow();
  });
});

describe("closestRoomStyle", () => {
  it("maps descriptions to the nearest standard Room", () => {
    expect(closestRoomStyle("Grandma's back garden with roses")).toBe("garden");
    expect(closestRoomStyle("the old kitchen in Lyon")).toBe("kitchen");
    expect(closestRoomStyle("a bedroom with a piano")).toBe("living");
  });
});
