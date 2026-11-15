import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { HouseBundle, type HouseMode } from "@/lib/contracts";
import { db, findHouseByToken } from "@/lib/db";
import { applyMode, buildBundle, okAloneIdsFromRaw, tokeniseBundle } from "./bundle";

// Server side of GET /api/h/:token/bundle. Demo mode reads demo-assets/bundle.json and
// never touches the DB, so the stage demo runs offline (TECHNICAL.md §6).

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
export function loadHouseBundle(token: string, mode: HouseMode): Promise<HouseBundle | null> {
  return isDemoToken(token) ? loadDemoBundle(token, mode) : loadDbBundle(token, mode);
}
