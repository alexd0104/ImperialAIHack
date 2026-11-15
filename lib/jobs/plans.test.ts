import { describe, expect, it } from "vitest";
import { Job } from "@/lib/contracts";
import { cacheKey, stableStringify } from "./cache";
import {
  ambienceParams,
  animateParams,
  newJob,
  object3dPlan,
  roomBackgroundPlan,
  scenePlan,
  soundPlan,
} from "./plans";
import {
  briaColour,
  extensionOf,
  mergeSceneOutputs,
  sceneOutputsOf,
  sceneStatusAfter,
} from "./steps";
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

describe("animateParams (P7)", () => {
  const prompts = { motionPrompt: "m", negativePrompt: "n" };
  it('sets duration "10" and 10 s of cost for a 10 s scene', () => {
    const out = animateParams(prompts, { preset: "gentle", durationSec: 10 });
    expect(out.params.duration).toBe("10");
    expect(out.seconds).toBe(10);
  });
  it('defaults to "5"', () => {
    expect(animateParams(prompts, { preset: "gentle", durationSec: 5 }).params.duration).toBe("5");
  });
});

describe("ambienceParams (P8)", () => {
  it("sends events, negative prompt and the clip length", () => {
    const p = ambienceParams({ ambiencePrompt: "waves breaking, no music" }, 10);
    expect(p).toMatchObject({ prompt: "waves breaking, no music", duration: 10 });
    expect(String(p.negative_prompt)).toMatch(/music/);
  });
});

describe("sound and video in parallel (P10)", () => {
  const sheet = { restore: true, colour: "keep_bw", motion: "gentle" } as const;
  const step = (name: string, status: string, output?: string) => ({
    name,
    status,
    attempts: 0,
    output,
  });
  const jobOf = (type: string, status: string, steps: ReturnType<typeof step>[]) =>
    ({ type, status, steps }) as never;

  it("skips ambience in the scene plan in text mode only", () => {
    expect(enabled(scenePlan(sheet, "text"))).not.toContain("ambience");
    expect(enabled(scenePlan(sheet, "clip"))).toContain("ambience");
    expect(enabled(soundPlan())).toEqual(["compile", "ambience", "finalize"]);
  });

  it("merges outputs whichever job settles first", () => {
    const sceneJob = jobOf("scene", "done", [step("animate", "done", "clip.mp4")]);
    const soundJob = jobOf("scene_sound", "done", [step("ambience", "done", "air.wav")]);
    const afterSound = mergeSceneOutputs({}, soundJob, true);
    expect(afterSound).toEqual({ ambience: "air.wav" });
    expect(mergeSceneOutputs(afterSound, sceneJob, true)).toMatchObject({
      clip: "clip.mp4",
      ambience: "air.wav",
    });
    const afterScene = mergeSceneOutputs({}, sceneJob, true);
    expect(mergeSceneOutputs(afterScene, soundJob, true)).toMatchObject({
      clip: "clip.mp4",
      ambience: "air.wav",
    });
  });

  it("finishes the scene only when both jobs are final; failed sound is not fatal", () => {
    expect(sceneStatusAfter({ status: "done" }, { status: "running" })).toBe("generating");
    expect(sceneStatusAfter({ status: "running" }, { status: "done" })).toBe("generating");
    expect(sceneStatusAfter({ status: "done" }, { status: "failed" })).toBe("done");
    expect(sceneStatusAfter({ status: "fallback" }, { status: "done" })).toBe("fallback");
    expect(sceneStatusAfter({ status: "done" }, null)).toBe("done");
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
