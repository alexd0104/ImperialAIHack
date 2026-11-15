import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { HouseBundle, type HouseMode } from "@/lib/contracts";
import { db, findHouseByToken } from "@/lib/db";
import { applyMode, buildBundle, okAloneIdsFromRaw, tokeniseBundle } from "./bundle";

// Server side of GET /api/h/:token/bundle. Demo mode (B33) reads the demo House live from
// the DB, so what the family changes in the Studio shows at once; when the DB does not answer
// quickly (stage Wi-Fi gone) it falls back to demo-assets/bundle.json, so the demo still runs
// offline (TECHNICAL.md §6).

/** How long the demo House waits for the DB before it plays the saved bundle instead. */
export const DEMO_DB_TIMEOUT_MS = 2500;

/** Resolves to null (instead of throwing or hanging) when `work` fails or is too slow. */
export async function orNullWithin<T>(
  work: () => Promise<T | null>,
  ms: number,
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  try {
    return await Promise.race([work().catch(() => null), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/** Same rule as /api/files: demo access only when DEMO_HOUSE_TOKEN is set explicitly. */
export function isDemoToken(token: string): boolean {
  const demoToken = process.env.DEMO_HOUSE_TOKEN;
  return process.env.HOUSE_DEMO_MODE === "true" && Boolean(demoToken) && token === demoToken;
}

async function loadDemoBundle(token: string, mode: HouseMode): Promise<HouseBundle | null> {
  const file = path.resolve(process.env.DEMO_ASSETS_DIR || "./demo-assets", "bundle.json");
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
  const parsed = HouseBundle.safeParse(raw);
  if (!parsed.success) return null;
  return applyMode(tokeniseBundle(parsed.data, token), mode, okAloneIdsFromRaw(raw));
}

async function loadDbBundle(token: string, mode: HouseMode): Promise<HouseBundle | null> {
  const house = await findHouseByToken(token);
  if (!house) return null;
  const houseId = house.id;
  const [rooms, stories, memories, scenes, assets] = await Promise.all([
    db.rooms.find({ houseId }),
    db.stories.find({ houseId, publishedAt: { $exists: true } }),
    db.memories.find({ houseId, status: { $in: ["approved", "published"] } }),
    db.scenes.find({ houseId }),
    db.assets.find({ houseId }),
  ]);
  const { bundle, okAloneIds } = buildBundle({
    house,
    token,
    rooms,
    stories,
    memories,
    scenes,
    assets,
  });
  return applyMode(bundle, mode, okAloneIds);
}

/** null = unknown or revoked token (or demo bundle missing): the route answers 404. */
export async function loadHouseBundle(token: string, mode: HouseMode): Promise<HouseBundle | null> {
  if (!isDemoToken(token)) return loadDbBundle(token, mode);
  const live = await orNullWithin(() => loadDbBundle(token, mode), DEMO_DB_TIMEOUT_MS);
  return live ?? loadDemoBundle(token, mode);
}
