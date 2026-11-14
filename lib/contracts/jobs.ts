import { z } from "zod";
import { Id, IsoDate } from "./entities";

export const JobType = z.enum(["scene", "room_background", "object_3d"]);
export type JobType = z.infer<typeof JobType>;

export const StepName = z.enum([
  "compile",
  "upload",
  "restore",
  "colourise",
  "animate",
  "ambience",
  "cutout",
  "model3d",
  "compress",
  "room_edit",
  "finalize",
]);
export type StepName = z.infer<typeof StepName>;

export const StepStatus = z.enum(["pending", "running", "done", "skipped", "failed"]);
export type StepStatus = z.infer<typeof StepStatus>;

export const JobStatus = z.enum(["queued", "running", "done", "fallback", "failed"]);
export type JobStatus = z.infer<typeof JobStatus>;

export const FINAL_JOB_STATUSES = [
  "done",
  "fallback",
  "failed",
] as const satisfies readonly JobStatus[];

export const JobStep = z.object({
  name: StepName,
  status: StepStatus,
  model: z.string().optional(),
  falRequestId: z.string().optional(),
  /** Storage path of the step output. */
  output: z.string().optional(),
  /** `/api/files/...` URL of the output, for Studio previews. */
  previewUrl: z.string().optional(),
  costUsd: z.number().nonnegative().optional(),
  attempts: z.number().int().nonnegative().default(0),
  error: z.string().optional(),
  cacheHit: z.boolean().optional(),
});
export type JobStep = z.infer<typeof JobStep>;

export const Job = z.object({
  id: Id,
  type: JobType,
  houseId: Id,
  memoryId: Id.optional(),
  sceneId: Id.optional(),
  storyId: Id.optional(),
  roomId: Id.optional(),
  steps: z.array(JobStep).min(1),
  current: z.number().int().nonnegative(),
  status: JobStatus,
  bypassCache: z.boolean().optional(),
  lockedUntil: IsoDate.nullable().optional(),
  falKeyLabel: z.string(),
  createdAt: IsoDate,
  updatedAt: IsoDate,
});
export type Job = z.infer<typeof Job>;

/** What the browser sees: no fal request ids, costs, key labels or leases. */
export const JobStepView = JobStep.omit({
  falRequestId: true,
  output: true,
  costUsd: true,
  model: true,
});
export type JobStepView = z.infer<typeof JobStepView>;

export const JobView = Job.omit({
  falKeyLabel: true,
  lockedUntil: true,
  bypassCache: true,
}).extend({ steps: z.array(JobStepView).min(1) });
export type JobView = z.infer<typeof JobView>;

/** One cached model output (TECHNICAL.md §5.2 step 3): same key → reuse, no fal call. */
export const GenerationCacheEntry = z.object({
  id: Id,
  key: z.string().min(1),
  model: z.string(),
  outputPath: z.string(),
  costUsd: z.number().nonnegative(),
  createdAt: IsoDate,
});
export type GenerationCacheEntry = z.infer<typeof GenerationCacheEntry>;
