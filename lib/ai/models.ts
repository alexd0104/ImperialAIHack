import "server-only";

/**
 * The only place model IDs live (AGENTS.md §6). Source: TECHNICAL.md §7.1.
 * Swapping a model (e.g. Kling → Veo 3.1) is a one-line change here plus a
 * fixture in mocks/fal/<id with "/" replaced by "__">.json.
 *
 * `price.verified: false` = ID, params or price not yet checked on
 * https://fal.ai/models/<id>/api; check before the first live call.
 */

/** `block4mp` = per started 4 megapixels of output (Topaz). */
export type PriceUnit = "image" | "second" | "generation" | "megapixel" | "block4mp";

export interface FalModel {
  readonly id: string;
  /** Merged under the caller's input on every submit (caller wins). */
  readonly defaults: Readonly<Record<string, unknown>>;
  readonly price: { readonly unit: PriceUnit; readonly usd: number; readonly verified: boolean };
  /** Where the main output file sits in the model's response, and its type. */
  readonly output: { readonly path: readonly (string | number)[]; readonly mime: string };
}

export const MODELS = {
  restore: {
    // Verified 2026-11-14: `model` is "Recover 3" (default, rebuilds detail) or
    // "Dust-Scratch V2" (film dust and scratches, priced per started 24 MP instead).
    id: "topaz/restore/image",
    defaults: { model: "Recover 3", output_format: "jpeg" },
    price: { unit: "block4mp", usd: 0.08, verified: true },
    output: { path: ["image", "url"], mime: "image/jpeg" },
  },
  colourise: {
    id: "bria/fibo-edit/colorize",
    defaults: { color: "contemporary color" },
    price: { unit: "image", usd: 0.04, verified: true },
    output: { path: ["image", "url"], mime: "image/jpeg" },
  },
  colouriseFallback: {
    // TODO verify: price.
    id: "fal-ai/ddcolor",
    defaults: {},
    price: { unit: "image", usd: 0.01, verified: false },
    output: { path: ["image", "url"], mime: "image/jpeg" },
  },
  animate: {
    // Verified 2026-11-14: duration "5" | "10" (strings); $0.35 for 5 s, $0.07 per extra second.
    id: "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
    defaults: { duration: "5" },
    price: { unit: "second", usd: 0.07, verified: true },
    output: { path: ["video", "url"], mime: "video/mp4" },
  },
  ambienceClip: {
    id: "fal-ai/mmaudio-v2",
    // mmaudio defaults to 8 s; match the 5 s Kling clip.
    defaults: { duration: 5 },
    price: { unit: "second", usd: 0.001, verified: true },
    // mmaudio returns the input video with the generated sound muxed in.
    output: { path: ["video", "url"], mime: "video/mp4" },
  },
  ambienceStill: {
    id: "fal-ai/mmaudio-v2/text-to-audio",
    defaults: { duration: 5 },
    price: { unit: "second", usd: 0.001, verified: true },
    // Verified 2026-11-14: returns FLAC (served as octet-stream, so the mime is fixed here).
    output: { path: ["audio", "url"], mime: "audio/flac" },
  },
  cutout: {
    // TODO verify: background-removal model ID (BiRefNet) and price.
    id: "fal-ai/birefnet/v2",
    defaults: {},
    price: { unit: "image", usd: 0.005, verified: false },
    output: { path: ["image", "url"], mime: "image/png" },
  },
  model3d: {
    // TODO verify: Rodin param names (tier, format) against the playground.
    id: "fal-ai/hyper3d/rodin/v2.5/fast",
    defaults: { tier: "Gen-2.5-Extreme-Low", geometry_file_format: "glb" },
    price: { unit: "generation", usd: 0.4, verified: true },
    output: { path: ["model_mesh", "url"], mime: "model/gltf-binary" },
  },
  model3dFallback: {
    // TODO verify: Trellis 2 params and price (compare in Test 4).
    id: "fal-ai/trellis-2",
    defaults: { texture_size: 1024 },
    price: { unit: "generation", usd: 0.25, verified: false },
    output: { path: ["model_mesh", "url"], mime: "model/gltf-binary" },
  },
  roomEdit: {
    id: "fal-ai/nano-banana-2/edit",
    defaults: {},
    price: { unit: "image", usd: 0.08, verified: true },
    output: { path: ["images", 0, "url"], mime: "image/jpeg" },
  },
} as const satisfies Record<string, FalModel>;

export type FalModelKey = keyof typeof MODELS;

export const FAL_MODEL_KEYS = Object.keys(MODELS) as FalModelKey[];

/** Estimated cost of one call, for the budget guard (TECHNICAL.md §5.2). */
export function estimateCostUsd(
  key: FalModelKey,
  usage: { seconds?: number; megapixels?: number } = {},
): number {
  const model: FalModel = MODELS[key];
  switch (model.price.unit) {
    case "second": {
      const fromDefaults = Number(model.defaults.duration);
      const seconds = usage.seconds ?? (Number.isFinite(fromDefaults) ? fromDefaults : 5);
      return model.price.usd * seconds;
    }
    case "megapixel":
      // A 2048 px long-edge upload is ≈ 3 MP.
      return model.price.usd * (usage.megapixels ?? 3);
    case "block4mp":
      return model.price.usd * Math.max(1, Math.ceil((usage.megapixels ?? 3) / 4));
    default:
      return model.price.usd;
  }
}

export const CLAUDE_PROMPT_MODEL_DEFAULT = "claude-haiku-5-5";

/** Prompt compiler model; `claude-sonnet-5-5` via env if quality is poor (TECHNICAL.md §7.2). */
export function claudePromptModel(): string {
  return process.env.CLAUDE_PROMPT_MODEL?.trim() || CLAUDE_PROMPT_MODEL_DEFAULT;
}
