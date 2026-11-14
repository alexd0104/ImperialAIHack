import "server-only";
import { type ClaudePromptClient, getClaude } from "./claude";
import { DEFAULT_NEGATIVE_PROMPT, NO_MUSIC, templatePrompts } from "./prompt-templates";
import { CompiledPrompts, type PromptCompilerInput } from "./prompt-types";

export type PromptSource = "claude" | "mock" | "template";

export interface CompiledPromptsResult extends CompiledPrompts {
  source: PromptSource;
}

/**
 * The only way a prompt reaches a model (AGENTS.md §3.1). Never throws: if
 * Claude fails or returns something invalid, fixed templates take over so a
 * scene can always be generated.
 */
export async function compilePrompts(
  input: PromptCompilerInput,
  deps: { claude?: ClaudePromptClient } = {},
): Promise<CompiledPromptsResult> {
  try {
    const client = deps.claude ?? getClaude();
    const parsed = CompiledPrompts.safeParse(await client.compilePrompts(input));
    if (!parsed.success) throw new Error(`invalid output: ${parsed.error.message}`);
    return enforce(parsed.data, input, client.mode === "live" ? "claude" : "mock");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[prompt-compiler] using templates: ${message}`);
    return enforce(templatePrompts(input), input, "template");
  }
}

// Keeps the video model's negative prompt within input limits.
const MAX_NEGATIVE_PROMPT_CHARS = 500;

/** Guarantees that hold whatever the model (or the mock fixture) wrote. */
function enforce(
  prompts: CompiledPrompts,
  { sheet }: PromptCompilerInput,
  source: PromptSource,
): CompiledPromptsResult {
  const extraNegative = prompts.negativePrompt.trim().slice(0, MAX_NEGATIVE_PROMPT_CHARS);
  const negativePrompt =
    extraNegative.length === 0 || extraNegative === DEFAULT_NEGATIVE_PROMPT
      ? DEFAULT_NEGATIVE_PROMPT
      : extraNegative.startsWith(DEFAULT_NEGATIVE_PROMPT)
        ? extraNegative
        : `${DEFAULT_NEGATIVE_PROMPT}, ${extraNegative}`;
  const ambience = prompts.ambiencePrompt.trim();
  const ambiencePrompt = /\bno music\b/i.test(ambience)
    ? ambience
    : [ambience, NO_MUSIC].filter(Boolean).join(", ");
  return {
    ...prompts,
    motionPrompt: prompts.motionPrompt.trim(),
    negativePrompt,
    ambiencePrompt,
    // The family's choice decides colourisation, never the model.
    colourStyle:
      sheet.colour === "colourise" ? prompts.colourStyle.trim() || "contemporary color" : "none",
    source,
  };
}
