import type { BundleSlot, HouseBundle } from "@/lib/contracts";

// H11: decide whether a refetched bundle differs, and which Objects move, appear or go.
// Pure so it can be tested; the 30 s poller and the fades live in the components.

/** Fades out then in at the new place take about this long (brief: ~1.2 s). */
export const MOVE_FADE_MS = 1200;

/** `version` when both bundles carry one, the whole content otherwise. */
export function bundleChanged(current: HouseBundle, next: HouseBundle): boolean {
  if (current.version && next.version) return current.version !== next.version;
  return JSON.stringify(current) !== JSON.stringify(next);
}

export type ObjectDiff = { moved: string[]; added: string[]; removed: string[] };

function byStory(slots: readonly BundleSlot[]): Map<string, BundleSlot> {
  const map = new Map<string, BundleSlot>();
  for (const slot of slots) if (slot.story) map.set(slot.story.id, slot);
  return map;
}

/** Objects keyed by Story id: moved = same Story at another place or size. */
export function diffObjects(prev: readonly BundleSlot[], next: readonly BundleSlot[]): ObjectDiff {
  const before = byStory(prev);
  const after = byStory(next);
  const diff: ObjectDiff = { moved: [], added: [], removed: [] };
  for (const [id, slot] of after) {
    const old = before.get(id);
    if (!old) diff.added.push(id);
    else if (old.x !== slot.x || old.y !== slot.y || old.scale !== slot.scale) diff.moved.push(id);
  }
  for (const id of before.keys()) if (!after.has(id)) diff.removed.push(id);
  return diff;
}
