import { z } from "zod";
import type { MemorySheet } from "@/lib/contracts";

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
});
export type CompiledPrompts = z.infer<typeof CompiledPrompts>;

export interface PromptCompilerInput {
  sheet: MemorySheet;
  /** Short neutral description of what the photo shows (who, where, objects). */
  photoDescription?: string;
}
