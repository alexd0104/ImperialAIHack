import { describe, expect, it } from "vitest";
import { defaultObjectGlbPath, defaultObjectName, defaultObjectThumbPath } from "./object-names";

describe("default object naming", () => {
  it("slugs the source file name", () => {
    expect(defaultObjectName("Record Player.JPG")).toBe("record-player");
    expect(defaultObjectName("armchair.jpg")).toBe("armchair");
  });
  it("builds public paths", () => {
    expect(defaultObjectGlbPath("teapot")).toBe("/objects/glb/teapot.glb");
    expect(defaultObjectThumbPath("teapot")).toBe("/objects/thumbs/teapot.png");
  });
});
