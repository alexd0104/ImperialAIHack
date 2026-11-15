import { describe, expect, it } from "vitest";
import { LabRun } from "@/lib/contracts/lab";
import { MemorySheet } from "@/lib/contracts/memory-sheet";
import { mockLabModel } from "./mock-model";
import { TEST_PHOTOS } from "./photos";
import { runExperiment } from "./run-experiment";

describe("runExperiment (mock)", () => {
  it("makes 20 valid runs: 5 photos × 4 approaches", async () => {
    const runs = await runExperiment({ photos: TEST_PHOTOS, model: mockLabModel });
    expect(runs).toHaveLength(20);
    for (const [i, r] of runs.entries()) {
      expect(LabRun.safeParse({ ...r, id: `r${i}` }).success).toBe(true);
      expect(MemorySheet.safeParse(r.sheet).success).toBe(true);
      expect(Object.keys(r.prompts).length).toBeGreaterThan(0);
    }
    expect(new Set(runs.map((r) => r.approach)).size).toBe(4);
  });

  it("is reproducible", async () => {
    const now = () => "2026-11-15T00:00:00.000Z";
    const a = await runExperiment({ photos: TEST_PHOTOS, model: mockLabModel, now });
    const b = await runExperiment({ photos: TEST_PHOTOS, model: mockLabModel, now });
    expect(a).toEqual(b);
  });

  it("agent transcript has at most 4 turns and photo questions exactly 3", async () => {
    const runs = await runExperiment({ photos: TEST_PHOTOS.slice(0, 1), model: mockLabModel });
    const agent = runs.find((r) => r.approach === "agent");
    const pq = runs.find((r) => r.approach === "photo_questions");
    expect(((agent?.inputs.transcript ?? []) as unknown[]).length).toBeLessThanOrEqual(4);
    expect(((pq?.inputs.qa ?? []) as unknown[]).length).toBe(3);
  });
});
