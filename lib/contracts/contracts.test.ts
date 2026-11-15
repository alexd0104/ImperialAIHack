import { describe, expect, it } from "vitest";
import type { z } from "zod";
import asset from "./__fixtures__/asset.json";
import event from "./__fixtures__/event.json";
import house from "./__fixtures__/house.json";
import houseBundle from "./__fixtures__/house-bundle.json";
import job from "./__fixtures__/job.json";
import memory from "./__fixtures__/memory.json";
import memorySheet from "./__fixtures__/memory-sheet.json";
import room from "./__fixtures__/room.json";
import scenes from "./__fixtures__/scenes.json";
import story from "./__fixtures__/story.json";
import v2 from "./__fixtures__/v2.json";
import {
  ApiErrorResponse,
  Asset,
  AssetView,
  apiSuccess,
  BundleQuery,
  CreateHouseRequest,
  CreateRoomRequest,
  CreateStoryRequest,
  DEFAULT_SCENE_MOTION,
  ERROR_STATUS,
  ErrorCode,
  Event,
  House,
  HouseBundle,
  HouseEventRequest,
  Job,
  JobType,
  JobView,
  LabRun,
  Memory,
  MemorySheet,
  Room,
  resolveRoomBackground,
  resolveSceneMotion,
  Scene,
  SceneChoiceRequest,
  SceneMotion,
  Story,
  StoryPosition,
  UpdateMemoryRequest,
  UpdateRoomRequest,
  UpdateSceneRequest,
  UpdateStoryRequest,
} from "./index";

const clone = <T>(v: T): T => structuredClone(v);

type Case = {
  name: string;
  schema: z.ZodType;
  valid: unknown;
  invalid: unknown;
};

const cases: Case[] = [
  {
    name: "House",
    schema: House,
    valid: house,
    invalid: { ...house, consentAt: "yesterday" },
  },
  {
    name: "Room",
    schema: Room,
    valid: room,
    invalid: (() => {
      const r = clone(room);
      r.slots[0].x = 1.4; // slots are normalised 0..1
      return r;
    })(),
  },
  {
    name: "Story",
    schema: Story,
    valid: story,
    invalid: { ...story, object: { kind: "png", path: "x" } },
  },
  {
    name: "MemorySheet",
    schema: MemorySheet,
    valid: memorySheet,
    invalid: { ...memorySheet, colour: "sepia" },
  },
  {
    name: "Memory",
    schema: Memory,
    valid: memory,
    invalid: { ...memory, status: "done" },
  },
  {
    name: "Asset",
    schema: Asset,
    valid: asset,
    invalid: { ...asset, kind: "document" },
  },
  {
    name: "Scene",
    schema: Scene,
    valid: scenes[0],
    invalid: {
      ...scenes[0],
      choice: { use: "animated", colour: "sepia", restored: true },
    },
  },
  {
    name: "Job",
    schema: Job,
    valid: job,
    invalid: { ...job, steps: [{ name: "upscale", status: "pending" }] },
  },
  {
    name: "Event",
    schema: Event,
    valid: event,
    invalid: { ...event, type: "like" },
  },
  {
    name: "HouseBundle",
    schema: HouseBundle,
    valid: houseBundle,
    invalid: { ...houseBundle, mode: "solo" },
  },
];

describe("entity fixtures", () => {
  it.each(cases)("$name: fixture parses", ({ schema, valid }) => {
    const result = schema.safeParse(valid);
    expect(result.error?.issues).toBeUndefined();
  });

  it.each(cases)("$name: invalid case is rejected", ({ schema, invalid }) => {
    expect(schema.safeParse(invalid).success).toBe(false);
  });

  it("every scene fixture parses (2 scenes: done + fallback)", () => {
    const parsed = scenes.map((s) => Scene.parse(s));
    expect(parsed.map((s) => s.status)).toEqual(["done", "fallback"]);
  });

  it("MemorySheet applies its defaults", () => {
    const sheet = MemorySheet.parse({
      title: "Christmas by the fire, 1982",
      people: [],
      colour: "colourise",
    });
    expect(sheet).toMatchObject({
      restore: true,
      motion: "gentle",
      okAlone: false,
      source: "form",
    });
  });

  it("HouseBundle keeps empty slots as null", () => {
    const bundle = HouseBundle.parse(houseBundle);
    expect(bundle.rooms[0].slots[1].story).toBeNull();
  });
});

describe("route bodies", () => {
  it("CreateHouseRequest requires consent", () => {
    expect(CreateHouseRequest.safeParse({ firstName: "Frank", consent: true }).success).toBe(true);
    expect(CreateHouseRequest.safeParse({ firstName: "Frank", consent: false }).success).toBe(
      false,
    );
  });

  it("CreateRoomRequest discriminates on source", () => {
    expect(
      CreateRoomRequest.safeParse({
        name: "Garden",
        source: "style",
        style: "garden",
      }).success,
    ).toBe(true);
    expect(
      CreateRoomRequest.safeParse({
        name: "Kitchen",
        source: "photo",
        assetId: "a1",
      }).success,
    ).toBe(true);
    expect(CreateRoomRequest.safeParse({ name: "Garden", source: "photo" }).success).toBe(false);
  });

  it("CreateStoryRequest accepts a photo or a library object", () => {
    const base = { slotId: "bench", title: "Summers in Brighton" };
    expect(
      CreateStoryRequest.safeParse({
        ...base,
        object: { kind: "library", name: "deckchair" },
      }).success,
    ).toBe(true);
    expect(CreateStoryRequest.safeParse({ ...base, object: { kind: "library" } }).success).toBe(
      false,
    );
  });

  it("UpdateMemoryRequest accepts partial answers", () => {
    expect(UpdateMemoryRequest.safeParse({ answers: { people: ["Frank"] } }).success).toBe(true);
    expect(UpdateMemoryRequest.safeParse({ answers: { colour: "sepia" } }).success).toBe(false);
  });

  it("UpdateMemoryRequest stays partial (no sheet defaults leak in)", () => {
    const body = UpdateMemoryRequest.parse({ answers: { place: "Brighton" } });
    expect(body.answers).toEqual({ place: "Brighton" });
  });

  it("view schemas strip internal job and asset fields", () => {
    const view = JobView.parse(job);
    expect(view).not.toHaveProperty("falKeyLabel");
    expect(view.steps[4]).not.toHaveProperty("falRequestId");
    const a = AssetView.parse(asset);
    expect(a).not.toHaveProperty("path");
    expect(a.url).toMatch(/^\/api\/files\//);
  });

  it("SceneChoiceRequest rejects unknown values", () => {
    expect(
      SceneChoiceRequest.safeParse({
        use: "still",
        colour: "bw",
        restored: false,
      }).success,
    ).toBe(true);
    expect(
      SceneChoiceRequest.safeParse({ use: "zoom", colour: "bw", restored: false }).success,
    ).toBe(false);
  });

  it("BundleQuery defaults to together", () => {
    expect(BundleQuery.parse({}).mode).toBe("together");
    expect(BundleQuery.safeParse({ mode: "solo" }).success).toBe(false);
  });

  it("HouseEventRequest validates the event type", () => {
    expect(HouseEventRequest.safeParse({ type: "heart", memoryId: "m1" }).success).toBe(true);
    expect(HouseEventRequest.safeParse({ type: "share", memoryId: "m1" }).success).toBe(false);
  });
});

describe("envelopes", () => {
  it("wraps data and parses errors", () => {
    expect(apiSuccess(House).safeParse({ data: house }).success).toBe(true);
    expect(
      ApiErrorResponse.safeParse({
        error: { code: "not_found", message: "No", retryable: false },
      }).success,
    ).toBe(true);
    expect(
      ApiErrorResponse.safeParse({
        error: { code: "teapot", message: "No", retryable: false },
      }).success,
    ).toBe(false);
  });

  it("maps every error code to an HTTP status", () => {
    for (const code of ErrorCode.options) {
      expect(ERROR_STATUS[code]).toBeGreaterThanOrEqual(400);
    }
  });
});

describe("contracts v2 (F7)", () => {
  it("v2 fixtures parse", () => {
    expect(Room.safeParse(v2.room).success).toBe(true);
    expect(Story.safeParse(v2.story).success).toBe(true);
    expect(Scene.safeParse(v2.scene).success).toBe(true);
    expect(LabRun.safeParse(v2.labRun).success).toBe(true);
  });

  it("v1 documents still parse and get the gentle 5 s motion", () => {
    const scene = Scene.parse(scenes[0]);
    expect(resolveSceneMotion(scene)).toEqual(DEFAULT_SCENE_MOTION);
    expect(resolveSceneMotion(Scene.parse(v2.scene)).durationSec).toBe(10);
    expect(scene.soundMode).toBeUndefined();
    expect(Story.parse(story).position).toBeUndefined();
    expect(Room.parse(room).background).toBeUndefined();
  });

  it("motion accepts only 5 or 10 s and ≤ 200 chars", () => {
    expect(SceneMotion.safeParse({ preset: "gentle", durationSec: 7 }).success).toBe(false);
    expect(
      SceneMotion.safeParse({ preset: "custom", text: "x".repeat(201), durationSec: 5 }).success,
    ).toBe(false);
  });

  it("story position stays on the canvas", () => {
    expect(StoryPosition.safeParse({ x: 1.2, y: 0.5, scale: 0.2 }).success).toBe(false);
    expect(StoryPosition.safeParse({ x: 0.5, y: 0.5, scale: 0.01 }).success).toBe(false);
  });

  it("pending background needs a job id", () => {
    const { jobId: _jobId, ...noJob } = v2.room.pendingBackground;
    expect(Room.safeParse({ ...v2.room, pendingBackground: noJob }).success).toBe(false);
  });

  it("resolveRoomBackground falls back to v1 fields", () => {
    expect(resolveRoomBackground(Room.parse(room))).toEqual({ kind: "style", style: "garden" });
    expect(resolveRoomBackground(Room.parse(v2.room))?.kind).toBe("photo");
  });

  it("lab scores are 1–5", () => {
    const bad = { ...v2.labRun, scores: { ...v2.labRun.scores, liked: 6 } };
    expect(LabRun.safeParse(bad).success).toBe(false);
  });

  it("bundle accepts version, bedUrl and story position", () => {
    const bundle = clone(houseBundle);
    const b = bundle as unknown as {
      version: string;
      rooms: {
        slots: { story: { position?: unknown; memories: { scenes: object[] }[] } | null }[];
      }[];
    };
    b.version = "abc123";
    const s = b.rooms[0].slots[0].story;
    if (s) {
      s.position = { x: 0.22, y: 0.68, scale: 0.18 };
      s.memories[0].scenes[0] = { ...s.memories[0].scenes[0], bedUrl: "/beds/beach.mp3" };
    }
    expect(HouseBundle.safeParse(bundle).success).toBe(true);
    expect(JobType.safeParse("scene_sound").success).toBe(true);
  });

  it("v2 route bodies", () => {
    expect(UpdateSceneRequest.safeParse({ soundMode: "clip" }).success).toBe(true);
    expect(UpdateSceneRequest.safeParse({ soundMode: "music" }).success).toBe(false);
    expect(
      UpdateRoomRequest.safeParse({ background: { kind: "photo", assetId: "a1" } }).success,
    ).toBe(true);
    expect(UpdateRoomRequest.safeParse({ background: { kind: "style" } }).success).toBe(false);
    expect(UpdateStoryRequest.safeParse({ position: null }).success).toBe(true);
    expect(UpdateStoryRequest.safeParse({ position: { x: 0.1, y: 0.2, scale: 0.3 } }).success).toBe(
      true,
    );
  });
});
