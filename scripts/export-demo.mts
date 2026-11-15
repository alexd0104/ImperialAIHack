// `pnpm export:demo`: rewrites DEMO_ASSETS_DIR/bundle.json from the demo House in
// MONGODB_DB, so HOUSE_DEMO_MODE=true serves the same House offline. Run after
// `pnpm seed:demo` and after every demo content change made in the Studio.
//
// Plain Node with type stripping, started with `--conditions=react-server` so the
// `server-only` guard in lib/db/mapping.ts resolves to its empty build.
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { MongoClient } from "mongodb";
import { fromDoc } from "../lib/db/mapping.ts";
import type { BundleSource } from "../lib/house/bundle.ts";
import { exportDemoBundle } from "./demo/export.ts";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const token = process.env.DEMO_HOUSE_TOKEN || "demo-token";
const out = path.resolve(process.env.DEMO_ASSETS_DIR || "./demo-assets", "bundle.json");

if (!uri || !dbName) {
  console.error("✗ MONGODB_URI and MONGODB_DB must be set in .env.local");
  process.exit(1);
}

const client = new MongoClient(uri, { appName: "memorai-scripts", serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  const db = client.db(dbName);
  const houseDoc = await db.collection("houses").findOne({ token, tokenRevoked: { $ne: true } });
  if (!houseDoc) {
    console.error(`✗ No House with the demo token in ${dbName}. Run pnpm seed:demo first.`);
    process.exitCode = 1;
  } else {
    const houseId = houseDoc._id.toHexString();
    // Same filters as lib/house/load-bundle.ts (DB path).
    const load = async (name: string, filter: Record<string, unknown> = {}) =>
      (
        await db
          .collection(name)
          .find({ houseId, ...filter })
          .toArray()
      ).map((d) => fromDoc(d));
    const [rooms, stories, memories, scenes, assets] = await Promise.all([
      load("rooms"),
      load("stories", { publishedAt: { $exists: true } }),
      load("memories", { status: { $in: ["approved", "published"] } }),
      load("scenes"),
      load("assets"),
    ]);
    // Documents were validated by the contracts when written (seed or Studio API).
    const bundle = exportDemoBundle({
      house: fromDoc(houseDoc),
      token,
      rooms,
      stories,
      memories,
      scenes,
      assets,
    } as unknown as BundleSource);
    await writeFile(out, `${JSON.stringify(bundle, null, 2)}\n`);
    const slots = bundle.rooms.flatMap((r) => r.slots).filter((s) => s.story);
    console.log(
      `✓ ${out}: ${bundle.rooms.length} rooms, ${slots.length} stories, ${bundle.files.length} files`,
    );
    console.log("  Start with HOUSE_DEMO_MODE=true and open /house/<DEMO_HOUSE_TOKEN>.");
  }
} catch (error) {
  // Never print the URI: the driver error message does not include credentials.
  console.error(
    `✗ ${error instanceof Error ? `${error.name}: ${error.message}` : "unknown error"}`,
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
