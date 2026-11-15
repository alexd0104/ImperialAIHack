import { z } from "zod";

// What the House downloads. Exactly TECHNICAL.md §4.2.

export const BundleScene = z.object({
  kind: z.enum(["clip", "photo", "video"]),
  url: z.string(),
  durationMs: z.number(),
  /** The scene's chosen still; the House shows it if the clip can't play (B10). */
  stillUrl: z.string().optional(),
  /** Quiet library ambience loop under the scene sound (P9). */
  bedUrl: z.string().optional(),
});
export type BundleScene = z.infer<typeof BundleScene>;

export const BundleMemory = z.object({
  id: z.string(),
  title: z.string(),
  polaroidUrl: z.string(),
  caption: z.string().optional(),
  scenes: z.array(BundleScene),
  songUrl: z.string().optional(),
  ambienceUrl: z.string().optional(),
  voiceUrl: z.string().optional(),
  voiceDurationMs: z.number().optional(),
});
export type BundleMemory = z.infer<typeof BundleMemory>;

export const BundleStory = z.object({
  id: z.string(),
  title: z.string(),
  object: z.object({ kind: z.enum(["glb", "svg"]), url: z.string() }),
  /** false in alone mode if no OK-alone Memory. */
  available: z.boolean(),
  /** Resolved placement: Story.position, else its Slot (v2, F7; set by the bundle builder). */
  position: z.object({ x: z.number(), y: z.number(), scale: z.number() }).optional(),
  memories: z.array(BundleMemory),
});
export type BundleStory = z.infer<typeof BundleStory>;

export const BundleSlot = z.object({
  id: z.string(),
  // Normalised 0..1 on 1194×834.
  x: z.number(),
  y: z.number(),
  scale: z.number(),
  /** null = empty slot. */
  story: BundleStory.nullable(),
});
export type BundleSlot = z.infer<typeof BundleSlot>;

export const BundleRoom = z.object({
  id: z.string(),
  name: z.string(),
  background: z.string(),
  slots: z.array(BundleSlot),
});
export type BundleRoom = z.infer<typeof BundleRoom>;

export const HouseMode = z.enum(["together", "alone"]);
export type HouseMode = z.infer<typeof HouseMode>;

export const HouseBundle = z.object({
  house: z.object({
    firstName: z.string(),
    avatars: z.array(z.object({ initial: z.string(), color: z.string() })),
  }),
  mode: HouseMode,
  /** Changes whenever the House content changes, so an open House can refresh (v2, F7). */
  version: z.string().optional(),
  rooms: z.array(BundleRoom),
  /** Every URL to preload. */
  files: z.array(z.string()),
});
export type HouseBundle = z.infer<typeof HouseBundle>;
