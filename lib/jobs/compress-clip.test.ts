import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CLIP_MAX_SIDE, compressClip } from "./compress-clip";

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

let dir: string;
beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), "memorai-clip-"));
});
afterAll(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("compressClip", () => {
  it.skipIf(!hasFfmpeg)("shrinks a large clip to ≤ 1280 px, in place", async () => {
    const clip = join(dir, "animate.mp4");
    // A busy 1660×1244 test pattern at high bitrate stands in for a raw Kling clip.
    execFileSync("ffmpeg", [
      ...["-v", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=1660x1244:rate=24:duration=2"],
      ...["-c:v", "libx264", "-preset", "ultrafast", "-qp", "5", clip],
    ]);
    const { before, after } = await compressClip(clip);
    expect(after).toBeLessThan(before);
    expect((await stat(clip)).size).toBe(after);
    const size = execFileSync("ffprobe", [
      ...["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height"],
      ...["-of", "csv=p=0", clip],
    ])
      .toString()
      .trim()
      .split(",")
      .map(Number);
    expect(Math.max(...size)).toBeLessThanOrEqual(CLIP_MAX_SIDE);
    expect(await readdir(dir)).toEqual(["animate.mp4"]);
  });

  it("keeps the original when the file is not a video", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad = join(dir, "bad.mp4");
    await writeFile(bad, "not a video");
    const out = await compressClip(bad);
    expect(out.after).toBe(out.before);
    expect((await stat(bad)).size).toBe(11);
  });
});
