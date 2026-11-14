import { describe, expect, it } from "vitest";
import { Asset, House, HouseBundle, Memory, Room, Scene, Story } from "@/lib/contracts";
import assetFixture from "@/lib/contracts/__fixtures__/asset.json";
import houseFixture from "@/lib/contracts/__fixtures__/house.json";
import bundleFixture from "@/lib/contracts/__fixtures__/house-bundle.json";
import memoryFixture from "@/lib/contracts/__fixtures__/memory.json";
import roomFixture from "@/lib/contracts/__fixtures__/room.json";
import scenesFixture from "@/lib/contracts/__fixtures__/scenes.json";
import storyFixture from "@/lib/contracts/__fixtures__/story.json";
import {
  applyMode,
  buildBundle,
  collectFiles,
  okAloneIdsFromRaw,
  orderMemories,
  tokeniseBundle,
  withToken,
} from "./bundle";

const TOKEN = "tok en";
const house = House.parse(houseFixture);
const room = Room.parse(roomFixture);
const publishedStory = Story.parse({ ...storyFixture, publishedAt: "2026-11-14T16:00:00.000Z" });
const memory = Memory.parse({ ...memoryFixture, status: "published" });
const scenes = Scene.array().parse(scenesFixture);
const photo = Asset.parse(assetFixture);

function source(overrides: Partial<Parameters<typeof buildBundle>[0]> = {}) {
  return {
    house,
    token: TOKEN,
    rooms: [room],
    stories: [publishedStory],
    memories: [memory],
    scenes,
    assets: [photo],
    ...overrides,
  };
}

describe("withToken", () => {
  it("adds the token to /api/files URLs only, once", () => {
    expect(withToken("/api/files/h/a.png", "x y")).toBe("/api/files/h/a.png?t=x%20y");
    expect(withToken("/api/files/h/a.png?t=1", "x")).toBe("/api/files/h/a.png?t=1");
    expect(withToken("/rooms/garden.svg", "x")).toBe("/rooms/garden.svg");
  });
});

describe("buildBundle", () => {
  it("builds a valid HouseBundle from published content", () => {
    const { bundle, okAloneIds } = buildBundle(source());
    expect(HouseBundle.safeParse(bundle).success).toBe(true);
    expect(okAloneIds.has(memory.id)).toBe(true);
    const slot = bundle.rooms[0]?.slots.find((s) => s.id === "bench");
    expect(slot?.story?.object.url).toBe("/objects/deckchair.svg");
    const built = slot?.story?.memories[0];
    // The second scene has no family choice yet: it never reaches the House (rule 2).
    expect(built?.scenes).toEqual([
      {
        kind: "clip",
        url: `/api/files/${scenes[0]?.outputs.clip}?t=tok%20en`,
        durationMs: 5000,
        // B10: the clip carries its own chosen still (restored, B&W) for a failed clip.
        stillUrl: `/api/files/${scenes[0]?.outputs.restored}?t=tok%20en`,
      },
    ]);
    expect(built?.polaroidUrl).toContain("restore.png?t=");
    expect(built?.caption).toBe("Brighton beach, summer 1968");
    expect(bundle.files).toContain("/rooms/garden.svg");
    expect(bundle.files).toContain(built?.polaroidUrl);
  });

  it("leaves Slots empty for unpublished Stories and unapproved Memories", () => {
    const unpublished = buildBundle(source({ stories: [Story.parse(storyFixture)] })).bundle;
    expect(unpublished.rooms[0]?.slots.every((s) => s.story === null)).toBe(true);
    const draft = buildBundle(source({ memories: [{ ...memory, status: "draft" }] })).bundle;
    expect(draft.rooms[0]?.slots.every((s) => s.story === null)).toBe(true);
  });

  it("uses the still photo when the family kept the original", () => {
    const still = scenes.map((s) => ({
      ...s,
      choice: { use: "still" as const, colour: "bw" as const, restored: false },
    }));
    const built = buildBundle(source({ scenes: still })).bundle.rooms[0]?.slots[0]?.story
      ?.memories[0];
    expect(built?.scenes.map((s) => s.kind)).toEqual(["photo"]);
    expect(built?.scenes[0]?.url).toContain(photo.path);
  });
});

describe("orderMemories", () => {
  it("follows memoryOrder, then creation date", () => {
    const a = { ...memory, id: "a", createdAt: "2026-01-02T00:00:00.000Z" };
    const b = { ...memory, id: "b", createdAt: "2026-01-01T00:00:00.000Z" };
    const c = { ...memory, id: "c", createdAt: "2026-01-03T00:00:00.000Z" };
    const story = { ...publishedStory, memoryOrder: ["c"] };
    expect(orderMemories(story, [a, b, c]).map((m) => m.id)).toEqual(["c", "b", "a"]);
  });
});

describe("applyMode (alone filter)", () => {
  const together = HouseBundle.parse(bundleFixture);
  const memoryId = together.rooms[0]?.slots[0]?.story?.memories[0]?.id ?? "";

  it("keeps everything in together mode", () => {
    expect(applyMode(together, "together", new Set())).toEqual(together);
  });

  it("keeps only OK-alone Memories", () => {
    const alone = applyMode(together, "alone", new Set([memoryId]));
    expect(alone.mode).toBe("alone");
    expect(alone.rooms[0]?.slots[0]?.story?.available).toBe(true);
    expect(alone.rooms[0]?.slots[0]?.story?.memories).toHaveLength(1);
  });

  it("keeps a Story without OK-alone Memories on its Slot, unavailable, and stops preloading it", () => {
    const alone = applyMode(together, "alone", new Set());
    const story = alone.rooms[0]?.slots[0]?.story;
    expect(story?.available).toBe(false);
    expect(story?.memories).toEqual([]);
    expect(story?.object.url).toBe("/objects/deckchair.svg");
    expect(alone.files).toEqual(["/rooms/garden.svg", "/objects/deckchair.svg"]);
  });
});

describe("demo bundle helpers", () => {
  it("reads okAlone flags from raw bundle.json", () => {
    const raw = structuredClone(bundleFixture) as unknown as {
      rooms: { slots: { story: { memories: { okAlone?: boolean }[] } | null }[] }[];
    };
    const m = raw.rooms[0]?.slots[0]?.story?.memories[0];
    if (m) m.okAlone = true;
    expect([...okAloneIdsFromRaw(raw)]).toEqual(["6650a1f0c0ffee0000000004"]);
    expect(okAloneIdsFromRaw(null).size).toBe(0);
  });

  it("tokenises every file URL", () => {
    const b = tokeniseBundle(HouseBundle.parse(bundleFixture), "demo-token");
    expect(
      b.files.filter((f) => f.startsWith("/api/files/")).every((f) => f.endsWith("?t=demo-token")),
    ).toBe(true);
    expect(collectFiles(b).sort()).toEqual([...b.files].sort());
  });
});

describe("buildMemory stillUrl (B10)", () => {
  const [first] = scenes;
  const memoryScene = (choice: NonNullable<Scene["choice"]>, outputs: Scene["outputs"]) =>
    buildBundle(
      source({ scenes: [Scene.parse({ ...first, choice, outputs })] }),
    ).bundle.rooms[0]?.slots.find((s) => s.id === "bench")?.story?.memories[0]?.scenes[0];
  const clip = "h/j/animate.mp4";

  it("uses the colourised still when colour was chosen", () => {
    const scene = memoryScene(
      { use: "animated", colour: "colour", restored: true },
      { clip, restored: "h/j/restore.png", colourised: "h/j/colour.png" },
    );
    expect(scene?.stillUrl).toBe("/api/files/h/j/colour.png?t=tok%20en");
  });

  it("uses the original photo when the family kept it unrestored", () => {
    const scene = memoryScene(
      { use: "animated", colour: "bw", restored: false },
      { clip, restored: "h/j/restore.png" },
    );
    expect(scene?.stillUrl).toBe(`/api/files/${photo.path}?t=tok%20en`);
  });

  it("is preloaded and tokenised like every other file", () => {
    const { bundle } = buildBundle(source());
    const still = bundle.rooms[0]?.slots.find((s) => s.id === "bench")?.story?.memories[0]
      ?.scenes[0]?.stillUrl;
    expect(bundle.files).toContain(still);
    const raw = tokeniseBundle(
      { ...bundle, files: [], rooms: bundle.rooms },
      TOKEN,
    ).rooms[0]?.slots.find((s) => s.id === "bench")?.story?.memories[0]?.scenes[0]?.stillUrl;
    expect(raw).toBe(still);
  });
});
