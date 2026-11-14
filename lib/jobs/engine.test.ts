import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { estimateCostUsd, MODELS } from "@/lib/ai/models";
import { cacheKey } from "./cache";
import { advanceJob, BUDGET_NOTICE } from "./engine";
import { object3dPlan, scenePlan } from "./plans";
import { HOUSE, harness, makeJob } from "./test-fakes";

const JOB = "6650a1f0c0ffee0000000031";
const sheet = { restore: true, colour: "keep_bw", motion: "gentle" } as const;

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

const statuses = (job: { steps: { status: string }[] }) => job.steps.map((s) => s.status);

describe("advanceJob: transitions", () => {
  it("walks a scene through its plan, skipping disabled steps, and settles once", async () => {
    const h = harness();
    h.mock.pollsBeforeDone = 1;
    h.repo.add(makeJob(JOB, scenePlan(sheet)));

    const first = await advanceJob(JOB, h.deps);
    expect(first.advanced).toBe(true);
    expect(first.job?.status).toBe("running");
    expect(statuses(h.repo.peek(JOB))).toEqual([
      "done",
      "done",
      "running",
      "skipped",
      "pending",
      "pending",
      "pending",
    ]);
    expect(h.repo.peek(JOB).steps[2].falRequestId).toBe("mock_1");
    expect(h.repo.peek(JOB).lockedUntil).toBeNull();

    await advanceJob(JOB, h.deps); // restore done, animate submitted
    await advanceJob(JOB, h.deps); // animate done, ambience submitted
    const last = await advanceJob(JOB, h.deps); // ambience done, finalize, done

    const job = h.repo.peek(JOB);
    expect(last.job?.status).toBe("done");
    expect(job.status).toBe("done");
    expect(statuses(job)).toEqual(["done", "done", "done", "skipped", "done", "done", "done"]);
    expect(job.steps[2]).toMatchObject({
      model: MODELS.restore.id,
      output: `${HOUSE}/${JOB}/restore.out`,
      previewUrl: `/api/files/${HOUSE}/${JOB}/restore.out`,
      attempts: 1,
      costUsd: 0,
    });
    expect(h.mock.submits.map((s) => s.model)).toEqual(["restore", "animate", "ambienceStill"]);
    expect(h.mock.submits[0].input.image_url).toMatch(/^https:\/\/cdn\.test\//);
    expect(h.settled).toHaveLength(1);
    expect(h.settled[0].status).toBe("done");

    const again = await advanceJob(JOB, h.deps);
    expect(again.advanced).toBe(false);
    expect(h.settled).toHaveLength(1);
  });

  it("leaves a running fal step alone while it is still in progress", async () => {
    const h = harness();
    h.mock.pollsBeforeDone = 5;
    h.repo.add(makeJob(JOB, scenePlan(sheet)));
    await advanceJob(JOB, h.deps);
    await advanceJob(JOB, h.deps);
    expect(h.repo.peek(JOB).current).toBe(2);
    expect(h.mock.submits).toHaveLength(1);
  });
});

describe("advanceJob: retries and fallback", () => {
  it("retries a failing step twice with 5 s / 15 s backoff, then falls back", async () => {
    const h = harness();
    h.mock.outcomes = ["retry", "retry", "retry"];
    h.repo.add(makeJob(JOB, scenePlan(sheet)));

    const first = await advanceJob(JOB, h.deps); // submit + poll → fail #1
    expect(first.job?.lockedUntil).toBe("2026-11-14T20:00:05.000Z");
    expect(h.repo.peek(JOB).steps[2]).toMatchObject({ status: "pending", attempts: 1 });
    expect(h.repo.peek(JOB).steps[2].falRequestId).toBeUndefined();

    // Backoff holds the job: nothing happens before it ends.
    expect((await advanceJob(JOB, h.deps)).advanced).toBe(false);
    expect(h.mock.submits).toHaveLength(1);

    h.clock.advance(5_001);
    const second = await advanceJob(JOB, h.deps);
    expect(second.job?.lockedUntil).toBe(new Date(h.clock.now.getTime() + 15_000).toISOString());
    expect(h.repo.peek(JOB).steps[2].attempts).toBe(2);

    h.clock.advance(15_001);
    await advanceJob(JOB, h.deps);
    const job = h.repo.peek(JOB);
    expect(h.mock.submits).toHaveLength(3);
    expect(job.status).toBe("fallback");
    expect(job.steps[2]).toMatchObject({ status: "failed", attempts: 3, error: "flaky" });
    expect(statuses(job).slice(3)).toEqual(["skipped", "skipped", "skipped", "skipped"]);
    expect(job.lockedUntil).toBeNull();
    expect(h.settled.map((j) => j.status)).toEqual(["fallback"]);
  });

  it("recovers when a retry succeeds", async () => {
    const h = harness();
    h.mock.outcomes = ["retry"];
    h.repo.add(makeJob(JOB, scenePlan(sheet)));
    await advanceJob(JOB, h.deps);
    h.clock.advance(5_001);
    await advanceJob(JOB, h.deps);
    const job = h.repo.peek(JOB);
    expect(job.status).toBe("done");
    expect(job.steps[2]).toMatchObject({ status: "done", attempts: 2 });
    expect(job.steps[2].error).toBeUndefined();
  });

  it("falls back at once on a non-retryable error", async () => {
    const h = harness();
    h.mock.outcomes = ["fatal"];
    h.repo.add(makeJob(JOB, scenePlan(sheet)));
    await advanceJob(JOB, h.deps);
    expect(h.repo.peek(JOB).status).toBe("fallback");
    expect(h.repo.peek(JOB).steps[2].attempts).toBe(1);
  });

  it("marks object jobs failed (library object fallback), not fallback", async () => {
    const h = harness();
    h.mock.outcomes = ["fatal"];
    h.repo.add(makeJob(JOB, object3dPlan(), { type: "object_3d", sceneId: undefined }));
    await advanceJob(JOB, h.deps);
    expect(h.repo.peek(JOB).status).toBe("failed");
  });

  it("counts a local step that throws as an attempt and retries it", async () => {
    const h = harness();
    let calls = 0;
    h.deps.handlers = {
      ...h.deps.handlers,
      compile: {
        kind: "local",
        run: async () => {
          calls++;
          throw new Error("disk full");
        },
      },
    };
    h.repo.add(makeJob(JOB, scenePlan(sheet)));
    await advanceJob(JOB, h.deps);
    h.clock.advance(5_001);
    await advanceJob(JOB, h.deps);
    h.clock.advance(15_001);
    await advanceJob(JOB, h.deps);
    expect(calls).toBe(3);
    expect(h.repo.peek(JOB).status).toBe("fallback");
  });
});

describe("advanceJob: lease", () => {
  it("does nothing while another caller holds the lease", async () => {
    const h = harness();
    h.repo.add(makeJob(JOB, scenePlan(sheet)));
    await h.repo.acquireLease(JOB, h.clock.now.toISOString(), "2026-11-14T20:00:10.000Z");

    const result = await advanceJob(JOB, h.deps);
    expect(result.advanced).toBe(false);
    expect(result.job?.status).toBe("queued");
    expect(h.repo.peek(JOB).current).toBe(0);
    expect(h.mock.submits).toHaveLength(0);

    // An expired lease (crashed holder) is taken over.
    h.clock.advance(10_001);
    expect((await advanceJob(JOB, h.deps)).advanced).toBe(true);
  });

  it("lets only one of two simultaneous advances run (ticker + polling)", async () => {
    const h = harness();
    h.mock.pollsBeforeDone = 1;
    h.repo.add(makeJob(JOB, scenePlan(sheet)));
    const results = await Promise.all([advanceJob(JOB, h.deps), advanceJob(JOB, h.deps)]);
    expect(results.map((r) => r.advanced).sort()).toEqual([false, true]);
    expect(h.mock.submits).toHaveLength(1);
  });

  it("stops writing when its lease was taken over", async () => {
    const h = harness();
    h.repo.add(makeJob(JOB, scenePlan(sheet)));
    h.deps.handlers = {
      ...h.deps.handlers,
      compile: {
        kind: "local",
        run: async () => {
          // Simulates a step that outlived the lease: someone else now owns the job.
          h.repo.peek(JOB).lockedUntil = "2026-11-14T21:00:00.000Z";
          return {};
        },
      },
    };
    await advanceJob(JOB, h.deps);
    const job = h.repo.peek(JOB);
    expect(job.current).toBe(0);
    expect(job.lockedUntil).toBe("2026-11-14T21:00:00.000Z");
  });
});

describe("advanceJob: concurrency cap", () => {
  it("waits without submitting while FAL_MAX_CONCURRENCY requests are in flight", async () => {
    const h = harness();
    h.repo.extraRunning = 2;
    h.repo.add(makeJob(JOB, scenePlan(sheet)));
    await advanceJob(JOB, h.deps);
    const job = h.repo.peek(JOB);
    expect(job.current).toBe(2);
    expect(job.steps[2]).toMatchObject({ status: "pending", attempts: 0 });
    expect(h.mock.submits).toHaveLength(0);
    expect(job.lockedUntil).toBeNull();

    // One slot frees up; the new request stays in flight so the chain stops there.
    h.repo.extraRunning = 1;
    h.mock.pollsBeforeDone = 100;
    await advanceJob(JOB, h.deps);
    expect(h.mock.submits).toHaveLength(1);
  });
});

describe("advanceJob: cache", () => {
  const restoreKey = cacheKey(MODELS.restore.id, {}, "a".repeat(64));

  it("reuses a cached output without calling fal", async () => {
    const h = harness();
    h.mock.pollsBeforeDone = 1;
    h.cache.entries.set(restoreKey, {
      key: restoreKey,
      model: MODELS.restore.id,
      outputPath: `${HOUSE}/old/restore.jpg`,
      costUsd: 0.15,
      createdAt: "2026-11-14T19:00:00.000Z",
    });
    h.repo.add(makeJob(JOB, scenePlan(sheet)));
    await advanceJob(JOB, h.deps);
    const job = h.repo.peek(JOB);
    expect(job.steps[2]).toMatchObject({
      status: "done",
      cacheHit: true,
      costUsd: 0,
      output: `${HOUSE}/old/restore.jpg`,
      previewUrl: `/api/files/${HOUSE}/old/restore.jpg`,
    });
    expect(h.mock.uploads).toBe(0);
    expect(h.mock.submits.map((s) => s.model)).toEqual(["animate"]);
  });

  it("skips the cache when the family asked to try again (bypassCache)", async () => {
    const h = harness();
    h.cache.entries.set(restoreKey, {
      key: restoreKey,
      model: MODELS.restore.id,
      outputPath: `${HOUSE}/old/restore.jpg`,
      costUsd: 0.15,
      createdAt: "2026-11-14T19:00:00.000Z",
    });
    h.repo.add(makeJob(JOB, scenePlan(sheet), { bypassCache: true }));
    await advanceJob(JOB, h.deps);
    expect(h.mock.submits[0].model).toBe("restore");
    expect(h.repo.peek(JOB).steps[2].cacheHit).toBe(false);
  });

  it("stores live outputs in the cache, never mock ones", async () => {
    const live = harness("live");
    live.repo.add(makeJob(JOB, scenePlan(sheet)));
    await advanceJob(JOB, live.deps);
    expect(live.cache.entries.get(restoreKey)).toMatchObject({
      model: MODELS.restore.id,
      outputPath: `${HOUSE}/${JOB}/restore.out`,
      costUsd: estimateCostUsd("restore"),
    });

    const mock = harness("mock");
    mock.repo.add(makeJob(JOB, scenePlan(sheet)));
    await advanceJob(JOB, mock.deps);
    expect(mock.cache.entries.size).toBe(0);
  });
});

describe("advanceJob: budget guard", () => {
  it("records live spend per step while under budget", async () => {
    const h = harness("live");
    h.live.pollsBeforeDone = 1;
    h.repo.add(makeJob(JOB, scenePlan(sheet)));
    const result = await advanceJob(JOB, h.deps);
    expect(result.notice).toBeUndefined();
    expect(h.live.submits).toHaveLength(1);
    expect(h.repo.peek(JOB).steps[2].costUsd).toBe(estimateCostUsd("restore"));
  });

  it("switches to mock once FAL_BUDGET_USD is spent, and says so", async () => {
    const h = harness("live");
    h.mock.pollsBeforeDone = 1;
    h.repo.extraSpent = 5;
    h.repo.add(makeJob(JOB, scenePlan(sheet)));

    const result = await advanceJob(JOB, h.deps);
    expect(result.notice).toBe(BUDGET_NOTICE);
    expect(h.live.submits).toHaveLength(0);
    expect(h.mock.submits).toHaveLength(1);
    expect(h.repo.peek(JOB).steps[2]).toMatchObject({
      falRequestId: "mock_1",
      costUsd: 0,
      error: BUDGET_NOTICE,
    });

    // The mock request is polled on the mock gateway even though AI_MODE is live.
    await advanceJob(JOB, h.deps);
    expect(h.repo.peek(JOB).steps[2]).toMatchObject({ status: "done", error: BUDGET_NOTICE });
    expect(h.cache.entries.size).toBe(0);
  });
});
