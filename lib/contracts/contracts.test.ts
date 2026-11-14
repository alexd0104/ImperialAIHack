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
import {
  ApiErrorResponse,
  Asset,
  AssetView,
  apiSuccess,
  BundleQuery,
  CreateHouseRequest,
  CreateRoomRequest,
  CreateStoryRequest,
  ERROR_STATUS,
  ErrorCode,
  Event,
  House,
  HouseBundle,
  HouseEventRequest,
  Job,
  JobView,
  Memory,
  MemorySheet,
  Room,
  Scene,
  SceneChoiceRequest,
  Story,
  UpdateMemoryRequest,
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
