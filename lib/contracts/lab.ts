import { z } from "zod";
import { Id, IsoDate } from "./entities";
import { MemorySheet } from "./memory-sheet";

// Contracts v2 (F7): the creation-method lab (`ENABLE_LAB`). One run = one photo put
// through one approach, with what went in, what came out and the family's scores.

export const LabApproach = z.enum(["questions", "free_text", "photo_questions", "agent"]);
export type LabApproach = z.infer<typeof LabApproach>;

const Score = z.number().int().min(1).max(5);

export const LabScores = z.object({
  fidelity: Score,
  motion: Score,
  sound: Score,
  liked: Score,
});
export type LabScores = z.infer<typeof LabScores>;

export const LabRun = z.object({
  id: Id,
  approach: LabApproach,
  photoAssetId: Id,
  /** Raw answers / text / agent transcript, depending on the approach. */
  inputs: z.record(z.string(), z.unknown()),
  sheet: MemorySheet,
  /** Compiled model prompts (shape owned by lib/ai/prompt-types.ts). */
  prompts: z.record(z.string(), z.unknown()),
  /** Storage paths of the generated outputs, by step name. */
  outputs: z.record(z.string(), z.string()),
  scores: LabScores.optional(),
  createdAt: IsoDate,
});
export type LabRun = z.infer<typeof LabRun>;
