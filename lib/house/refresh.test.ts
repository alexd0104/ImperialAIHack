import { describe, expect, it } from "vitest";
import type { BundleSlot, HouseBundle } from "@/lib/contracts";
import { bundleChanged, diffObjects } from "./refresh";

const slot = (id: string, storyId: string | null, x = 0.5, y = 0.5): BundleSlot => ({
  id,
  x,
  y,
  scale: 0.2,
  story: storyId
    ? {
        id: storyId,
        title: "t",
        object: { kind: "svg", url: "/o.svg" },
        available: true,
        memories: [],
      }
    : null,
});

const bundle = (version?: string, x = 0.5): HouseBundle =>
  ({
    house: { firstName: "A", avatars: [] },
    mode: "together",
    rooms: [{ id: "r", name: "R", background: "/b.jpg", slots: [slot("s", "a", x)] }],
    files: [],
    ...(version ? { version } : {}),
  }) as HouseBundle;

describe("bundleChanged", () => {
  it("trusts version when both have one", () => {
    expect(bundleChanged(bundle("1"), bundle("1", 0.9))).toBe(false);
    expect(bundleChanged(bundle("1"), bundle("2"))).toBe(true);
  });
  it("falls back to content", () => {
    expect(bundleChanged(bundle(), bundle())).toBe(false);
    expect(bundleChanged(bundle(), bundle(undefined, 0.9))).toBe(true);
  });
});

describe("diffObjects", () => {
  it("finds moved, added and removed Stories", () => {
    const prev = [slot("1", "a"), slot("2", "b"), slot("3", "c")];
    const next = [slot("1", "a", 0.3), slot("2", "b"), slot("4", "d")];
    expect(diffObjects(prev, next)).toEqual({ moved: ["a"], added: ["d"], removed: ["c"] });
  });
});
