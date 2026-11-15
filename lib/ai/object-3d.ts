import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { compressGlb } from "@/lib/jobs/compress-glb";
import { extractOutput, getFal, MOCK_MEDIA_DIR } from "./fal";
import { aiMode } from "./mode";
import type { FalModelKey } from "./models";
import { defaultObjectName } from "./object-names";

export { defaultObjectName };

export const THUMB_SIZE = 256;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function thumbnail(png: Buffer): Promise<Buffer> {
  return sharp(png)
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
}

/**
 * Same chain as the Studio's 3D Object job (cutout → Rodin → GLB compress), run directly
 * for the default objects. Mock mode returns the mock GLB so the rest is testable offline.
 */
export async function makeDefaultObject(source: Buffer): Promise<{ glb: Buffer; thumb: Buffer }> {
  const mode = aiMode();
  if (mode !== "live") {
    const glb = await readFile(path.join(MOCK_MEDIA_DIR, "object.glb"));
    const cut = await readFile(path.join(MOCK_MEDIA_DIR, "cutout.png")).catch(() => null);
    return { glb, thumb: await thumbnail(cut ?? (await sharp(source).rotate().png().toBuffer())) };
  }
  const fal = getFal(mode);
  const run = async (model: FalModelKey, input: Record<string, unknown>) => {
    const id = await fal.submit(model, input);
    for (let i = 0; i < 200; i++) {
      if ((await fal.status(model, id)) === "COMPLETED") break;
      await sleep(3000);
    }
    const { data } = await fal.result(model, id);
    const res = await fetch(extractOutput(model, data).url);
    if (!res.ok) throw new Error(`${model} download failed (${res.status})`);
    return Buffer.from(await res.arrayBuffer());
  };
  const jpeg = await sharp(source).rotate().jpeg({ quality: 90 }).toBuffer();
  const url = await fal.upload(new Blob([new Uint8Array(jpeg)], { type: "image/jpeg" }));
  const cut = await run("cutout", { image_url: url });
  const cutUrl = await fal.upload(new Blob([new Uint8Array(cut)], { type: "image/png" }));
  const raw = await run("model3d", {
    image_urls: [cutUrl],
    tier: "Gen-2.5-Extreme-Low",
    geometry_file_format: "glb",
  });
  let glb = raw;
  try {
    glb = Buffer.from(await compressGlb(raw));
  } catch (error) {
    console.warn(`compress failed, keeping raw GLB: ${String(error)}`);
  }
  return { glb, thumb: await thumbnail(cut) };
}
