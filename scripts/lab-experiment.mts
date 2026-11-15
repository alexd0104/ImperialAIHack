// `pnpm lab:experiment`: Q5 prompting experiment. Runs the 4 approaches on 5 test photos
// and stores 20 `lab_runs`. Mock by default (free, offline, no DB needed: runs go to
// storage/lab/runs.json when MONGODB_URI is unset). Live only when a human launches it:
//   AI_MODE=live pnpm lab:experiment --photos <dir>   (≈ $10; <dir>/<beach|fireplace|garden|wedding|kitchen>.jpg)
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { LabRun } from "@/lib/contracts/lab";
import { mockLabModel } from "@/lib/lab/mock-model";
import { TEST_PHOTOS } from "@/lib/lab/photos";
import { runExperiment } from "@/lib/lab/run-experiment";

const live = process.env.AI_MODE === "live";
const photosIdx = process.argv.indexOf("--photos");
const photosDir = photosIdx > 0 ? process.argv[photosIdx + 1] : undefined;
if (live && !photosDir) {
  console.error("✗ Live run needs --photos <dir> with beach/fireplace/garden/wedding/kitchen .jpg");
  process.exit(1);
}

const model = live
  ? (await import("@/lib/lab/live-model")).liveLabModel(path.resolve(photosDir as string))
  : mockLabModel;
const runs = await runExperiment({ photos: TEST_PHOTOS, model });

if (process.env.MONGODB_URI && process.env.MONGODB_DB) {
  const { db } = await import("@/lib/db");
  for (const run of runs) await db.labRuns.insert(run);
  console.log(`✓ ${runs.length} lab_runs stored in MongoDB (${live ? "live" : "mock"})`);
  process.exit(0);
}
const dir = path.join(process.cwd(), "storage", "lab");
await mkdir(dir, { recursive: true });
const file = path.join(dir, "runs.json");
const withIds = runs.map((r, i) => LabRun.parse({ ...r, id: `mock-${i}` }));
await writeFile(file, JSON.stringify(withIds, null, 2));
console.log(
  `✓ ${withIds.length} lab runs written to ${path.relative(process.cwd(), file)} (no MongoDB configured)`,
);
