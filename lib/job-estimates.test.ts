import { describe, expect, it } from "vitest";
import { estimateMinutes, estimateRemainingSeconds } from "./job-estimates";

describe("job estimates", () => {
  it("skips done and skipped steps", () => {
    const steps = [
      { name: "compile", status: "done" },
      { name: "restore", status: "skipped" },
      { name: "animate", status: "running" },
    ] as const;
    expect(estimateRemainingSeconds(steps)).toBe(90);
    expect(estimateMinutes(steps)).toBe(2);
  });

  it("returns null when finished", () => {
    expect(estimateMinutes([{ name: "finalize", status: "done" }])).toBeNull();
  });
});
