import "server-only";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { RoomStyle } from "@/lib/contracts";
import { extractOutput, type FalGateway, getFal, isMockUrl } from "./fal";
import { aiMode } from "./mode";
import { compileRoomPrompt } from "./prompt-compiler";
import { fitRoomPhoto } from "./room-photo";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Room background from a description (B17), sized like every Room (1194×834, ≤ 400 KB).
 * Throws on any failure: the caller then falls back to a standard Room.
 */
export async function generateRoomPhoto(
  description: string,
  opts: { pollMs?: number; fal?: FalGateway } = {},
): Promise<Buffer> {
  const fal = opts.fal ?? getFal(aiMode());
  const requestId = await fal.submit("roomGenerate", { prompt: compileRoomPrompt(description) });
  let done = false;
  // ~60 s at most (a live run takes ~13 s): past that the family gets the standard Room.
  for (let i = 0; i < 30 && !done; i++) {
    done = (await fal.status("roomGenerate", requestId)) === "COMPLETED";
    if (!done) await sleep(opts.pollMs ?? 2000);
  }
  if (!done) throw new Error("room generation timed out");
  const { data } = await fal.result("roomGenerate", requestId);
  const { url } = extractOutput("roomGenerate", data);
  // Mock outputs are local fixtures, read from disk like the job engine does.
  if (isMockUrl(url)) return fitRoomPhoto(await readFile(fileURLToPath(url)));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`room generation download failed (${res.status})`);
  return fitRoomPhoto(Buffer.from(await res.arrayBuffer()));
}

/** The standard Room closest to the description: the fallback, and the Slot layout to start from. */
export function closestRoomStyle(description: string): RoomStyle {
  const text = description.toLowerCase();
  if (/garden|yard|patio|terrace|balcony|porch|outdoor|outside|lawn|veranda/.test(text))
    return "garden";
  if (/kitchen|cook|dining|bak/.test(text)) return "kitchen";
  return "living";
}
