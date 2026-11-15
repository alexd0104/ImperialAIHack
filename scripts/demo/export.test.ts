import { describe, expect, it } from "vitest";
import { HouseBundle } from "@/lib/contracts";
import { applyMode, okAloneIdsFromRaw, tokeniseBundle } from "@/lib/house/bundle";
import example from "./demo.example.json";
import { exportDemoBundle, stripToken } from "./export";
import { DemoManifest, planSeed } from "./plan";

const NOW = "2026-11-14T12:00:00.000Z";

/** What `pnpm seed:demo` would write, with stand-in storage results for each asset. */
function seededSource() {
  let n = 0;
  const plan = planSeed(DemoManifest.parse(example), {
    token: "demo-token",
    now: NOW,
    newId: () => (n++).toString(16).padStart(24, "0"),
  });
  const assets = plan.assets.map(({ source: _s, storageName, ...a }) => ({
    ...a,
    path: `${plan.house.id}/${storageName}`,
    bytes: 1,
    sha256: "a".repeat(64),
  }));
  return { ...plan, assets, token: "demo-token" };
}

describe("demo export", () => {
  it("strips only the token query parameter from file URLs", () => {
    expect(stripToken("/api/files/h/a.jpg?t=demo-token")).toBe("/api/files/h/a.jpg");
    expect(stripToken("/api/files/h/a.jpg?x=1&t=abc")).toBe("/api/files/h/a.jpg?x=1");
    expect(stripToken("/rooms/garden.svg")).toBe("/rooms/garden.svg");
  });

  it("turns a seeded demo House into a bundle.json the demo loader accepts", () => {
    const file = exportDemoBundle(seededSource());
    const json = JSON.stringify(file);
    expect(json).not.toMatch(/[?&]t=/);

    // Same steps as loadDemoBundle in lib/house/load-bundle.ts.
    const raw: unknown = JSON.parse(json);
    const parsed = HouseBundle.parse(raw);
    const together = applyMode(
      tokeniseBundle(parsed, "demo-token"),
      "together",
      okAloneIdsFromRaw(raw),
    );

    expect(together.house.firstName).toBe("Rose");
    const stories = together.rooms
      .flatMap((r) => r.slots)
      .flatMap((s) => (s.story ? [s.story] : []));
    expect(stories.map((s) => s.title)).toEqual(["Summers at the lake", "Sunday lunch"]);
    const picnic = stories[0].memories[0];
    expect(picnic.scenes.map((s) => s.kind)).toEqual(["clip", "photo"]);
    expect(picnic.caption).toBe("Lake Annecy, 1972");
    expect(picnic.songUrl).toMatch(/\?t=demo-token$/);
    expect(picnic.voiceDurationMs).toBe(12000);
    expect(stories[0].object.url).toBe("/objects/glb/armchair.glb");
    expect(stories[1].object.kind).toBe("glb");
    expect(together.files.length).toBeGreaterThan(5);
  });

  it("keeps OK-alone Memories visible alone and the rest hidden", () => {
    const raw: unknown = JSON.parse(JSON.stringify(exportDemoBundle(seededSource())));
    const alone = applyMode(HouseBundle.parse(raw), "alone", okAloneIdsFromRaw(raw));
    const stories = alone.rooms.flatMap((r) => r.slots).flatMap((s) => (s.story ? [s.story] : []));
    expect(stories.map((s) => [s.title, s.available, s.memories.length])).toEqual([
      ["Summers at the lake", true, 1],
      ["Sunday lunch", false, 0],
    ]);
  });
});
