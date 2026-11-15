import { afterEach, describe, expect, it } from "vitest";
import { scenePlan } from "./plans";
import { harness, makeJob } from "./test-fakes";
import { JOBS_PER_TICK, startTicker, stopTicker, tick } from "./ticker";

afterEach(() => {
  stopTicker();
});

const ids = Array.from({ length: 6 }, (_, i) => `6650a1f0c0ffee00000000${(40 + i).toString()}`);

describe("ticker", () => {
  it("starts only once per process, even if instrumentation runs again (hot reload)", () => {
    const h = harness();
    expect(startTicker(h.deps)).toBe(true);
    expect(startTicker(h.deps)).toBe(false);
    stopTicker();
    expect(startTicker(h.deps)).toBe(true);
  });

  it("advances at most JOBS_PER_TICK active jobs per tick", async () => {
    const h = harness();
    h.mock.pollsBeforeDone = 1;
    for (const id of ids)
      h.repo.add(makeJob(id, scenePlan({ restore: true, colour: "keep_bw", motion: "gentle" })));
    h.repo.add(
      makeJob(
        "6650a1f0c0ffee0000000099",
        scenePlan({ restore: true, colour: "keep_bw", motion: "gentle" }),
        { status: "done" },
      ),
    );
    expect(await tick(h.deps)).toBe(JOBS_PER_TICK);
    const started = [...h.repo.jobs.values()].filter((j) => j.status === "running");
    expect(started).toHaveLength(JOBS_PER_TICK);
  });

  it("does nothing when no job is active", async () => {
    const h = harness();
    expect(await tick(h.deps)).toBe(0);
  });
});
