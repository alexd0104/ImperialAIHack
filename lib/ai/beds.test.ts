import { describe, expect, it } from "vitest";
import { bedUrl, isBedId, pickBed } from "./beds";

describe("pickBed", () => {
  it("matches sound events to a bed", () => {
    expect(pickBed(["waves breaking", "seagulls"])).toBe("beach");
    expect(pickBed(["people laughing"])).toBe("crowd-laughter");
    expect(pickBed(["Rain on the roof"])).toBe("rain");
  });
  it("returns undefined without a match", () => {
    expect(pickBed(undefined)).toBeUndefined();
    expect(pickBed([])).toBeUndefined();
    expect(pickBed(["a piano"])).toBeUndefined();
  });
  it("validates ids and builds urls", () => {
    expect(isBedId("kitchen")).toBe(true);
    expect(isBedId("nope")).toBe(false);
    expect(bedUrl("fireplace")).toBe("/beds/fireplace.mp3");
  });
});
