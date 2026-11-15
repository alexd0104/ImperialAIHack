import { describe, expect, it } from "vitest";
import { roomStyles } from "@/components/studio/room-styles";
import { Asset, House, Memory, Room, Scene, Story } from "@/lib/contracts";
import example from "./demo.example.json";
import { DemoManifest, PRESET_BACKGROUNDS, PRESET_SLOTS, planSeed, storageFileName } from "./plan";

const NOW = "2026-11-14T12:00:00.000Z";

function ids() {
  let n = 0;
  return () => (n++).toString(16).padStart(24, "0");
}

const sample = {
  house: { firstName: "Rose" },
  rooms: [
    {
      style: "garden",
      stories: [
        {
          slot: "bench",
          title: "Summer at the lake",
          object: "3d-armchair",
          memories: [
            {
              title: "The picnic",
              people: ["Rose", "Paul"],
              okAlone: true,
              photos: ["photos/picnic 1.jpg", "photos/picnic-2.png"],
              clips: ["clips/picnic-1.mp4", null],
              song: "audio/song.mp3",
              voice: "audio/voice.m4a",
              voiceDurationMs: 12000,
              ambience: "audio/lake.mp3",
            },
          ],
        },
      ],
    },
    {
      style: "kitchen",
      stories: [
        {
          slot: "table",
          title: "Sunday lunch",
          object: { glb: "objects/teapot.glb" },
          memories: [{ title: "Lunch", colour: "keep_bw", photos: ["photos/lunch.jpg"] }],
        },
      ],
    },
  ],
};

/** Mutable view of the sample for building invalid manifests. */
type Loose = {
  rooms: {
    stories: { slot: string; memories: { clips?: (string | null)[]; photos: string[] }[] }[];
  }[];
};
const clone = () => structuredClone(sample) as unknown as Loose;

describe("demo seed plan", () => {
  it("keeps the slot presets equal to the Studio ones", () => {
    for (const [style, preset] of Object.entries(roomStyles)) {
      const key = style as keyof typeof PRESET_SLOTS;
      expect(PRESET_SLOTS[key]).toEqual(preset.slots);
      expect(PRESET_BACKGROUNDS[key]).toBe(preset.image);
    }
  });

  it("plans entities that every contract accepts", () => {
    const plan = planSeed(DemoManifest.parse(sample), {
      token: "demo-token",
      now: NOW,
      newId: ids(),
    });

    expect(House.parse(plan.house).token).toBe("demo-token");
    expect(plan.rooms.map((r) => Room.parse(r).style)).toEqual(["garden", "kitchen"]);
    for (const e of plan.stories) Story.parse(e);
    for (const e of plan.memories) Memory.parse(e);
    for (const e of plan.scenes) Scene.parse(e);
    // The script fills path/bytes/sha256 after copying; a stand-in shows the rest is valid.
    for (const { source: _s, storageName, ...asset } of plan.assets) {
      Asset.parse({
        ...asset,
        path: `${plan.house.id}/${storageName}`,
        bytes: 1,
        sha256: "a".repeat(64),
      });
    }
  });

  it("links slots, stories, memories, assets and scenes", () => {
    const plan = planSeed(DemoManifest.parse(sample), {
      token: "demo-token",
      now: NOW,
      newId: ids(),
    });
    const [garden, kitchen] = plan.rooms;
    const [lake, lunch] = plan.stories;

    expect(garden.slots.find((s) => s.id === "bench")?.storyId).toBe(lake.id);
    expect(garden.slots.filter((s) => s.storyId)).toHaveLength(1);
    expect(kitchen.slots.find((s) => s.id === "table")?.storyId).toBe(lunch.id);
    expect(lake.roomId).toBe(garden.id);
    expect(lake.object).toEqual({ kind: "glb", path: "/objects/glb/armchair.glb" });
    expect(lunch.object.kind).toBe("glb");
    expect(lunch.object.path).toMatch(new RegExp(`^${plan.house.id}/demo/objects/`));

    const picnic = plan.memories[0];
    expect(lake.memoryOrder).toEqual([picnic.id]);
    expect(picnic.status).toBe("published");
    expect(picnic.sheet?.motion).toBe("gentle");
    expect(plan.memories[1].sheet?.motion).toBe("still");

    const song = plan.assets.find((a) => a.kind === "song");
    const voice = plan.assets.find((a) => a.kind === "voice");
    expect(picnic.sheet?.songAssetId).toBe(song?.id);
    expect(picnic.sheet?.voiceAssetId).toBe(voice?.id);
    expect(voice?.durationMs).toBe(12000);

    const scenes = plan.scenes.filter((s) => s.memoryId === picnic.id);
    expect(scenes.map((s) => s.choice?.use)).toEqual(["animated", "still"]);
    expect(scenes[0].outputs.clip).toMatch(/demo\/clips\//);
    expect(scenes[0].outputs.ambience).toMatch(/demo\/ambience\//);
    expect(scenes[1].outputs).toEqual({});
    expect(plan.scenes.find((s) => s.memoryId === plan.memories[1].id)?.choice?.colour).toBe("bw");
    // Clips, ambience and the GLB are copied but are not Assets.
    expect(plan.extraFiles).toHaveLength(3);
  });

  it("rejects unknown or reused slots, mismatched clips and paths outside demo-assets", () => {
    const bad = clone();
    bad.rooms[0].stories[0].slot = "sofa";
    expect(DemoManifest.safeParse(bad).success).toBe(false);

    const reused = clone();
    reused.rooms[0].stories.push({ ...reused.rooms[0].stories[0] });
    expect(DemoManifest.safeParse(reused).success).toBe(false);

    const clips = clone();
    clips.rooms[0].stories[0].memories[0].clips = [null];
    expect(DemoManifest.safeParse(clips).success).toBe(false);

    const outside = clone();
    outside.rooms[0].stories[0].memories[0].photos = ["../secret.jpg"];
    expect(DemoManifest.safeParse(outside).success).toBe(false);
  });

  it("makes a photo Room with its own background and free-placed Objects", () => {
    const manifest = DemoManifest.parse({
      house: { firstName: "Rose" },
      rooms: [
        {
          style: "living",
          name: "Bedroom",
          photo: "pregen/Room1.jpg",
          stories: [
            {
              slot: "shelf",
              title: "Road trips",
              object: { glb: "pregen/compass.glb" },
              position: { x: 0.34, y: 0.6, scale: 0.1 },
              memories: [
                { title: "The drive", photos: ["pregen/car.jpg"], clips: ["pregen/car.mp4"] },
              ],
            },
          ],
        },
      ],
    });
    const plan = planSeed(manifest, { token: "demo-token", now: NOW, newId: ids() });
    const room = Room.parse(plan.rooms[0]);
    const photo = plan.assets.find((a) => a.source === "pregen/Room1.jpg");
    expect(photo?.memoryId).toBeUndefined();
    expect(room.source).toBe("photo");
    expect(room.backgroundPath).toBe(`${plan.house.id}/${photo?.storageName}`);
    expect(room.background).toEqual({
      kind: "photo",
      assetId: photo?.id,
      path: room.backgroundPath,
    });
    expect(Story.parse(plan.stories[0]).position).toEqual({ x: 0.34, y: 0.6, scale: 0.1 });
  });

  it("accepts the example manifest", () => {
    expect(DemoManifest.safeParse(example).success).toBe(true);
  });

  it("makes storage-safe file names", () => {
    expect(storageFileName("photos/Été à Nice (1).JPG", 3)).toBe("03-t-Nice-1.jpg");
    expect(storageFileName("audio/voice", 12)).toBe("12-voice.bin");
    expect(storageFileName("a/b/c.tar.gz", 0)).toMatch(/^[A-Za-z0-9._-]+$/);
  });
});
