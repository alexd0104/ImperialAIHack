import { describe, expect, it } from "vitest";
import { Job } from "@/lib/contracts";
import { cacheKey, stableStringify } from "./cache";
import { newJob, object3dPlan, roomBackgroundPlan, scenePlan } from "./plans";
import { briaColour, extensionOf, sceneOutputsOf } from "./steps";
import { makeJob } from "./test-fakes";

const enabled = (steps: { name: string; status: string }[]) =>
  steps.filter((s) => s.status !== "skipped").map((s) => s.name);

describe("step plans", () => {
  it("builds the full scene chain when everything is asked for", () => {
    expect(enabled(scenePlan({ restore: true, colour: "colourise", motion: "gentle" }))).toEqual([
      "compile",
      "upload",
      "restore",
      "colourise",
      "animate",
      "ambience",
      "finalize",
    ]);
  });

  it("keeps disabled scene steps visible as skipped", () => {
    const steps = scenePlan({ restore: false, colour: "keep_bw", motion: "still" });
    expect(steps).toHaveLength(7);
    expect(enabled(steps)).toEqual(["compile", "upload", "ambience", "finalize"]);
    expect(steps.every((s) => s.attempts === 0)).toBe(true);
  });

  it("builds object and room chains", () => {
    expect(enabled(object3dPlan())).toEqual([
      "upload",
      "cutout",
      "model3d",
      "compress",
      "finalize",
    ]);
    expect(enabled(roomBackgroundPlan())).toEqual(["upload", "room_edit", "finalize"]);
  });

  it("creates a queued job that satisfies the Job contract", () => {
    const job = newJob({
      type: "scene",
      houseId: "6650a1f0c0ffee0000000001",
      memoryId: "6650a1f0c0ffee0000000004",
      sceneId: "6650a1f0c0ffee0000000021",
      steps: scenePlan({ restore: true, colour: "already_colour", motion: "gentle" }),
      falKeyLabel: "dev",
      now: "2026-11-14T20:00:00.000Z",
    });
    const parsed = Job.parse({ ...job, id: "6650a1f0c0ffee0000000031" });
    expect(parsed).toMatchObject({ status: "queued", current: 0, lockedUntil: null });
  });
});

describe("cache key", () => {
  it("ignores param order and changes with model, params or input file", () => {
    const base = cacheKey("m", { a: 1, b: { c: 2, d: [1, 2] } }, "sha");
    expect(cacheKey("m", { b: { d: [1, 2], c: 2 }, a: 1 }, "sha")).toBe(base);
    expect(cacheKey("m2", { a: 1, b: { c: 2, d: [1, 2] } }, "sha")).not.toBe(base);
    expect(cacheKey("m", { a: 1, b: { c: 3, d: [1, 2] } }, "sha")).not.toBe(base);
    expect(cacheKey("m", { a: 1, b: { c: 2, d: [1, 2] } }, "sha2")).not.toBe(base);
    expect(base).toMatch(/^[a-f0-9]{64}$/);
  });

  it("drops undefined fields like JSON does", () => {
    expect(stableStringify({ a: undefined, b: 1 })).toBe('{"b":1}');
  });
});

describe("sceneOutputsOf", () => {
  const done = (name: string, output: string) => ({
    name: name as never,
    status: "done" as const,
    output,
    attempts: 1,
  });

  it("uses the clip with its sound when the scene was animated", () => {
    const job = makeJob("6650a1f0c0ffee0000000031", [
      done("restore", "h/j/restore.jpg"),
      done("animate", "h/j/animate.mp4"),
      done("ambience", "h/j/ambience.mp4"),
    ]);
    expect(sceneOutputsOf(job)).toEqual({
      restored: "h/j/restore.jpg",
      colourised: undefined,
      clip: "h/j/ambience.mp4",
      ambience: undefined,
    });
  });

  it("keeps ambience as separate audio for a still scene", () => {
    const job = makeJob("6650a1f0c0ffee0000000031", [done("ambience", "h/j/ambience.wav")]);
    expect(sceneOutputsOf(job)).toMatchObject({ clip: undefined, ambience: "h/j/ambience.wav" });
  });
});

describe("step helpers", () => {
  it("keeps only colour styles Bria accepts", () => {
    expect(briaColour("sepia vintage")).toBe("sepia vintage");
    expect(briaColour("none")).toBe("contemporary color");
    expect(briaColour("warm 1960s tones")).toBe("contemporary color");
  });

  it("names stored outputs after the file, else the model's mime", () => {
    expect(extensionOf("https://v3.fal.media/files/x/audio.flac", "audio/flac")).toBe("flac");
    expect(extensionOf("file:///repo/mocks/media/ambience.wav", "audio/flac")).toBe("wav");
    expect(extensionOf("https://fal.media/x/out.jpeg?sig=1", "image/png")).toBe("jpg");
    expect(extensionOf("https://fal.media/x/blob", "video/mp4")).toBe("mp4");
    expect(extensionOf("https://fal.media/x/file.exe", "image/jpeg")).toBe("jpg");
  });
});
