import { describe, expect, it } from "vitest";
import { Asset, Job, Memory, Scene } from "@/lib/contracts";
import assetFixture from "@/lib/contracts/__fixtures__/asset.json";
import memoryFixture from "@/lib/contracts/__fixtures__/memory.json";
import {
  createRateLimiter,
  type GenerationStore,
  memoryStatusOf,
  retryScene,
  startGeneration,
} from "./generation";

const NOW = "2026-11-14T21:00:00.000Z";
const OPTS = { falKeyLabel: "dev", now: NOW };

let counter = 0;
const nextId = () => `6650a1f0c0ffee${(0x100000 + counter++).toString(16).padStart(10, "0")}`;

/** In-memory GenerationStore: same contracts, no MongoDB. */
class FakeStore implements GenerationStore {
  memories = new Map<string, Memory>();
  assets: Asset[] = [];
  scenes = new Map<string, Scene>();
  jobs = new Map<string, Job>();

  async getMemory(id: string) {
    return this.memories.get(id) ?? null;
  }
  async updateMemory(id: string, fields: Partial<Memory>) {
    const m = this.memories.get(id);
    if (m) this.memories.set(id, Memory.parse({ ...m, ...fields }));
  }
  async photosOf(memoryId: string) {
    return this.assets.filter((a) => a.memoryId === memoryId && a.kind === "photo");
  }
  async scenesOf(memoryId: string) {
    return [...this.scenes.values()].filter((s) => s.memoryId === memoryId);
  }
  async getScene(id: string) {
    return this.scenes.get(id) ?? null;
  }
  async insertScene(input: Omit<Scene, "id">) {
    const scene = Scene.parse({ ...input, id: nextId() });
    this.scenes.set(scene.id, scene);
    return scene;
  }
  async updateScene(id: string, fields: Partial<Scene>) {
    const s = this.scenes.get(id);
    if (s) this.scenes.set(id, Scene.parse({ ...s, ...fields }));
  }
  async getJob(id: string) {
    return this.jobs.get(id) ?? null;
  }
  async insertJob(input: Omit<Job, "id">) {
    const job = Job.parse({ ...input, id: nextId() });
    this.jobs.set(job.id, job);
    return job;
  }
}

function setup(memory: Partial<Memory> = {}, photos = 2) {
  const store = new FakeStore();
  const m = Memory.parse({ ...memoryFixture, status: "draft", ...memory });
  store.memories.set(m.id, m);
  for (let i = 0; i < photos; i++) {
    store.assets.push(Asset.parse({ ...assetFixture, id: nextId(), memoryId: m.id }));
  }
  return { store, memory: m };
}

describe("memoryStatusOf", () => {
  const scene = (status: Scene["status"], extra: Partial<Scene> = {}) => ({
    status,
    jobId: "j",
    ...extra,
  });
  it("follows TECHNICAL.md §5.2", () => {
    expect(memoryStatusOf({ status: "draft" }, [])).toBe("draft");
    expect(memoryStatusOf({ status: "draft" }, [{ status: "pending" }])).toBe("draft");
    expect(memoryStatusOf({ status: "draft" }, [scene("generating"), scene("done")])).toBe(
      "generating",
    );
    expect(memoryStatusOf({ status: "generating" }, [scene("done"), scene("fallback")])).toBe(
      "ready_for_review",
    );
    const choice = { use: "still", colour: "bw", restored: true } as const;
    expect(
      memoryStatusOf({ status: "ready_for_review" }, [scene("done", { choice }), scene("failed")]),
    ).toBe("ready_for_review");
    expect(memoryStatusOf({ status: "ready_for_review" }, [scene("done", { choice })])).toBe(
      "approved",
    );
    expect(memoryStatusOf({ status: "published" }, [scene("generating")])).toBe("published");
  });
});

describe("startGeneration", () => {
  it("creates one scene and one queued scene job per photo", async () => {
    const { store, memory } = setup();
    const result = await startGeneration(store, memory.id, OPTS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.jobIds).toHaveLength(2);
    const scenes = await store.scenesOf(memory.id);
    expect(scenes.map((s) => s.order)).toEqual([0, 1]);
    for (const scene of scenes) {
      expect(scene.status).toBe("generating");
      const job = store.jobs.get(scene.jobId ?? "");
      expect(job).toMatchObject({ type: "scene", status: "queued", sceneId: scene.id });
      expect(job?.memoryId).toBe(memory.id);
      expect(job?.bypassCache).toBeUndefined();
    }
    expect(store.memories.get(memory.id)?.status).toBe("generating");
  });

  it("is idempotent and only adds jobs for new photos", async () => {
    const { store, memory } = setup();
    const first = await startGeneration(store, memory.id, OPTS);
    store.assets.push(Asset.parse({ ...assetFixture, id: nextId(), memoryId: memory.id }));
    const second = await startGeneration(store, memory.id, OPTS);
    if (!first.ok || !second.ok) throw new Error("expected ok");
    expect(second.data.jobIds.slice(0, 2)).toEqual(first.data.jobIds);
    expect(second.data.jobIds).toHaveLength(3);
    expect(store.jobs.size).toBe(3);
  });

  it("refuses a Memory without answers, photos, or already shared", async () => {
    const noSheet = setup({ sheet: undefined });
    expect(await startGeneration(noSheet.store, noSheet.memory.id, OPTS)).toEqual({
      ok: false,
      code: "validation_failed",
    });
    const noPhoto = setup({}, 0);
    expect(await startGeneration(noPhoto.store, noPhoto.memory.id, OPTS)).toEqual({
      ok: false,
      code: "validation_failed",
    });
    const shared = setup({ status: "published" });
    expect(await startGeneration(shared.store, shared.memory.id, OPTS)).toEqual({
      ok: false,
      code: "conflict",
    });
    expect(await startGeneration(shared.store, "6650a1f0c0ffee00000000ff", OPTS)).toEqual({
      ok: false,
      code: "not_found",
    });
  });
});

describe("retryScene", () => {
  it("reuses a running job, then starts a cache-bypassing one once it is final", async () => {
    const { store, memory } = setup({}, 1);
    const started = await startGeneration(store, memory.id, OPTS);
    if (!started.ok) throw new Error("expected ok");
    const [scene] = await store.scenesOf(memory.id);
    if (!scene) throw new Error("no scene");
    const firstJob = started.data.jobIds[0] ?? "";

    expect(await retryScene(store, scene.id, OPTS)).toEqual({
      ok: true,
      data: { jobId: firstJob },
    });

    const job = store.jobs.get(firstJob);
    if (!job) throw new Error("no job");
    store.jobs.set(firstJob, { ...job, status: "fallback" });
    await store.updateScene(scene.id, { status: "fallback" });
    await store.updateMemory(memory.id, { status: "ready_for_review" });

    const retried = await retryScene(store, scene.id, OPTS);
    if (!retried.ok) throw new Error("expected ok");
    expect(retried.data.jobId).not.toBe(firstJob);
    expect(store.jobs.get(retried.data.jobId)?.bypassCache).toBe(true);
    expect(store.scenes.get(scene.id)).toMatchObject({
      status: "generating",
      jobId: retried.data.jobId,
    });
    expect(store.memories.get(memory.id)?.status).toBe("generating");
  });

  it("returns not_found for an unknown scene", async () => {
    const { store } = setup();
    expect(await retryScene(store, "6650a1f0c0ffee00000000ff", OPTS)).toEqual({
      ok: false,
      code: "not_found",
    });
  });
});

describe("createRateLimiter", () => {
  it("allows `limit` hits per window and key", () => {
    const limiter = createRateLimiter(2, 1000);
    expect(limiter.take("h", 0)).toBe(true);
    expect(limiter.take("h", 10)).toBe(true);
    expect(limiter.take("h", 20)).toBe(false);
    expect(limiter.take("other", 20)).toBe(true);
    expect(limiter.take("h", 1001)).toBe(true);
  });
});
