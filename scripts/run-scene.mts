// `pnpm scene:run <photo> [--colourise] [--still] [--no-restore] [--title "..."]`
// Runs one scene through the real generation chain (P2) without the Studio or the
// P4 routes: inserts a throwaway test House → Story → Memory → photo → Scene into
// MONGODB_DB, creates the scene job and advances it every 3 s, printing each step's
// status, time and cost. Mode follows AI_MODE: mock by default, `AI_MODE=live` on
// the command line for a paid run (FAL_BUDGET_USD still applies).
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { JobStep, MemorySheet } from "@/lib/contracts";
import { closeMongo } from "@/lib/db/client";
import { db } from "@/lib/db/collections";
import {
  advanceJob,
  defaultEngineDeps,
  isFinalStatus,
  jobConfig,
  newJob,
  scenePlan,
} from "@/lib/jobs";
import { saveFile } from "@/lib/storage";

const args = process.argv.slice(2);
const photo = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--title");
const flag = (name: string) => args.includes(`--${name}`);
const titleIndex = args.indexOf("--title");
const title = titleIndex >= 0 ? (args[titleIndex + 1] ?? "Test scene") : "Test scene";

if (!photo) {
  console.error(
    'Usage: pnpm scene:run <photo> [--colourise] [--still] [--no-restore] [--title "..."]',
  );
  process.exit(1);
}
if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
  console.error("✗ MONGODB_URI and MONGODB_DB must be set in .env.local");
  process.exit(1);
}

const MIMES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
const mime = MIMES[path.extname(photo).toLowerCase()];
if (!mime) {
  console.error("✗ The photo must be .jpg, .png or .webp");
  process.exit(1);
}

// Read before inserting anything, so a wrong path leaves no half-made test House.
const photoBytes = await readFile(photo).catch(() => {
  console.error(`✗ Cannot read ${photo}`);
  process.exit(1);
});

const mode = process.env.AI_MODE === "live" ? "live" : "mock";
const config = jobConfig();
console.log(`Mode: ${mode} · key label: ${config.falKeyLabel} · DB: ${process.env.MONGODB_DB}`);

const now = () => new Date().toISOString();
const sheet: MemorySheet = {
  title,
  people: [],
  colour: flag("colourise") ? "colourise" : "already_colour",
  restore: !flag("no-restore"),
  motion: flag("still") ? "still" : "gentle",
  okAlone: false,
  source: "form",
};

const house = await db.houses.insert({
  firstName: "P2 test",
  tokenRevoked: true,
  dontShow: [],
  consentAt: now(),
  createdAt: now(),
});
const room = await db.rooms.insert({
  houseId: house.id,
  name: "Test room",
  source: "style",
  style: undefined,
  backgroundPath: "/rooms/living.svg",
  slots: [],
  createdAt: now(),
});
const story = await db.stories.insert({
  houseId: house.id,
  roomId: room.id,
  slotId: "000000000000000000000000",
  title,
  object: { kind: "svg", path: "photo-frame" },
  memoryOrder: [],
  createdAt: now(),
});
const memory = await db.memories.insert({
  houseId: house.id,
  storyId: story.id,
  title,
  answers: {},
  sheet,
  okAlone: false,
  status: "generating",
  createdAt: now(),
});
const saved = await saveFile(
  house.id,
  `uploads/photo${path.extname(photo).toLowerCase()}`,
  photoBytes,
);
const asset = await db.assets.insert({
  houseId: house.id,
  memoryId: memory.id,
  kind: "photo",
  path: saved.path,
  mime,
  bytes: saved.bytes,
  sha256: saved.sha256,
  createdAt: now(),
});
const scene = await db.scenes.insert({
  houseId: house.id,
  memoryId: memory.id,
  assetId: asset.id,
  order: 0,
  outputs: {},
  status: "generating",
  createdAt: now(),
});
const job = await db.jobs.insert(
  newJob({
    type: "scene",
    houseId: house.id,
    memoryId: memory.id,
    sceneId: scene.id,
    steps: scenePlan(sheet),
    falKeyLabel: config.falKeyLabel,
    now: now(),
  }),
);
await db.scenes.update(scene.id, { jobId: job.id });
console.log(`House ${house.id} · job ${job.id}\n`);

const started = Date.now();
const seen = new Map<string, string>();
const secs = () => ((Date.now() - started) / 1000).toFixed(0).padStart(4);
const show = (s: JobStep) =>
  `${secs()} s  ${s.name.padEnd(10)} ${s.status.padEnd(8)}` +
  (s.costUsd ? `  $${s.costUsd.toFixed(3)}` : "") +
  (s.attempts > 1 ? `  attempt ${s.attempts}` : "") +
  (s.error ? `  ${s.error}` : "");

const deps = defaultEngineDeps();
let final = job;
for (;;) {
  const { job: current, notice } = await advanceJob(job.id, deps);
  if (notice) console.log(`${secs()} s  notice: ${notice}`);
  if (current) {
    final = current;
    for (const step of current.steps) {
      const line = `${step.status}|${step.attempts}|${step.error ?? ""}`;
      if (seen.get(step.name) !== line && step.status !== "pending") {
        seen.set(step.name, line);
        console.log(show(step));
      }
    }
    if (isFinalStatus(current.status)) break;
  }
  await new Promise((r) => setTimeout(r, 3000));
}

const cost = final.steps.reduce((sum, s) => sum + (s.costUsd ?? 0), 0);
const outputs = (await db.scenes.findById(scene.id))?.outputs ?? {};
console.log(`\nJob ${final.status} in ${secs().trim()} s · estimated cost $${cost.toFixed(2)}`);
for (const [name, file] of Object.entries(outputs))
  if (file) console.log(`  ${name}: storage/${file}`);
await closeMongo();
