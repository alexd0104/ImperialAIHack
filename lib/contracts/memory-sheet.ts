import { z } from "zod";

/**
 * The single contract every creation method fills (Studio form today, text and
 * voice agents later). Exactly TECHNICAL.md §4.2.
 */
export const MemorySheet = z.object({
  title: z.string().max(80),
  people: z.array(z.string().max(60)).max(10),
  place: z.string().max(120).optional(),
  when: z.string().max(40).optional(),
  soundOfPlace: z.string().max(160).optional(),
  songAssetId: z.string().optional(),
  message: z.string().max(400).optional(),
  voiceAssetId: z.string().optional(),
  colour: z.enum(["keep_bw", "colourise", "already_colour"]),
  restore: z.boolean().default(true),
  motion: z.enum(["gentle", "still"]).default("gentle"),
  // Reaches a model only through lib/ai/prompt-compiler.ts.
  freeText: z.string().max(500).optional(),
  okAlone: z.boolean().default(false),
  source: z.enum(["form", "text_agent", "voice_agent"]).default("form"),
});
export type MemorySheet = z.infer<typeof MemorySheet>;
export type MemorySheetInput = z.input<typeof MemorySheet>;

/**
 * Answers to the guided questions, saved as the family goes. Partial so a
 * half-filled form can be stored; the server builds the MemorySheet from it.
 * freeText and okAlone live on the Memory itself; source is set by the server.
 * Built field by field (not `.partial()`) so the sheet's defaults never apply:
 * a PATCH that sets only `place` must not reset `restore` or `motion`.
 */
const sheet = MemorySheet.shape;
export const MemoryAnswers = z.object({
  title: sheet.title.optional(),
  people: sheet.people.optional(),
  place: sheet.place,
  when: sheet.when,
  soundOfPlace: sheet.soundOfPlace,
  songAssetId: sheet.songAssetId,
  message: sheet.message,
  voiceAssetId: sheet.voiceAssetId,
  colour: sheet.colour.optional(),
  restore: z.boolean().optional(),
  motion: z.enum(["gentle", "still"]).optional(),
});
export type MemoryAnswers = z.infer<typeof MemoryAnswers>;
