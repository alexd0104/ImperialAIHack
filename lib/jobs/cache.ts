import "server-only";
import { createHash } from "node:crypto";

/** JSON with object keys sorted at every depth, so equal params always hash the same. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/**
 * TECHNICAL.md §5.2: sha256(model + sortedParams + inputFileSha256). Prompt text
 * is inside params; the input's fal URL is not (it changes on every upload).
 */
export function cacheKey(
  modelId: string,
  params: Record<string, unknown>,
  inputSha256 = "",
): string {
  return createHash("sha256")
    .update(modelId)
    .update(stableStringify(params))
    .update(inputSha256)
    .digest("hex");
}
