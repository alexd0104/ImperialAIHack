import { describe, expect, it } from "vitest";
import type { BundleMemory } from "@/lib/contracts";
import { MUSIC_VOLUME, memoryDuration, musicVolume, sceneIndexAt } from "./timeline";

const memory: BundleMemory = {
  id: "m",
  title: "t",
  polaroidUrl: "/p.png",
  scenes: [
    { kind: "clip", url: "/a.mp4", durationMs: 5000 },
    { kind: "photo", url: "/b.png", durationMs: 6000 },
  ],
};

describe("memory timeline", () => {
  it("lasts as long as its scenes", () => {
    expect(memoryDuration(memory)).toBe(11_000);
  });

  it("waits for the family voice to finish", () => {
    expect(memoryDuration({ ...memory, voiceUrl: "/v.m4a", voiceDurationMs: 12_000 })).toBe(
      1500 + 12_000 + 1000,
    );
    // A voice without a known duration never stretches the Memory.
    expect(memoryDuration({ ...memory, voiceUrl: "/v.m4a" })).toBe(11_000);
  });

  it("finds the scene at a time and holds the last one", () => {
    expect(sceneIndexAt(memory, 0)).toBe(0);
    expect(sceneIndexAt(memory, 4999)).toBe(0);
    expect(sceneIndexAt(memory, 5000)).toBe(1);
    expect(sceneIndexAt(memory, 60_000)).toBe(1);
    expect(sceneIndexAt({ ...memory, scenes: [] }, 10)).toBe(0);
  });

  it("ducks music to 30 %", () => {
    expect(musicVolume(false)).toBe(MUSIC_VOLUME);
    expect(musicVolume(true)).toBeCloseTo(MUSIC_VOLUME * 0.3);
  });
});
