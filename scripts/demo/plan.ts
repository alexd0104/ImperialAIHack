import { z } from "zod";
import type {
  Asset,
  AssetKind,
  House,
  Memory,
  Room,
  RoomStyle,
  Scene,
  Slot,
  Story,
} from "../../lib/contracts";

// Pure half of `pnpm seed:demo`: turns the hand-written demo manifest into the entities to
// insert. No I/O, so it is unit-tested against the real contracts (plan.test.ts). Runs
// under plain Node type stripping, which is why it imports only zod (contract imports are
// type-only and erased).

/** Same slots as the Studio presets (components/studio/room-styles.ts; a test keeps them equal). */
export const PRESET_SLOTS: Record<RoomStyle, Slot[]> = {
  garden: [
    { id: "bench", x: 0.22, y: 0.68, scale: 0.18 },
    { id: "tree", x: 0.71, y: 0.42, scale: 0.24 },
    { id: "table", x: 0.5, y: 0.78, scale: 0.15 },
  ],
  kitchen: [
    { id: "counter-left", x: 0.22, y: 0.565, scale: 0.18 },
    { id: "counter-right", x: 0.76, y: 0.565, scale: 0.18 },
    { id: "table", x: 0.5, y: 0.58, scale: 0.16 },
  ],
  living: [
    { id: "shelf", x: 0.2, y: 0.71, scale: 0.18 },
    { id: "side-table", x: 0.79, y: 0.675, scale: 0.18 },
    { id: "coffee-table", x: 0.5, y: 0.79, scale: 0.18 },
  ],
};

export const PRESET_BACKGROUNDS: Record<RoomStyle, string> = {
  garden: "/rooms/garden.svg",
  kitchen: "/rooms/kitchen.svg",
  living: "/rooms/living-room.svg",
};

const LIBRARY_OBJECTS = [
  "watering-can",
  "flower",
  "sun-hat",
  "teapot",
  "mug",
  "apple",
  "record",
  "radio",
  "camera",
] as const;

/** A path relative to DEMO_ASSETS_DIR, never absolute and never climbing out of it. */
const MediaPath = z
  .string()
  .min(1)
  .refine(
    (p) => !p.startsWith("/") && !p.split(/[\\/]/).includes(".."),
    "relative path inside demo-assets",
  );

const ManifestMemory = z.object({
  title: z.string().min(1).max(80),
  people: z.array(z.string().max(60)).max(10).default([]),
  place: z.string().max(120).optional(),
  when: z.string().max(40).optional(),
  message: z.string().max(400).optional(),
  okAlone: z.boolean().default(false),
  colour: z.enum(["keep_bw", "colourise", "already_colour"]).default("already_colour"),
  /** Real photos, in playing order. The first one is the polaroid. */
  photos: z.array(MediaPath).min(1),
  /** Optional approved animated clip per photo (same index as `photos`). */
  clips: z.array(MediaPath.nullable()).optional(),
  song: MediaPath.optional(),
  voice: MediaPath.optional(),
  voiceDurationMs: z.number().int().positive().optional(),
  ambience: MediaPath.optional(),
});

const ManifestStory = z.object({
  slot: z.string().min(1),
  title: z.string().min(1).max(80),
  /** A library Object name, or a GLB file in demo-assets. */
  object: z.union([z.enum(LIBRARY_OBJECTS), z.object({ glb: MediaPath })]),
  memories: z.array(ManifestMemory).min(1),
});

const ManifestRoom = z.object({
  style: z.enum(["garden", "kitchen", "living"]),
  name: z.string().min(1).max(60).optional(),
  stories: z.array(ManifestStory).default([]),
});

export const DemoManifest = z
  .object({
    house: z.object({
      firstName: z.string().min(1).max(40),
      dontShow: z.array(z.string().max(80)).default([]),
    }),
    rooms: z.array(ManifestRoom).min(1),
  })
  .superRefine((manifest, ctx) => {
    manifest.rooms.forEach((room, r) => {
      const slotIds = PRESET_SLOTS[room.style].map((s) => s.id);
      const used = new Set<string>();
      room.stories.forEach((story, s) => {
        const path = ["rooms", r, "stories", s, "slot"];
        if (!slotIds.includes(story.slot)) {
          ctx.addIssue({
            code: "custom",
            path,
            message: `unknown slot for ${room.style}: use ${slotIds.join(", ")}`,
          });
        }
        if (used.has(story.slot))
          ctx.addIssue({ code: "custom", path, message: "slot already used" });
        used.add(story.slot);
        story.memories.forEach((memory, m) => {
          if (memory.clips && memory.clips.length !== memory.photos.length) {
            ctx.addIssue({
              code: "custom",
              path: ["rooms", r, "stories", s, "memories", m, "clips"],
              message: "clips must have one entry (or null) per photo",
            });
          }
        });
      });
    });
  });
export type DemoManifest = z.infer<typeof DemoManifest>;

/** A media file to copy into storage; the script fills path/bytes/sha256 after saving. */
export type PlannedAsset = Omit<Asset, "path" | "bytes" | "sha256" | "url"> & {
  /** Relative to DEMO_ASSETS_DIR. */
  source: string;
  /** Relative to the House folder in STORAGE_DIR. */
  storageName: string;
};

export type SeedPlan = {
  house: House;
  rooms: Room[];
  stories: Story[];
  memories: Memory[];
  assets: PlannedAsset[];
  scenes: Scene[];
  /** Files copied into storage that are not Assets: approved clips, ambience, GLB Objects. */
  extraFiles: { source: string; storageName: string }[];
};

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
  ogg: "audio/ogg",
  glb: "model/gltf-binary",
};

export function mimeFor(file: string): string {
  return MIME[file.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
}

/** Storage segments only allow [A-Za-z0-9._-]; keep the extension, slug the rest. */
export function storageFileName(source: string, index: number): string {
  const base = source.split(/[\\/]/).pop() ?? "file";
  const dot = base.lastIndexOf(".");
  const stem = (dot > 0 ? base.slice(0, dot) : base)
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const ext =
    dot > 0
      ? base
          .slice(dot + 1)
          .replace(/[^A-Za-z0-9]/g, "")
          .toLowerCase()
      : "bin";
  return `${String(index).padStart(2, "0")}-${stem || "file"}.${ext}`;
}

export function planSeed(
  manifest: DemoManifest,
  options: { token: string; now: string; newId: () => string },
): SeedPlan {
  const { token, now, newId } = options;
  const house: House = {
    id: newId(),
    firstName: manifest.house.firstName,
    token,
    tokenRevoked: false,
    dontShow: manifest.house.dontShow,
    consentAt: now,
    createdAt: now,
  };
  const plan: SeedPlan = {
    house,
    rooms: [],
    stories: [],
    memories: [],
    assets: [],
    scenes: [],
    extraFiles: [],
  };
  let fileIndex = 0;
  const addAsset = (kind: AssetKind, source: string, memoryId: string, durationMs?: number) => {
    const asset: PlannedAsset = {
      id: newId(),
      houseId: house.id,
      memoryId,
      kind,
      mime: mimeFor(source),
      source,
      storageName: `demo/${kind}/${storageFileName(source, fileIndex++)}`,
      createdAt: now,
      ...(durationMs ? { durationMs } : {}),
    };
    plan.assets.push(asset);
    return asset;
  };
  const addExtra = (folder: string, source: string) => {
    const storageName = `demo/${folder}/${storageFileName(source, fileIndex++)}`;
    plan.extraFiles.push({ source, storageName });
    return `${house.id}/${storageName}`;
  };

  for (const manifestRoom of manifest.rooms) {
    const roomId = newId();
    const slots: Slot[] = PRESET_SLOTS[manifestRoom.style].map((slot) => ({ ...slot }));
    for (const manifestStory of manifestRoom.stories) {
      const storyId = newId();
      const slot = slots.find((s) => s.id === manifestStory.slot);
      if (slot) slot.storyId = storyId;
      const object =
        typeof manifestStory.object === "string"
          ? { kind: "svg" as const, path: manifestStory.object }
          : { kind: "glb" as const, path: addExtra("objects", manifestStory.object.glb) };

      const memoryOrder: string[] = [];
      for (const m of manifestStory.memories) {
        const memoryId = newId();
        memoryOrder.push(memoryId);
        const song = m.song ? addAsset("song", m.song, memoryId) : undefined;
        const voice = m.voice ? addAsset("voice", m.voice, memoryId, m.voiceDurationMs) : undefined;
        const ambience = m.ambience ? addExtra("ambience", m.ambience) : undefined;
        const animated = Boolean(m.clips?.some(Boolean));
        const sheet = {
          title: m.title,
          people: m.people,
          ...(m.place ? { place: m.place } : {}),
          ...(m.when ? { when: m.when } : {}),
          ...(m.message ? { message: m.message } : {}),
          ...(song ? { songAssetId: song.id } : {}),
          ...(voice ? { voiceAssetId: voice.id } : {}),
          colour: m.colour,
          // Demo content is already approved; nothing is regenerated by the seed.
          restore: false,
          motion: animated ? ("gentle" as const) : ("still" as const),
          okAlone: m.okAlone,
          source: "form" as const,
        };
        const { okAlone: _okAlone, source: _source, ...answers } = sheet;
        plan.memories.push({
          id: memoryId,
          houseId: house.id,
          storyId,
          title: m.title,
          answers,
          sheet,
          okAlone: m.okAlone,
          status: "published",
          createdAt: now,
          updatedAt: now,
        });
        m.photos.forEach((photo, order) => {
          const asset = addAsset("photo", photo, memoryId);
          const clipSource = m.clips?.[order] ?? null;
          const clip = clipSource ? addExtra("clips", clipSource) : undefined;
          plan.scenes.push({
            id: newId(),
            houseId: house.id,
            memoryId,
            assetId: asset.id,
            order,
            outputs: {
              ...(clip ? { clip } : {}),
              ...(order === 0 && ambience ? { ambience } : {}),
            },
            choice: {
              use: clip ? "animated" : "still",
              colour: m.colour === "keep_bw" ? "bw" : "colour",
              restored: false,
              chosenAt: now,
            },
            status: "done",
            createdAt: now,
          });
        });
      }
      plan.stories.push({
        id: storyId,
        houseId: house.id,
        roomId,
        slotId: manifestStory.slot,
        title: manifestStory.title,
        object,
        memoryOrder,
        publishedAt: now,
        createdAt: now,
      });
    }
    plan.rooms.push({
      id: roomId,
      houseId: house.id,
      name: manifestRoom.name ?? manifestRoom.style,
      source: "style",
      style: manifestRoom.style,
      backgroundPath: PRESET_BACKGROUNDS[manifestRoom.style],
      slots,
      createdAt: now,
    });
  }
  return plan;
}
