import { z } from "zod";
import type { MemorySheet, SceneMotion } from "@/lib/contracts";

/**
 * Output of the prompt compiler (TECHNICAL.md §7.2). Kept in lib/ai: only the
 * pipeline produces or reads it. Plain strings (no length limits) because the
 * same schema is sent to Claude as the structured-output format.
 */
export const CompiledPrompts = z.object({
  motionPrompt: z.string(),
  negativePrompt: z.string(),
  ambiencePrompt: z.string(),
  colourStyle: z.string(),
  refusedRequests: z.array(z.string()),
  // Contracts v2 (F7), filled by P7/P8. Optional so v1 compiler output still parses.
  /** Explicit sounds heard in the scene ("waves breaking", "people laughing"). */
  soundEvents: z.array(z.string()).optional(),
  /** MMAudio negative prompt ("static, hiss, hum, music, speech"). */
  ambienceNegativePrompt: z.string().optional(),
  /** Gentle reason when the family's motion text asked for something not in the photo. */
  motionRefused: z.string().optional(),
});
export type CompiledPrompts = z.infer<typeof CompiledPrompts>;

export interface PromptCompilerInput {
  sheet: MemorySheet;
  /** Short neutral description of what the photo shows (who, where, objects). */
  photoDescription?: string;
  /** The family's per-photo motion choice (P7). Absent → gentle. */
  motion?: SceneMotion;
}
