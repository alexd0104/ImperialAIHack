import "server-only";
import sharp from "sharp";
import { extractOutput, getFal } from "./fal";
import { aiMode } from "./mode";

export const ROOM_WIDTH = 1194;
export const ROOM_HEIGHT = 834;
export const ROOM_MAX_BYTES = 400 * 1024;

// "Add nothing" is the product rule (no false memories): tidy and light only.
export const ROOM_CLEANUP_PROMPT =
  "Tidy and light this room exactly as it is: remove any people, pets and loose clutter, " +
  "even out the lighting. Keep the same room, furniture, layout and camera angle. " +
  "Do not add any person, object, furniture or decoration.";

/** Crops to the tablet ratio and re-encodes under 400 KB (quality steps down until it fits). */
export async function fitRoomPhoto(input: Buffer): Promise<Buffer> {
  const base = sharp(input)
    .rotate()
    .resize(ROOM_WIDTH, ROOM_HEIGHT, { fit: "cover", position: "centre" });
  let out = Buffer.alloc(0);
  for (const quality of [85, 78, 70, 62, 54, 46]) {
    out = await base.clone().jpeg({ quality, mozjpeg: true }).toBuffer();
    if (out.length <= ROOM_MAX_BYTES) return out;
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Room cleanup shared by the demo rooms script and the Studio (S11). Mock mode only
 * crops/resizes the source; live mode sends it through the fal image edit first.
 */
export async function cleanRoomPhoto(input: Buffer): Promise<Buffer> {
  const mode = aiMode();
  if (mode !== "live") return fitRoomPhoto(input);
  const fal = getFal(mode);
  const source = await sharp(input).rotate().jpeg({ quality: 90 }).toBuffer();
  const imageUrl = await fal.upload(new Blob([new Uint8Array(source)], { type: "image/jpeg" }));
  const requestId = await fal.submit("roomEdit", {
    prompt: ROOM_CLEANUP_PROMPT,
    image_urls: [imageUrl],
  });
  for (let i = 0; i < 100; i++) {
    if ((await fal.status("roomEdit", requestId)) === "COMPLETED") break;
    await sleep(3000);
  }
  const { data } = await fal.result("roomEdit", requestId);
  const res = await fetch(extractOutput("roomEdit", data).url);
  if (!res.ok) throw new Error(`room edit download failed (${res.status})`);
  return fitRoomPhoto(Buffer.from(await res.arrayBuffer()));
}
