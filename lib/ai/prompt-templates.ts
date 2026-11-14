import "server-only";
import type { CompiledPrompts, PromptCompilerInput } from "./prompt-types";

/** TECHNICAL.md §7.2. Every negative prompt sent to a model starts with this. */
export const DEFAULT_NEGATIVE_PROMPT =
  "new people, extra people, new objects, face change, morphing, distorted face, fast motion, camera cut, text, watermark";

export const NO_MUSIC = "no music";

const MOTION_TEMPLATE =
  "Very subtle natural motion of what is already in the photo: gentle breathing, a slight movement of hair and clothes, soft shifting light. Every person, object and place stays exactly as in the photo. Static camera, no cuts.";

const AMBIENCE_FALLBACK = "soft room tone, quiet natural ambience";

/**
 * Used when Claude is down, misbehaves or returns something invalid. Free text
 * is deliberately ignored here: without a model to read it we cannot tell a
 * harmless detail from a request to add something absent.
 */
export function templatePrompts({ sheet }: PromptCompilerInput): CompiledPrompts {
  const sound =
    sheet.soundOfPlace?.trim() || (sheet.place ? `ambience of ${sheet.place.trim()}` : "");
  return {
    motionPrompt: MOTION_TEMPLATE,
    negativePrompt: DEFAULT_NEGATIVE_PROMPT,
    ambiencePrompt: `${sound || AMBIENCE_FALLBACK}, ${NO_MUSIC}`,
    colourStyle: sheet.colour === "colourise" ? "contemporary color" : "none",
    refusedRequests: [],
  };
}
