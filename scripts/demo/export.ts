import type {
  BundleMemory,
  BundleRoom,
  BundleSlot,
  BundleStory,
  HouseBundle,
} from "../../lib/contracts";
import { type BundleSource, buildBundle } from "../../lib/house/bundle.ts";

// Pure half of `pnpm export:demo`: the demo House as it is in the DB → demo-assets/bundle.json.
// Reuses H1's buildBundle so demo mode shows exactly what the DB path would. The file holds
// no token (lib/house/load-bundle.ts adds it back on read) and marks OK-alone Memories with
// `okAlone: true`, which the contract omits but okAloneIdsFromRaw reads.

type DemoMemory = BundleMemory & { okAlone?: true };
type DemoStory = Omit<BundleStory, "memories"> & { memories: DemoMemory[] };
type DemoSlot = Omit<BundleSlot, "story"> & { story: DemoStory | null };
type DemoRoom = Omit<BundleRoom, "slots"> & { slots: DemoSlot[] };
export type DemoBundleFile = Omit<HouseBundle, "rooms"> & { rooms: DemoRoom[] };

/** Removes the `t` query parameter that fileUrl adds to /api/files URLs. */
export function stripToken(url: string): string {
  if (!url.startsWith("/api/files/")) return url;
  const [pathPart, query = ""] = url.split("?");
  const rest = query.split("&").filter((p) => p && !p.startsWith("t="));
  return rest.length > 0 ? `${pathPart}?${rest.join("&")}` : pathPart;
}

export function exportDemoBundle(source: BundleSource): DemoBundleFile {
  const { bundle, okAloneIds } = buildBundle(source);
  const opt = (url: string | undefined) => (url ? stripToken(url) : url);
  return {
    ...bundle,
    rooms: bundle.rooms.map((room) => ({
      ...room,
      background: stripToken(room.background),
      slots: room.slots.map((slot) => ({
        ...slot,
        story: slot.story
          ? {
              ...slot.story,
              object: { ...slot.story.object, url: stripToken(slot.story.object.url) },
              memories: slot.story.memories.map((m) => ({
                ...m,
                polaroidUrl: stripToken(m.polaroidUrl),
                scenes: m.scenes.map((s) => ({
                  ...s,
                  url: stripToken(s.url),
                  stillUrl: opt(s.stillUrl),
                })),
                songUrl: opt(m.songUrl),
                ambienceUrl: opt(m.ambienceUrl),
                voiceUrl: opt(m.voiceUrl),
                ...(okAloneIds.has(m.id) ? { okAlone: true as const } : {}),
              })),
            }
          : null,
      })),
    })),
    files: bundle.files.map(stripToken),
  };
}
