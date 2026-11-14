// `pnpm seed:demo`: loads demo-assets/demo.json into MONGODB_DB (must be a *demo DB) as one
// complete, published House reachable at /house/<DEMO_HOUSE_TOKEN>. Re-runnable: the
// previous demo House (DB documents and storage folder) is replaced.
//
// Plain Node with type stripping, started with `--conditions=react-server` so the
// `server-only` guard in lib/db/mapping.ts and lib/storage resolves to its empty build.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { MongoClient, ObjectId } from "mongodb";
import type { Asset } from "../lib/contracts/entities.ts";
import { ensureIndexes } from "../lib/db/indexes.ts";
import { toDoc } from "../lib/db/mapping.ts";
import { deleteHouseFolder, saveFile } from "../lib/storage/index.ts";
import { DemoManifest, planSeed } from "./demo/plan.ts";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
const token = process.env.DEMO_HOUSE_TOKEN || "demo-token";
const assetsDir = path.resolve(process.env.DEMO_ASSETS_DIR || "./demo-assets");

if (!uri || !dbName) {
  console.error("✗ MONGODB_URI and MONGODB_DB must be set in .env.local");
  process.exit(1);
}
// The seed deletes and rewrites a House: never let it run against someone's dev DB.
if (!dbName.endsWith("demo")) {
  console.error(`✗ MONGODB_DB is "${dbName}". Run with MONGODB_DB=mh_demo pnpm seed:demo`);
  process.exit(1);
}

let manifest: DemoManifest;
try {
  const raw: unknown = JSON.parse(await readFile(path.join(assetsDir, "demo.json"), "utf8"));
  const parsed = DemoManifest.safeParse(raw);
  if (!parsed.success) {
    console.error("✗ demo.json does not match the manifest format:");
    for (const issue of parsed.error.issues)
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    process.exit(1);
  }
  manifest = parsed.data;
} catch (error) {
  console.error(`✗ Cannot read ${path.join(assetsDir, "demo.json")}: ${(error as Error).message}`);
  console.error(
    "  Copy scripts/demo/demo.example.json into DEMO_ASSETS_DIR as demo.json and edit it.",
  );
  process.exit(1);
}

const plan = planSeed(manifest, {
  token,
  now: new Date().toISOString(),
  newId: () => new ObjectId().toHexString(),
});

const client = new MongoClient(uri, { appName: "memorai-scripts", serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  const db = client.db(dbName);
  await ensureIndexes(db);

  // Copy media first, into the new House's folder: a missing file stops the seed while
  // the previous demo House is still intact.
  const assets: Asset[] = [];
  try {
    for (const { source, storageName, ...asset } of plan.assets) {
      const saved = await saveFile(
        plan.house.id,
        storageName,
        await readFile(path.join(assetsDir, source)),
      );
      assets.push({ ...asset, ...saved });
    }
    for (const { source, storageName } of plan.extraFiles) {
      await saveFile(plan.house.id, storageName, await readFile(path.join(assetsDir, source)));
    }
  } catch (error) {
    await deleteHouseFolder(plan.house.id);
    throw error;
  }
  console.log(`✓ ${assets.length + plan.extraFiles.length} files copied to storage`);

  // Replace the previous demo House, if any.
  const previous = await db.collection("houses").findOne({ token });
  if (previous) {
    const oldId = previous._id.toHexString();
    for (const name of ["rooms", "stories", "memories", "assets", "scenes", "jobs", "events"]) {
      await db.collection(name).deleteMany({ houseId: oldId });
    }
    await db.collection("houses").deleteOne({ _id: previous._id });
    await deleteHouseFolder(oldId);
    console.log("✓ previous demo House removed");
  }

  const insert = async (name: string, entities: ({ id: string } & Record<string, unknown>)[]) => {
    if (entities.length > 0) await db.collection(name).insertMany(entities.map((e) => toDoc(e)));
  };
  await insert("houses", [plan.house]);
  await insert("rooms", plan.rooms);
  await insert("stories", plan.stories);
  await insert("memories", plan.memories);
  await insert("assets", assets);
  await insert("scenes", plan.scenes);

  console.log(
    `✓ ${manifest.house.firstName}'s House: ${plan.rooms.length} rooms, ${plan.stories.length} stories, ` +
      `${plan.memories.length} memories, ${plan.scenes.length} scenes in ${dbName}`,
  );
  console.log(`  Open /house/${token}, then run pnpm export:demo to refresh bundle.json.`);
} catch (error) {
  // Never print the URI: the driver error message does not include credentials.
  console.error(
    `✗ ${error instanceof Error ? `${error.name}: ${error.message}` : "unknown error"}`,
  );
  process.exitCode = 1;
} finally {
  await client.close();
}
