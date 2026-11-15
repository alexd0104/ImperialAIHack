import { describe, expect, it } from "vitest";
import { polaroidLayout, STAGE_HEIGHT, STAGE_WIDTH, slotBox, slotToScene } from "./layout";

describe("slotBox", () => {
  it("centres the Object on the Slot, width from scale", () => {
    const box = slotBox({ x: 0.5, y: 0.5, scale: 0.2 }, 1.5);
    expect(box.width).toBeCloseTo(238.8);
    expect(box.height).toBeCloseTo(358.2);
    expect(box.left).toBeCloseTo(597 - 119.4);
    expect(box.top).toBeCloseTo(417 - 179.1);
  });
});

describe("slotToScene", () => {
  it("maps the canvas to a centred, y-up scene", () => {
    expect(slotToScene({ x: 0.5, y: 0.5 })).toEqual([0, 0]);
    expect(slotToScene({ x: 0, y: 0 })).toEqual([-STAGE_WIDTH / 2, STAGE_HEIGHT / 2]);
  });
});

describe("polaroidLayout", () => {
  it("returns one place per Memory, all on the stage", () => {
    for (const origin of [
      { x: 0.05, y: 0.95 },
      { x: 0.5, y: 0.6 },
      { x: 0.98, y: 0.1 },
    ]) {
      for (let count = 1; count <= 5; count++) {
        const places = polaroidLayout(count, origin);
        expect(places).toHaveLength(count);
        for (const p of places) {
          expect(p.x - 100).toBeGreaterThanOrEqual(0);
          expect(p.x + 100).toBeLessThanOrEqual(STAGE_WIDTH);
          expect(p.y - 125).toBeGreaterThanOrEqual(0);
          expect(p.y + 125).toBeLessThanOrEqual(STAGE_HEIGHT);
        }
      }
    }
  });

  it("is empty with no Memories and centred for one", () => {
    expect(polaroidLayout(0, { x: 0.5, y: 0.5 })).toEqual([]);
    expect(polaroidLayout(1, { x: 0.5, y: 0.7 })[0]).toMatchObject({ x: 597, tilt: 0 });
  });
});
