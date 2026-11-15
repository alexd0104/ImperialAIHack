// `pnpm beds:make`: generates the six ambience beds (P9) once, live (≈ $0.05), into
// public/beds/<id>.mp3 (mono, 64 kbps, ≤ 300 KB). Needs AI_MODE=live and ffmpeg.
// Run by a human, then commit the mp3 files: generated audio, no copyright issue.
import { execFileSync } from "node:child_process";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { BEDS } from "@/lib/ai/beds";
import { getFal } from "@/lib/ai/fal";

if (process.env.AI_MODE !== "live") {
  console.error("✗ Run with AI_MODE=live (paid, ≈ $0.05): AI_MODE=live pnpm beds:make");
  process.exit(1);
}
const fal = getFal("live");
const dir = path.join(process.cwd(), "public", "beds");
await mkdir(dir, { recursive: true });

const SECONDS = 10;
for (const bed of BEDS) {
  const requestId = await fal.submit("ambienceStill", { prompt: bed.prompt, duration: SECONDS });
  for (;;) {
    if ((await fal.status("ambienceStill", requestId)) === "COMPLETED") break;
    await new Promise((r) => setTimeout(r, 3000));
  }
  const result = await fal.result("ambienceStill", requestId);
  const audio = (result.data as { audio?: { url?: string } }).audio?.url;
  if (!audio) throw new Error(`${bed.id}: no audio url`);
  const raw = path.join(dir, `${bed.id}.flac`);
  await writeFile(raw, Buffer.from(await (await fetch(audio)).arrayBuffer()));
  const out = path.join(dir, `${bed.id}.mp3`);
  // Short fades at both ends so the Howler loop point does not click.
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    raw,
    "-ac",
    "1",
    "-b:a",
    "64k",
    "-af",
    `afade=t=in:d=0.5,afade=t=out:st=${SECONDS - 0.5}:d=0.5`,
    out,
  ]);
  await rm(raw);
  const kb = Math.round((await stat(out)).size / 1024);
  console.log(`${bed.id}.mp3  ${kb} KB${kb > 300 ? "  ⚠ over 300 KB" : ""}`);
}
