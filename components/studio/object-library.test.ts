import { describe, expect, it } from "vitest";
import { libraryGlbPath, libraryImage, objectLibrary } from "./object-library";

describe("object library (S14)", () => {
  it("lists the 3D defaults first", () => {
    expect(objectLibrary.slice(0, 3)).toEqual(["3d-armchair", "3d-record-player", "3d-teapot"]);
  });
  it("maps 3D defaults to committed GLBs and thumbnails, SVGs to nothing", () => {
    expect(libraryGlbPath("3d-teapot")).toBe("/objects/glb/teapot.glb");
    expect(libraryGlbPath("teapot")).toBeNull();
    expect(libraryImage("3d-record-player")).toBe("/objects/thumbs/record-player.png");
    expect(libraryImage("teapot")).toBe("/objects/teapot.svg");
  });
});
