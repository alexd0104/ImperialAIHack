import { z } from "zod";
import {
  AssetKind,
  AssetView,
  EventType,
  House,
  Id,
  IsoDate,
  Memory,
  Room,
  RoomStyle,
  Scene,
  SceneOutputs,
  Story,
} from "./entities";
import { HouseMode } from "./house-bundle";
import { JobView } from "./jobs";
import { MemoryAnswers } from "./memory-sheet";

// Request/response bodies of every route in TECHNICAL.md §4.3. Responses are
// the `data` payload; wrap with apiSuccess() from ./errors for the envelope.

export const IdParams = z.object({ id: Id });
export const TokenParams = z.object({ token: z.string().min(1) });

export const OkResponse = z.object({ ok: z.literal(true) });
export type OkResponse = z.infer<typeof OkResponse>;
export const DeletedResponse = z.object({ deleted: z.literal(true) });
export type DeletedResponse = z.infer<typeof DeletedResponse>;

// ── Auth ─────────────────────────────────────────────────────────────
// POST /api/auth/login → OkResponse
export const LoginRequest = z.object({ password: z.string().min(1) });
export type LoginRequest = z.infer<typeof LoginRequest>;

// ── Houses ───────────────────────────────────────────────────────────
// POST /api/houses → House
export const CreateHouseRequest = z.object({
  firstName: z.string().trim().min(1).max(40),
  consent: z.literal(true),
});
export type CreateHouseRequest = z.infer<typeof CreateHouseRequest>;

export const StorySummary = Story.pick({
  id: true,
  roomId: true,
  slotId: true,
  title: true,
  publishedAt: true,
}).extend({
  memoryCount: z.number().int().nonnegative(),
  objectUrl: z.string().optional(),
});
export type StorySummary = z.infer<typeof StorySummary>;

// GET /api/houses/:id → HouseDetail
export const HouseDetail = House.extend({
  rooms: z.array(Room.extend({ backgroundUrl: z.string().optional() })),
  stories: z.array(StorySummary),
});
export type HouseDetail = z.infer<typeof HouseDetail>;

// PATCH /api/houses/:id → House
export const UpdateHouseRequest = z.object({
  firstName: z.string().trim().min(1).max(40).optional(),
  dontShow: z.array(z.string().max(80)).optional(),
});
export type UpdateHouseRequest = z.infer<typeof UpdateHouseRequest>;

// DELETE /api/houses/:id → DeletedResponse

// ── Rooms ────────────────────────────────────────────────────────────
// POST /api/houses/:id/rooms → Room (backgroundJobId set when source=photo)
export const CreateRoomRequest = z.discriminatedUnion("source", [
  z.object({
    name: z.string().trim().min(1).max(60),
    source: z.literal("style"),
    style: RoomStyle,
  }),
  z.object({
    name: z.string().trim().min(1).max(60),
    source: z.literal("photo"),
    assetId: Id,
  }),
]);
export type CreateRoomRequest = z.infer<typeof CreateRoomRequest>;

// ── Stories ──────────────────────────────────────────────────────────
// POST /api/rooms/:id/stories → Story (object.jobId set when kind=photo)
export const CreateStoryRequest = z.object({
  slotId: Id,
  title: z.string().trim().min(1).max(80),
  object: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("photo"), assetId: Id }),
    z.object({ kind: z.literal("library"), name: z.string().regex(/^[a-z0-9-]{1,40}$/) }),
  ]),
});
export type CreateStoryRequest = z.infer<typeof CreateStoryRequest>;

// PATCH /api/stories/:id → Story
export const UpdateStoryRequest = z.object({
  title: z.string().trim().min(1).max(80).optional(),
  memoryOrder: z.array(Id).optional(),
  slotId: Id.optional(),
});
export type UpdateStoryRequest = z.infer<typeof UpdateStoryRequest>;

// POST /api/stories/:id/publish → Story (409 conflict if a Memory is not approved)
export const PublishStoryRequest = z.object({});
export type PublishStoryRequest = z.infer<typeof PublishStoryRequest>;

// ── Memories ─────────────────────────────────────────────────────────
// POST /api/stories/:id/memories → Memory
export const CreateMemoryRequest = z.object({
  title: z.string().trim().min(1).max(80),
});
export type CreateMemoryRequest = z.infer<typeof CreateMemoryRequest>;

/** Scene with browser-ready URLs for the Studio review screen. */
export const SceneView = Scene.extend({
  originalUrl: z.string().optional(),
  urls: SceneOutputs.default({}),
});
export type SceneView = z.infer<typeof SceneView>;

// GET /api/memories/:id → MemoryDetail
export const MemoryDetail = Memory.extend({
  assets: z.array(AssetView),
  scenes: z.array(SceneView),
  jobs: z.array(JobView).default([]),
});
export type MemoryDetail = z.infer<typeof MemoryDetail>;

// PATCH /api/memories/:id → Memory (sheet rebuilt by the server)
export const UpdateMemoryRequest = z.object({
  answers: MemoryAnswers.optional(),
  freeText: z.string().max(500).optional(),
  okAlone: z.boolean().optional(),
  title: z.string().trim().min(1).max(80).optional(),
});
export type UpdateMemoryRequest = z.infer<typeof UpdateMemoryRequest>;

// ── Assets ───────────────────────────────────────────────────────────
// POST /api/memories/:id/assets (multipart: file + kind) → AssetView
export const UploadAssetFields = z.object({ kind: AssetKind });
export type UploadAssetFields = z.infer<typeof UploadAssetFields>;

const MB = 1024 * 1024;
const AUDIO = {
  maxBytes: 20 * MB,
  mimes: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/wav", "audio/x-wav", "audio/webm"],
};
export const ASSET_LIMITS: Record<AssetKind, { maxBytes: number; mimes: readonly string[] }> = {
  photo: {
    maxBytes: 15 * MB,
    mimes: ["image/jpeg", "image/png", "image/heic", "image/heif"],
  },
  video: { maxBytes: 100 * MB, mimes: ["video/mp4", "video/quicktime"] },
  song: AUDIO,
  voice: AUDIO,
  audio: AUDIO,
};

// DELETE /api/assets/:id → DeletedResponse

// ── Generation ───────────────────────────────────────────────────────
// POST /api/memories/:id/generate → GenerateResponse
export const GenerateRequest = z.object({});
export type GenerateRequest = z.infer<typeof GenerateRequest>;
export const GenerateResponse = z.object({ jobIds: z.array(Id) });
export type GenerateResponse = z.infer<typeof GenerateResponse>;

// GET /api/jobs/:id → JobView (advances it)

// ── Scenes ───────────────────────────────────────────────────────────
// POST /api/scenes/:id/choice → Scene
export const SceneChoiceRequest = z.object({
  use: z.enum(["animated", "still"]),
  colour: z.enum(["bw", "colour"]),
  restored: z.boolean(),
});
export type SceneChoiceRequest = z.infer<typeof SceneChoiceRequest>;

// POST /api/scenes/:id/retry → RetryResponse (bypasses the cache)
export const RetryRequest = z.object({});
export type RetryRequest = z.infer<typeof RetryRequest>;
export const RetryResponse = z.object({ jobId: Id });
export type RetryResponse = z.infer<typeof RetryResponse>;

// ── Feedback & link ──────────────────────────────────────────────────
// GET /api/houses/:id/feedback → FeedbackResponse
export const FeedbackResponse = z.object({
  views: z.number().int().nonnegative(),
  hearts: z.number().int().nonnegative(),
  perMemory: z.array(
    z.object({
      memoryId: Id,
      title: z.string(),
      views: z.number().int().nonnegative(),
      hearts: z.number().int().nonnegative(),
      lastHeartAt: IsoDate.optional(),
    }),
  ),
});
export type FeedbackResponse = z.infer<typeof FeedbackResponse>;

// GET /api/houses/:id/link → LinkResponse
export const LinkResponse = z.object({ url: z.string(), aloneUrl: z.string() });
export type LinkResponse = z.infer<typeof LinkResponse>;

// ── House (token) ────────────────────────────────────────────────────
// GET /api/h/:token/bundle?mode=together|alone → HouseBundle
export const BundleQuery = z.object({ mode: HouseMode.default("together") });
export type BundleQuery = z.infer<typeof BundleQuery>;

// POST /api/h/:token/events → OkResponse
export const HouseEventRequest = z.object({ type: EventType, memoryId: Id });
export type HouseEventRequest = z.infer<typeof HouseEventRequest>;
