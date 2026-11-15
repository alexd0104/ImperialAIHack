import { describe, expect, it } from "vitest";
import { libraryGlbPath, libraryImage, objectLibrary } from "./object-library";

describe("object library (S14)", () => {
  it("offers only the 3D defaults (B15)", () => {
    expect(objectLibrary).toEqual(["3d-armchair", "3d-record-player", "3d-teapot"]);
  });
  it("maps 3D defaults to committed GLBs and thumbnails; old SVG names to no GLB", () => {
    expect(libraryGlbPath("3d-teapot")).toBe("/objects/glb/teapot.glb");
    expect(libraryGlbPath("teapot")).toBeNull();
    expect(libraryImage("3d-record-player")).toBe("/objects/thumbs/record-player.png");
  });
});
