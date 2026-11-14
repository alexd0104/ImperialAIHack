import { z } from "zod";
import { MemoryAnswers, MemorySheet } from "./memory-sheet";

// API-facing shapes: string ids and ISO date strings. lib/db maps ObjectId/Date.
export const Id = z.string().min(1);
export const IsoDate = z.iso.datetime({ offset: true });

export const RoomStyle = z.enum(["garden", "kitchen", "living"]);
export type RoomStyle = z.infer<typeof RoomStyle>;

export const House = z.object({
  id: Id,
  firstName: z.string().min(1).max(40),
  // Never sent to the browser except by GET /api/houses/:id/link.
  token: z.string().optional(),
  tokenRevoked: z.boolean().default(false),
  dontShow: z.array(z.string().max(80)).default([]),
  consentAt: IsoDate,
  createdAt: IsoDate,
  updatedAt: IsoDate.optional(),
});
export type House = z.infer<typeof House>;

/** Normalised 0..1 on the 1194×834 room canvas. */
export const Slot = z.object({
  id: Id,
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  scale: z.number().positive().max(1),
  storyId: Id.optional(),
});
export type Slot = z.infer<typeof Slot>;

export const Room = z.object({
  id: Id,
  houseId: Id,
  name: z.string().min(1).max(60),
  source: z.enum(["style", "photo"]),
  style: RoomStyle.optional(),
  /** Storage path or public path; the API exposes it as a URL. */
  backgroundPath: z.string(),
  backgroundJobId: Id.optional(),
  slots: z.array(Slot),
  createdAt: IsoDate,
});
export type Room = z.infer<typeof Room>;

export const StoryObject = z.object({
  kind: z.enum(["glb", "svg"]),
  /** Library name (svg) or storage path (glb). */
  path: z.string(),
  jobId: Id.optional(),
});
export type StoryObject = z.infer<typeof StoryObject>;

export const Story = z.object({
  id: Id,
  houseId: Id,
  roomId: Id,
  slotId: Id,
  title: z.string().min(1).max(80),
  object: StoryObject,
  memoryOrder: z.array(Id).default([]),
  publishedAt: IsoDate.optional(),
  createdAt: IsoDate,
});
export type Story = z.infer<typeof Story>;

export const MemoryStatus = z.enum([
  "draft",
  "generating",
  "ready_for_review",
  "approved",
  "published",
]);
export type MemoryStatus = z.infer<typeof MemoryStatus>;

export const Memory = z.object({
  id: Id,
  houseId: Id,
  storyId: Id,
  title: z.string().min(1).max(80),
  answers: MemoryAnswers.default({}),
  freeText: z.string().max(500).optional(),
  /** Rebuilt by the server on every PATCH; absent until the first answers. */
  sheet: MemorySheet.optional(),
  okAlone: z.boolean().default(false),
  status: MemoryStatus,
  createdAt: IsoDate,
  updatedAt: IsoDate.optional(),
});
export type Memory = z.infer<typeof Memory>;

export const AssetKind = z.enum(["photo", "video", "song", "voice", "audio"]);
export type AssetKind = z.infer<typeof AssetKind>;

export const Asset = z.object({
  id: Id,
  houseId: Id,
  memoryId: Id.optional(),
  kind: AssetKind,
  path: z.string(),
  /** `/api/files/...` URL, filled by the API layer. */
  url: z.string().optional(),
  mime: z.string(),
  bytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  durationMs: z.number().int().nonnegative().optional(),
  falUrl: z.string().optional(),
  falUrlExpiresAt: IsoDate.optional(),
  createdAt: IsoDate,
});
export type Asset = z.infer<typeof Asset>;

/** What the browser sees: a URL, never the storage path or fal upload URL. */
export const AssetView = Asset.omit({
  path: true,
  falUrl: true,
  falUrlExpiresAt: true,
}).extend({ url: z.string() });
export type AssetView = z.infer<typeof AssetView>;

export const SceneStatus = z.enum(["pending", "generating", "done", "fallback", "failed"]);
export type SceneStatus = z.infer<typeof SceneStatus>;

/** Storage paths of each generated variant. */
export const SceneOutputs = z.object({
  restored: z.string().optional(),
  colourised: z.string().optional(),
  clip: z.string().optional(),
  ambience: z.string().optional(),
});
export type SceneOutputs = z.infer<typeof SceneOutputs>;

export const SceneChoice = z.object({
  use: z.enum(["animated", "still"]),
  colour: z.enum(["bw", "colour"]),
  restored: z.boolean(),
  chosenAt: IsoDate.optional(),
});
export type SceneChoice = z.infer<typeof SceneChoice>;

export const Scene = z.object({
  id: Id,
  houseId: Id,
  memoryId: Id,
  assetId: Id,
  order: z.number().int().nonnegative(),
  outputs: SceneOutputs.default({}),
  choice: SceneChoice.optional(),
  status: SceneStatus,
  jobId: Id.optional(),
  createdAt: IsoDate,
});
export type Scene = z.infer<typeof Scene>;

export const EventType = z.enum(["heart", "view_started", "view_completed"]);
export type EventType = z.infer<typeof EventType>;

export const Event = z.object({
  id: Id,
  houseId: Id,
  memoryId: Id,
  type: EventType,
  mode: z.enum(["together", "alone"]).optional(),
  at: IsoDate,
});
export type Event = z.infer<typeof Event>;
