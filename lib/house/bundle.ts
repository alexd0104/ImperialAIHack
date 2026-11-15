import { bedUrl, isBedId, pickBed } from "@/lib/ai/beds";
import type {
  Asset,
  BundleMemory,
  BundleRoom,
  BundleScene,
  BundleStory,
  House,
  HouseBundle,
  HouseMode,
  Memory,
  Room,
  Scene,
  Story,
} from "@/lib/contracts";

// Pure HouseBundle building (TECHNICAL.md §4.2–4.3), shared by the DB path and demo mode.
// No I/O here so every rule (published only, approved scenes only, alone filter) is unit
// tested without a database.

/** The contract carries no clip duration; Kling/Veo clips are 5 s. */
export const CLIP_MS = 5000;
export const PHOTO_MS = 6000;
export const VIDEO_FALLBACK_MS = 10_000;

const SHOWN_STATUSES: ReadonlySet<Memory["status"]> = new Set(["approved", "published"]);

/** Storage paths become token-scoped file URLs; public paths (`/rooms/...`) stay as they are. */
export function fileUrl(pathOrUrl: string, token: string): string {
  if (pathOrUrl.startsWith("/")) return withToken(pathOrUrl, token);
  return withToken(`/api/files/${pathOrUrl}`, token);
}

/** /api/files needs `?t=<token>` because the House has no session (lib/session.ts). */
export function withToken(url: string, token: string): string {
  if (!url.startsWith("/api/files/") || /[?&]t=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}t=${encodeURIComponent(token)}`;
}

/** The still the family chose for a scene: colourised, restored, or the original upload. */
function stillPath(scene: Scene, asset: Asset | undefined): string | undefined {
  const choice = scene.choice;
  if (choice?.colour === "colour" && scene.outputs.colourised) return scene.outputs.colourised;
  if (choice?.restored && scene.outputs.restored) return scene.outputs.restored;
  return asset?.path;
}

export type BundleSource = {
  house: House;
  token: string;
  rooms: Room[];
  stories: Story[];
  memories: Memory[];
  scenes: Scene[];
  assets: Asset[];
};

function byCreatedAt<T extends { createdAt: string }>(a: T, b: T): number {
  return a.createdAt.localeCompare(b.createdAt);
}

function buildMemory(
  memory: Memory,
  scenes: Scene[],
  assets: Asset[],
  token: string,
): BundleMemory | null {
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const own = assets.filter((a) => a.memoryId === memory.id).sort(byCreatedAt);
  // Rule 2: only scenes the family decided on (approved or "keep original photo").
  const approved = scenes
    .filter((s) => s.memoryId === memory.id && s.choice)
    .sort((a, b) => a.order - b.order);

  const bundleScenes: BundleScene[] = [];
  let polaroid: string | undefined;
  for (const scene of approved) {
    const still = stillPath(scene, assetById.get(scene.assetId));
    polaroid ??= still;
    // Library bed: the stored choice wins, else pick from the sound events; none is fine.
    const bedId = isBedId(scene.bedId) ? scene.bedId : pickBed(scene.soundEvents);
    const bed = bedId ? { bedUrl: bedUrl(bedId) } : {};
    if (scene.choice?.use === "animated" && scene.outputs.clip) {
      bundleScenes.push({
        kind: "clip",
        ...bed,
        url: fileUrl(scene.outputs.clip, token),
        durationMs: CLIP_MS,
        // This scene's own still, so a failed clip never shows another photo.
        ...(still ? { stillUrl: fileUrl(still, token) } : {}),
      });
    } else if (still) {
      bundleScenes.push({
        kind: "photo",
        url: fileUrl(still, token),
        durationMs: PHOTO_MS,
        ...bed,
      });
    }
  }
  for (const video of own.filter((a) => a.kind === "video")) {
    bundleScenes.push({
      kind: "video",
      url: fileUrl(video.path, token),
      durationMs: video.durationMs ?? VIDEO_FALLBACK_MS,
    });
  }
  if (bundleScenes.length === 0 || !polaroid) return null;

  const song = own.find((a) => a.kind === "song");
  const voice = own.find((a) => a.kind === "voice");
  const ambience =
    approved.find((s) => s.outputs.ambience)?.outputs.ambience ??
    own.find((a) => a.kind === "audio")?.path;
  const caption = [memory.sheet?.place, memory.sheet?.when].filter(Boolean).join(", ");

  return {
    id: memory.id,
    title: memory.title,
    polaroidUrl: fileUrl(polaroid, token),
    caption: caption || undefined,
    scenes: bundleScenes,
    songUrl: song ? fileUrl(song.path, token) : undefined,
    ambienceUrl: ambience ? fileUrl(ambience, token) : undefined,
    voiceUrl: voice ? fileUrl(voice.path, token) : undefined,
    voiceDurationMs: voice?.durationMs,
  };
}

/** Family order first (`memoryOrder`), then anything not ordered yet by creation date. */
export function orderMemories(story: Story, memories: Memory[]): Memory[] {
  const rank = new Map(story.memoryOrder.map((id, i) => [id, i]));
  return [...memories].sort((a, b) => {
    const ra = rank.get(a.id) ?? Number.POSITIVE_INFINITY;
    const rb = rank.get(b.id) ?? Number.POSITIVE_INFINITY;
    return ra === rb ? byCreatedAt(a, b) : ra - rb;
  });
}

function objectUrl(story: Story, token: string): string {
  return story.object.kind === "svg"
    ? `/objects/${story.object.path}.svg`
    : fileUrl(story.object.path, token);
}

/**
 * The "together" bundle plus the ids of OK-alone Memories, which the contract does not
 * carry: `applyMode` uses them, then they are dropped.
 */
export function buildBundle(src: BundleSource): { bundle: HouseBundle; okAloneIds: Set<string> } {
  const okAloneIds = new Set<string>();
  const rooms: BundleRoom[] = [...src.rooms].sort(byCreatedAt).map((room) => ({
    id: room.id,
    name: room.name,
    background: fileUrl(room.backgroundPath, src.token),
    slots: room.slots.map((slot) => {
      const story = src.stories.find(
        (s) => s.roomId === room.id && s.slotId === slot.id && s.publishedAt,
      );
      let bundleStory: BundleStory | null = null;
      if (story) {
        const shown = src.memories.filter(
          (m) => m.storyId === story.id && SHOWN_STATUSES.has(m.status),
        );
        const memories: BundleMemory[] = [];
        for (const memory of orderMemories(story, shown)) {
          const built = buildMemory(memory, src.scenes, src.assets, src.token);
          if (!built) continue;
          memories.push(built);
          if (memory.okAlone) okAloneIds.add(memory.id);
        }
        if (memories.length > 0) {
          bundleStory = {
            id: story.id,
            title: story.title,
            object: { kind: story.object.kind, url: objectUrl(story, src.token) },
            available: true,
            ...(story.position ? { position: story.position } : {}),
            memories,
          };
        }
      }
      // Free placement overrides the Slot's coordinates so the House shows it there as is.
      const at = bundleStory && story?.position ? story.position : slot;
      return { id: slot.id, x: at.x, y: at.y, scale: at.scale, story: bundleStory };
    }),
  }));

  const bundle: HouseBundle = {
    // The contract has no family members yet: avatars stay empty (STATUS request).
    house: { firstName: src.house.firstName, avatars: [] },
    mode: "together",
    rooms,
    files: [],
  };
  return { bundle: { ...bundle, files: collectFiles(bundle) }, okAloneIds };
}

/** Every URL the House shows or plays, deduplicated, in display order. */
export function collectFiles(bundle: Pick<HouseBundle, "rooms">): string[] {
  const files = new Set<string>();
  const add = (url: string | undefined) => url && files.add(url);
  for (const room of bundle.rooms) {
    add(room.background);
    for (const slot of room.slots) {
      const story = slot.story;
      if (!story) continue;
      add(story.object.url);
      for (const memory of story.memories) {
        add(memory.polaroidUrl);
        for (const scene of memory.scenes) {
          add(scene.url);
          add(scene.stillUrl);
          add(scene.bedUrl);
        }
        add(memory.songUrl);
        add(memory.ambienceUrl);
        add(memory.voiceUrl);
      }
    }
  }
  return [...files];
}

/**
 * Alone mode: only OK-alone Memories; a Story left with none stays on its Slot as
 * `available: false` (Objects never move, H8). Files are recomputed so nothing hidden
 * is preloaded.
 */
export function applyMode(
  bundle: HouseBundle,
  mode: HouseMode,
  okAloneIds: ReadonlySet<string>,
): HouseBundle {
  if (mode === "together") return { ...bundle, mode };
  const rooms = bundle.rooms.map((room) => ({
    ...room,
    slots: room.slots.map((slot) => {
      if (!slot.story) return slot;
      const memories = slot.story.memories.filter((m) => okAloneIds.has(m.id));
      return { ...slot, story: { ...slot.story, memories, available: memories.length > 0 } };
    }),
  }));
  return { ...bundle, mode, rooms, files: collectFiles({ rooms }) };
}

/** Adds the House token to every /api/files URL of a bundle (demo bundle.json has none). */
export function tokeniseBundle(bundle: HouseBundle, token: string): HouseBundle {
  const t = (url: string) => withToken(url, token);
  const opt = (url: string | undefined) => (url ? t(url) : url);
  return {
    ...bundle,
    rooms: bundle.rooms.map((room) => ({
      ...room,
      background: t(room.background),
      slots: room.slots.map((slot) =>
        slot.story
          ? {
              ...slot,
              story: {
                ...slot.story,
                object: { ...slot.story.object, url: t(slot.story.object.url) },
                memories: slot.story.memories.map((m) => ({
                  ...m,
                  polaroidUrl: t(m.polaroidUrl),
                  scenes: m.scenes.map((s) => ({ ...s, url: t(s.url), stillUrl: opt(s.stillUrl) })),
                  songUrl: opt(m.songUrl),
                  ambienceUrl: opt(m.ambienceUrl),
                  voiceUrl: opt(m.voiceUrl),
                })),
              },
            }
          : slot,
      ),
    })),
    files: bundle.files.map(t),
  };
}

/**
 * Demo bundle.json may mark Memories with `okAlone: true` (not in the contract, which
 * strips it on parse). Read them from the raw JSON before parsing.
 */
export function okAloneIdsFromRaw(raw: unknown): Set<string> {
  const ids = new Set<string>();
  const rooms = (raw as { rooms?: unknown })?.rooms;
  if (!Array.isArray(rooms)) return ids;
  for (const room of rooms) {
    for (const slot of (room as { slots?: unknown[] })?.slots ?? []) {
      const memories = (slot as { story?: { memories?: unknown[] } | null })?.story?.memories;
      for (const m of memories ?? []) {
        const memory = m as { id?: unknown; okAlone?: unknown };
        if (memory.okAlone === true && typeof memory.id === "string") ids.add(memory.id);
      }
    }
  }
  return ids;
}
