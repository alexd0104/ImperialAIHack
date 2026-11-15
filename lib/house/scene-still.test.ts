import { describe, expect, it } from "vitest";
import { sceneStill } from "./scene-still";

describe("sceneStill fallback order", () => {
  const polaroid = "/api/files/h/polaroid.png";
  it("uses the scene's own still for a failed clip", () => {
    expect(
      sceneStill({ kind: "clip", url: "/c.mp4", durationMs: 5000, stillUrl: "/s.png" }, polaroid),
    ).toBe("/s.png");
  });
  it("falls back to the polaroid only when the scene has no still", () => {
    expect(sceneStill({ kind: "video", url: "/v.mp4", durationMs: 5000 }, polaroid)).toBe(polaroid);
  });
  it("a photo scene is its own still", () => {
    expect(sceneStill({ kind: "photo", url: "/p.png", durationMs: 6000 }, polaroid)).toBe("/p.png");
  });
});
