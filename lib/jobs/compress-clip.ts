import "server-only";
import { execFile } from "node:child_process";
import { rename, rm, stat } from "node:fs/promises";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Longest side of a House clip: the tablet is 1194×834, so 1280 keeps it sharp. */
export const CLIP_MAX_SIDE = 1280;

/**
 * Re-encodes a generated clip for the tablet, in place: ≤ 1280 px, H.264, fast start.
 * A raw Kling clip is ~30 MB for 10 s (1660×1244); this brings it to a few MB so the House
 * preloads it quickly. Never throws: if ffmpeg is missing or fails, the original stays.
 */
export async function compressClip(absPath: string): Promise<{ before: number; after: number }> {
  const before = (await stat(absPath)).size;
  const tmp = `${absPath}.small.mp4`;
  try {
    await run(
      "ffmpeg",
      [
        "-v",
        "error",
        "-y",
        "-i",
        absPath,
        "-map",
        "0:v:0",
        "-map",
        "0:a?",
        "-vf",
        `scale=w='min(${CLIP_MAX_SIDE},iw)':h='min(${CLIP_MAX_SIDE},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "24",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-c:a",
        "aac",
        "-b:a",
        "96k",
        tmp,
      ],
      { timeout: 90_000 },
    );
    const after = (await stat(tmp)).size;
    if (after > 0 && after < before) {
      await rename(tmp, absPath);
      return { before, after };
    }
  } catch (error) {
    console.warn(`[jobs] clip compression skipped, keeping the original: ${String(error)}`);
  }
  await rm(tmp, { force: true });
  return { before, after: before };
}
