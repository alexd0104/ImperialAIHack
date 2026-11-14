import { describe, expect, it } from "vitest";
import { hasVisual, needsResize, visualKind } from "./memory-bank";

describe("memory bank rules", () => {
  it("needs a photo or a video to continue", () => {
    expect(hasVisual([])).toBe(false);
    expect(hasVisual([{ kind: "song" }, { kind: "voice" }])).toBe(false);
    expect(hasVisual([{ kind: "song" }, { kind: "video" }])).toBe(true);
    expect(hasVisual([{ kind: "photo" }])).toBe(true);
  });

  it("sorts picked files into photo or video", () => {
    expect(visualKind("image/heic")).toBe("photo");
    expect(visualKind("video/quicktime")).toBe("video");
    expect(visualKind("audio/mpeg")).toBeUndefined();
  });

  it("resizes only formats the browser can decode", () => {
    expect(needsResize("image/jpeg")).toBe(true);
    expect(needsResize("image/heic")).toBe(false);
  });
});
