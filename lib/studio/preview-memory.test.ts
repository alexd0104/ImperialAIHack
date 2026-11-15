import { describe, expect, it } from "vitest";
import type { AssetView, SceneView } from "@/lib/contracts";
import { buildPreviewMemory } from "./preview-memory";

const scene = (over: Partial<SceneView>) =>
  ({ id: "s", order: 0, originalUrl: "/o.jpg", urls: {}, ...over }) as SceneView;
const asset = (kind: string, url: string, durationMs?: number) =>
  ({ kind, url, durationMs }) as unknown as AssetView;

describe("buildPreviewMemory", () => {
  it("returns null with nothing to show", () => {
    expect(buildPreviewMemory({ id: "m", title: "t", scenes: [], assets: [] })).toBeNull();
  });

  it("plays the clip with song, voice and scene ambience", () => {
    const m = buildPreviewMemory({
      id: "m",
      title: "t",
      scenes: [scene({ urls: { restored: "/r.jpg", clip: "/c.mp4", ambience: "/a.mp3" } })],
      assets: [asset("song", "/song.mp3"), asset("voice", "/v.mp3", 4000)],
    });
    expect(m?.scenes[0]).toMatchObject({ kind: "clip", url: "/c.mp4", stillUrl: "/r.jpg" });
    expect(m).toMatchObject({ songUrl: "/song.mp3", voiceUrl: "/v.mp3", ambienceUrl: "/a.mp3" });
  });

  it("a still uses the separate ambience file", () => {
    const m = buildPreviewMemory({
      id: "m",
      title: "t",
      scenes: [scene({ urls: { restored: "/r.jpg" } })],
      assets: [asset("audio", "/amb.mp3")],
    });
    expect(m?.scenes[0]).toMatchObject({ kind: "photo", url: "/r.jpg" });
    expect(m?.ambienceUrl).toBe("/amb.mp3");
  });

  it("keeping the original photo shows the original", () => {
    const m = buildPreviewMemory({
      id: "m",
      title: "t",
      scenes: [
        scene({
          urls: { restored: "/r.jpg", clip: "/c.mp4" },
          choice: { use: "still", colour: "bw", restored: false },
        }),
      ],
      assets: [],
    });
    expect(m?.scenes[0]).toMatchObject({ kind: "photo", url: "/o.jpg" });
  });
});
