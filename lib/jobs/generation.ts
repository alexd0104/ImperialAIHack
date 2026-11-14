import "server-only";
import type { Asset, ErrorCode, Job, Memory, MemoryStatus, Scene } from "@/lib/contracts";
import { db, type NewEntity } from "@/lib/db/collections";
import { isFinalStatus } from "./engine";
import { newJob, scenePlan } from "./plans";

// P4: what POST /api/memories/:id/generate and POST /api/scenes/:id/retry do,
// behind a small store so the rules are unit-tested without MongoDB.

export interface GenerationStore {
  getMemory(id: string): Promise<Memory | null>;
  updateMemory(id: string, fields: Partial<Memory>): Promise<void>;
  photosOf(memoryId: string): Promise<Asset[]>;
  scenesOf(memoryId: string): Promise<Scene[]>;
  getScene(id: string): Promise<Scene | null>;
  insertScene(scene: NewEntity<Scene>): Promise<Scene>;
  updateScene(id: string, fields: Partial<Scene>): Promise<void>;
  getJob(id: string): Promise<Job | null>;
  insertJob(job: NewEntity<Job>): Promise<Job>;
}

export type GenerationResult<T> = { ok: true; data: T } | { ok: false; code: ErrorCode };

const ACTIVE_SCENE = new Set<Scene["status"]>(["pending", "generating"]);

/**
 * TECHNICAL.md §5.2 "Memory status (computed)". `published` is set by publishing
 * and never computed back. A failed scene counts as reviewable: the family keeps
 * the original photo (product rule 4: nothing looks broken).
 */
export function memoryStatusOf(
  memory: Pick<Memory, "status">,
  scenes: Pick<Scene, "status" | "choice" | "jobId">[],
): MemoryStatus {
  if (memory.status === "published") return "published";
  if (scenes.length === 0 || scenes.every((s) => s.status === "pending" && !s.jobId))
    return "draft";
  if (scenes.some((s) => ACTIVE_SCENE.has(s.status))) return "generating";
  return scenes.every((s) => s.choice) ? "approved" : "ready_for_review";
}

async function sceneJob(
  store: GenerationStore,
  memory: Memory,
  scene: Scene,
  opts: { falKeyLabel: string; now: string; bypassCache?: boolean },
): Promise<Job> {
  if (!memory.sheet) throw new Error("sceneJob needs a MemorySheet");
  const job = await store.insertJob(
    newJob({
      type: "scene",
      houseId: memory.houseId,
      memoryId: memory.id,
      sceneId: scene.id,
      steps: scenePlan(memory.sheet),
      falKeyLabel: opts.falKeyLabel,
      bypassCache: opts.bypassCache,
      now: opts.now,
    }),
  );
  await store.updateScene(scene.id, { jobId: job.id, status: "generating" });
  return job;
}

async function refreshMemoryStatus(store: GenerationStore, memory: Memory): Promise<void> {
  const status = memoryStatusOf(memory, await store.scenesOf(memory.id));
  if (status !== memory.status) await store.updateMemory(memory.id, { status });
}

/**
 * One scene per photo of the Memory, one scene job each. Idempotent: a scene
 * that already has a job (running or finished) keeps it; only new photos and
 * scenes never generated get a job. "Try again" is the retry route.
 */
export async function startGeneration(
  store: GenerationStore,
  memoryId: string,
  opts: { falKeyLabel: string; now: string },
): Promise<GenerationResult<{ jobIds: string[] }>> {
  const memory = await store.getMemory(memoryId);
  if (!memory) return { ok: false, code: "not_found" };
  if (memory.status === "published") return { ok: false, code: "conflict" };
  // No sheet = no prompts: the compiler needs the family's answers first.
  if (!memory.sheet) return { ok: false, code: "validation_failed" };
  const photos = await store.photosOf(memoryId);
  if (photos.length === 0) return { ok: false, code: "validation_failed" };

  const scenes = await store.scenesOf(memoryId);
  const byAsset = new Map(scenes.map((s) => [s.assetId, s]));
  let order = scenes.reduce((max, s) => Math.max(max, s.order + 1), 0);
  for (const photo of photos) {
    if (byAsset.has(photo.id)) continue;
    const scene = await store.insertScene({
      houseId: memory.houseId,
      memoryId,
      assetId: photo.id,
      order: order++,
      outputs: {},
      status: "pending",
      createdAt: opts.now,
    });
    scenes.push(scene);
  }

  const jobIds: string[] = [];
  for (const scene of scenes.sort((a, b) => a.order - b.order)) {
    const existing = scene.jobId ? await store.getJob(scene.jobId) : null;
    if (existing) {
      jobIds.push(existing.id);
      continue;
    }
    jobIds.push((await sceneJob(store, memory, scene, opts)).id);
  }
  await refreshMemoryStatus(store, memory);
  return { ok: true, data: { jobIds } };
}

/** "Try again" on one scene: a fresh job that bypasses the cache. */
export async function retryScene(
  store: GenerationStore,
  sceneId: string,
  opts: { falKeyLabel: string; now: string },
): Promise<GenerationResult<{ jobId: string }>> {
  const scene = await store.getScene(sceneId);
  if (!scene) return { ok: false, code: "not_found" };
  const memory = await store.getMemory(scene.memoryId);
  if (!memory) return { ok: false, code: "not_found" };
  if (memory.status === "published") return { ok: false, code: "conflict" };
  if (!memory.sheet) return { ok: false, code: "validation_failed" };
  // A double tap must not start two paid runs: the running job is the answer.
  const current = scene.jobId ? await store.getJob(scene.jobId) : null;
  if (current && !isFinalStatus(current.status)) return { ok: true, data: { jobId: current.id } };
  const job = await sceneJob(store, memory, scene, { ...opts, bypassCache: true });
  await refreshMemoryStatus(store, memory);
  return { ok: true, data: { jobId: job.id } };
}

/** Called when a scene job settles, so the Studio sees `ready_for_review`. */
export async function refreshMemoryStatusById(
  store: GenerationStore,
  memoryId: string,
): Promise<void> {
  const memory = await store.getMemory(memoryId);
  if (memory) await refreshMemoryStatus(store, memory);
}

/** Sliding window per key, in memory: one Next process serves the whole Studio. */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    /** True (and counted) if `key` is under its limit at `nowMs`. */
    take(key: string, nowMs: number): boolean {
      const recent = (hits.get(key) ?? []).filter((t) => nowMs - t < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(nowMs);
      hits.set(key, recent);
      return true;
    },
  };
}

/** "Try again" is paid work (TECHNICAL.md §3.5): 5 per House per 10 minutes, chosen in P4. */
export const retryLimiter = createRateLimiter(5, 10 * 60_000);

export const mongoGenerationStore: GenerationStore = {
  getMemory: (id) => db.memories.findById(id),
  async updateMemory(id, fields) {
    await db.memories.update(id, fields);
  },
  photosOf: (memoryId) => db.assets.find({ memoryId, kind: "photo" }, { sort: { createdAt: 1 } }),
  scenesOf: (memoryId) => db.scenes.find({ memoryId }, { sort: { order: 1 } }),
  getScene: (id) => db.scenes.findById(id),
  insertScene: (scene) => db.scenes.insert(scene),
  async updateScene(id, fields) {
    await db.scenes.update(id, fields);
  },
  getJob: (id) => db.jobs.findById(id),
  insertJob: (job) => db.jobs.insert(job),
};
