import { AiRequestError } from "@/lib/ai/errors";
import type { FalGateway, FalQueueStatus } from "@/lib/ai/fal";
import type { AiMode } from "@/lib/ai/mode";
import { MODELS } from "@/lib/ai/models";
import type { GenerationCacheEntry, Job, JobStep } from "@/lib/contracts";
import type { JobConfig } from "./config";
import type { CacheRepo, EngineDeps, JobRepo, StepHandlers } from "./types";

// In-memory fakes so engine tests never need MongoDB, storage or fal.

export const HOUSE = "6650a1f0c0ffee0000000001";

export class FakeJobRepo implements JobRepo {
  jobs = new Map<string, Job>();
  extraSpent = 0;
  extraRunning = 0;

  add(job: Job): void {
    this.jobs.set(job.id, structuredClone(job));
  }

  peek(id: string): Job {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`no job ${id}`);
    return job;
  }

  async get(id: string) {
    const job = this.jobs.get(id);
    return job ? structuredClone(job) : null;
  }

  // Synchronous check-and-set, like findOneAndUpdate: two callers can never both win.
  async acquireLease(id: string, now: string, until: string) {
    const job = this.jobs.get(id);
    if (!job) return null;
    if (job.lockedUntil && Date.parse(job.lockedUntil) >= Date.parse(now)) return null;
    job.lockedUntil = until;
    return structuredClone(job);
  }

  async save(job: Job, lease: string) {
    const stored = this.jobs.get(job.id);
    if (!stored || stored.lockedUntil !== lease) return false;
    this.jobs.set(job.id, { ...structuredClone(job), lockedUntil: lease });
    return true;
  }

  async release(id: string, lease: string, notBefore: string | null) {
    const stored = this.jobs.get(id);
    if (stored && stored.lockedUntil === lease) stored.lockedUntil = notBefore;
  }

  async countRunningFal() {
    let running = this.extraRunning;
    for (const job of this.jobs.values()) {
      running += job.steps.filter((s) => s.status === "running" && s.falRequestId).length;
    }
    return running;
  }

  async spentUsd(label: string) {
    let total = this.extraSpent;
    for (const job of this.jobs.values()) {
      if (job.falKeyLabel !== label) continue;
      for (const step of job.steps) total += step.costUsd ?? 0;
    }
    return total;
  }

  async listAdvanceable(now: string, limit: number) {
    return [...this.jobs.values()]
      .filter((j) => j.status === "queued" || j.status === "running")
      .filter((j) => !j.lockedUntil || Date.parse(j.lockedUntil) < Date.parse(now))
      .slice(0, limit)
      .map((j) => j.id);
  }
}

export class FakeCache implements CacheRepo {
  entries = new Map<string, Omit<GenerationCacheEntry, "id">>();
  async get(key: string) {
    const entry = this.entries.get(key);
    return entry ? { id: "6650a1f0c0ffee00000000c1", ...entry } : null;
  }
  async put(entry: Omit<GenerationCacheEntry, "id">) {
    this.entries.set(entry.key, entry);
  }
}

/** "ok" completes, "retry" fails retryably, "fatal" fails for good. */
export type FakeOutcome = "ok" | "retry" | "fatal";

export class FakeFal implements FalGateway {
  submits: { model: string; input: Record<string, unknown>; id: string }[] = [];
  uploads = 0;
  /** Outcome of each submit in order; when exhausted, "ok". */
  outcomes: FakeOutcome[] = [];
  /** Status polls answered IN_PROGRESS before COMPLETED. */
  pollsBeforeDone = 0;
  private byId = new Map<string, { outcome: FakeOutcome; polls: number; model: string }>();

  constructor(readonly mode: AiMode) {}

  async upload() {
    this.uploads++;
    return `https://cdn.test/${this.mode}/${this.uploads}`;
  }

  async submit(model: keyof typeof MODELS, input: Record<string, unknown>) {
    const id = `${this.mode}_${this.submits.length + 1}`;
    this.submits.push({ model, input, id });
    this.byId.set(id, { outcome: this.outcomes.shift() ?? "ok", polls: 0, model });
    return id;
  }

  async status(_model: keyof typeof MODELS, id: string): Promise<FalQueueStatus> {
    const req = this.byId.get(id);
    if (!req) throw new AiRequestError("unknown_request", id, false);
    return req.polls++ < this.pollsBeforeDone ? "IN_PROGRESS" : "COMPLETED";
  }

  async result(model: keyof typeof MODELS, id: string) {
    const req = this.byId.get(id);
    if (!req) throw new AiRequestError("unknown_request", id, false);
    if (req.outcome === "retry") throw new AiRequestError("request_failed", "flaky", true);
    if (req.outcome === "fatal") throw new AiRequestError("request_failed", "refused", false);
    const segments = MODELS[model].output.path;
    // Build `{ image: { url } }` (or the model's own path) so extractOutput finds it.
    let data: unknown = `https://out.test/${id}`;
    for (const segment of [...segments].reverse()) {
      data = typeof segment === "number" ? [data] : { [segment]: data };
    }
    return { requestId: id, data: data as Record<string, unknown> };
  }
}

export const sceneHandlers: StepHandlers = {
  compile: {
    kind: "local",
    run: async ({ job }) => ({ output: `${HOUSE}/${job.id}/prompts.json` }),
  },
  upload: { kind: "local", run: async () => ({}) },
  restore: {
    kind: "fal",
    plan: async () => ({
      model: "restore",
      params: {},
      input: { field: "image_url", sha256: "a".repeat(64), read: async () => new Blob(["x"]) },
    }),
  },
  colourise: {
    kind: "fal",
    plan: async () => ({ model: "colourise", params: { color: "contemporary color" } }),
  },
  animate: {
    kind: "fal",
    plan: async () => ({ model: "animate", params: { prompt: "leaves move gently" } }),
  },
  ambience: {
    kind: "fal",
    plan: async () => ({ model: "ambienceStill", params: { prompt: "birds, no music" } }),
  },
  cutout: { kind: "fal", plan: async () => ({ model: "cutout", params: {} }) },
  model3d: { kind: "fal", plan: async () => ({ model: "model3d", params: {} }) },
  compress: { kind: "local", run: async ({ outputs }) => ({ output: outputs.model3d }) },
  finalize: { kind: "local", run: async () => ({}) },
};

export const TEST_CONFIG: JobConfig = {
  leaseMs: 10_000,
  maxRetries: 2,
  backoffMs: [5_000, 15_000],
  maxConcurrency: 2,
  budgetUsd: 5,
  falKeyLabel: "test",
};

export function makeJob(id: string, steps: JobStep[], overrides: Partial<Job> = {}): Job {
  return {
    id,
    type: "scene",
    houseId: HOUSE,
    sceneId: "6650a1f0c0ffee0000000021",
    steps,
    current: 0,
    status: "queued",
    lockedUntil: null,
    falKeyLabel: "test",
    createdAt: "2026-11-14T20:00:00.000Z",
    updatedAt: "2026-11-14T20:00:00.000Z",
    ...overrides,
  };
}

export interface Harness {
  deps: EngineDeps;
  repo: FakeJobRepo;
  cache: FakeCache;
  live: FakeFal;
  mock: FakeFal;
  settled: Job[];
  clock: { now: Date; advance(ms: number): void };
}

export function harness(baseMode: AiMode = "mock"): Harness {
  const repo = new FakeJobRepo();
  const cache = new FakeCache();
  const live = new FakeFal("live");
  const mock = new FakeFal("mock");
  const settled: Job[] = [];
  const clock = {
    now: new Date("2026-11-14T20:00:00.000Z"),
    advance(ms: number) {
      this.now = new Date(this.now.getTime() + ms);
    },
  };
  const deps: EngineDeps = {
    jobs: repo,
    cache,
    fal: (mode = baseMode) => (mode === "live" ? live : mock),
    handlers: sceneHandlers,
    storeOutput: async (job, step) => `${job.houseId}/${job.id}/${step.name}.out`,
    settle: async (job) => {
      settled.push(structuredClone(job));
    },
    now: () => clock.now,
    config: TEST_CONFIG,
  };
  return { deps, repo, cache, live, mock, settled, clock };
}
