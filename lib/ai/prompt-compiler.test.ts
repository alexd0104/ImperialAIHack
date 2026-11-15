import { afterEach, describe, expect, it, vi } from "vitest";
import { MemorySheet } from "@/lib/contracts";
import sheetFixture from "@/lib/contracts/__fixtures__/memory-sheet.json";
import type { ClaudePromptClient } from "./claude";
import { compilePrompts } from "./prompt-compiler";
import { DEFAULT_NEGATIVE_PROMPT, extractSoundEvents, MOTION_TEMPLATE } from "./prompt-templates";

const sheet = MemorySheet.parse(sheetFixture);

afterEach(() => {
  vi.restoreAllMocks();
});

function silenceWarnings() {
  vi.spyOn(console, "warn").mockImplementation(() => {});
}

describe("compilePrompts", () => {
  it("returns the mock fixture in mock mode", async () => {
    const result = await compilePrompts({ sheet });
    expect(result.source).toBe("mock");
    expect(result.motionPrompt).toMatch(/subtle/i);
    expect(result.negativePrompt.startsWith(DEFAULT_NEGATIVE_PROMPT)).toBe(true);
    expect(result.ambiencePrompt).toMatch(/no music/);
    expect(result.refusedRequests).toEqual([]);
    // The fixture says "contemporary color" but this family kept black and white.
    expect(result.colourStyle).toBe("none");
  });

  it("falls back to templates when the Claude client throws", async () => {
    silenceWarnings();
    const claude: ClaudePromptClient = {
      mode: "live",
      compilePrompts: () => Promise.reject(new Error("overloaded")),
    };
    const result = await compilePrompts({ sheet }, { claude });
    expect(result.source).toBe("template");
    expect(result.negativePrompt).toBe(DEFAULT_NEGATIVE_PROMPT);
    // Explicit sound events extracted from the answers (P8).
    expect(result.ambiencePrompt).toBe(
      "people laughing, waves breaking, seagulls calling, children playing in the distance, no music",
    );
    expect(result.colourStyle).toBe("none");
  });

  it("falls back to templates when Claude returns malformed output", async () => {
    silenceWarnings();
    const claude: ClaudePromptClient = {
      mode: "live",
      compilePrompts: async () => ({ motionPrompt: 42 }),
    };
    expect((await compilePrompts({ sheet }, { claude })).source).toBe("template");
  });

  it("always keeps the default negative prompt and adds 'no music'", async () => {
    const claude: ClaudePromptClient = {
      mode: "live",
      compilePrompts: async () => ({
        motionPrompt: " leaves moving gently ",
        negativePrompt: "dogs",
        ambiencePrompt: "birds",
        colourStyle: "none",
        refusedRequests: ["add grandpa"],
      }),
    };
    const result = await compilePrompts({ sheet }, { claude });
    expect(result).toMatchObject({
      source: "claude",
      motionPrompt: "leaves moving gently",
      negativePrompt: `${DEFAULT_NEGATIVE_PROMPT}, dogs`,
      ambiencePrompt: "birds, no music",
      refusedRequests: ["add grandpa"],
    });
  });

  it("template colourises only when the family chose it", async () => {
    silenceWarnings();
    const claude: ClaudePromptClient = {
      mode: "live",
      compilePrompts: () => Promise.reject(new Error("down")),
    };
    const result = await compilePrompts(
      { sheet: { ...sheet, colour: "colourise", soundOfPlace: undefined, place: undefined } },
      { claude },
    );
    expect(result.colourStyle).toBe("contemporary color");
    expect(result.ambiencePrompt).toMatch(/no music$/);
  });

  it("puts 'add grandpa' from free text in refusedRequests in mock mode", async () => {
    const result = await compilePrompts({
      sheet: { ...sheet, freeText: "Please add grandpa next to her. She loved the sea." },
    });
    expect(result.source).toBe("mock");
    expect(result.refusedRequests).toEqual(["Please add grandpa next to her"]);
    expect(result.motionPrompt).not.toMatch(/grandpa/i);
  });

  it("still reports refused requests when templates take over", async () => {
    silenceWarnings();
    const claude: ClaudePromptClient = {
      mode: "live",
      compilePrompts: () => Promise.reject(new Error("down")),
    };
    const result = await compilePrompts(
      { sheet: { ...sheet, freeText: "add grandpa" } },
      { claude },
    );
    expect(result.source).toBe("template");
    expect(result.refusedRequests).toEqual(["add grandpa"]);
    expect(result.motionPrompt).toBe(MOTION_TEMPLATE);
  });

  it("does not duplicate a refusal Claude already made", async () => {
    const claude: ClaudePromptClient = {
      mode: "live",
      compilePrompts: async () => ({
        motionPrompt: "",
        negativePrompt: "",
        ambiencePrompt: "waves, no music",
        colourStyle: "none",
        refusedRequests: ["Add grandpa next to her"],
      }),
    };
    const result = await compilePrompts(
      { sheet: { ...sheet, freeText: "Add grandpa next to her, and remove the dog." } },
      { claude },
    );
    expect(result.refusedRequests).toEqual(["Add grandpa next to her", "remove the dog"]);
    expect(result.motionPrompt).toBe(MOTION_TEMPLATE);
    expect(result.ambiencePrompt).toBe("waves, no music");
  });

  it("refuses nothing for harmless free text", async () => {
    const result = await compilePrompts({
      sheet: { ...sheet, freeText: "Dad loved this beach. Please add the sound of the waves." },
    });
    expect(result.refusedRequests).toEqual([]);
  });
});

describe("sound events (P8)", () => {
  const beach = { ...sheet, place: "Brighton beach", soundOfPlace: "everyone laughing" };

  it("extracts laughter and waves from beach + laughing answers", () => {
    const events = extractSoundEvents({ sheet: beach });
    expect(events).toContain("people laughing");
    expect(events).toContain("waves breaking");
    expect(events.join(" ")).not.toMatch(/music|speech/);
  });

  it("templates fill events and the ambience negative prompt", async () => {
    silenceWarnings();
    const client: ClaudePromptClient = {
      mode: "live",
      compilePrompts: async () => {
        throw new Error("down");
      },
    };
    const result = await compilePrompts({ sheet: beach }, { claude: client });
    expect(result.soundEvents).toEqual(
      expect.arrayContaining(["people laughing", "waves breaking"]),
    );
    expect(result.ambienceNegativePrompt).toMatch(/music/);
    expect(result.ambiencePrompt).toMatch(/no music$/);
  });
});

describe("custom motion (P7)", () => {
  it("adds the family's motion text for something that can move", async () => {
    const result = await compilePrompts({
      sheet,
      motion: { preset: "custom", text: "running on the beach", durationSec: 5 },
    });
    expect(result.motionPrompt).toMatch(/^running on the beach\./);
    // It replaces the "almost static" base instead of contradicting it, guardrails kept.
    expect(result.motionPrompt).not.toMatch(/very subtle|almost static/i);
    expect(result.motionPrompt).toContain("never add or remove anyone or anything");
    expect(result.motionRefused).toBeUndefined();
  });

  it("refuses a request to add something that is not in the photo", async () => {
    const result = await compilePrompts({
      sheet,
      motion: { preset: "custom", text: "add a dog", durationSec: 5 },
    });
    expect(result.motionPrompt).not.toContain("dog");
    expect(result.motionRefused).toMatch(/only bring to life what is in the photo/);
  });

  it("keeps the gentle prompt for the default motion", async () => {
    const result = await compilePrompts({ sheet, motion: { preset: "gentle", durationSec: 10 } });
    expect(result.motionRefused).toBeUndefined();
  });
});
