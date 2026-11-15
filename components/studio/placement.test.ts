import { describe, expect, it } from "vitest";
import { fitPosition, normalizePoint, resizeScale } from "./placement";

const box = { width: 1194, height: 834 };

describe("placement", () => {
  it("normalises a pixel to 0..1", () => {
    expect(normalizePoint(597, 417, box, 0.2)).toEqual({ x: 0.5, y: 0.5, scale: 0.2 });
  });
  it("keeps the object on the canvas", () => {
    const p = normalizePoint(-50, 5000, box, 0.2);
    expect(p.x).toBe(0.1);
    expect(p.y).toBeLessThan(1);
    expect(p.y).toBeGreaterThan(0.8);
  });
  it("clamps scale", () => {
    expect(normalizePoint(500, 400, box, 5).scale).toBe(0.5);
    expect(resizeScale(0.2, -10000, 1194)).toBe(0.05);
    expect(resizeScale(0.2, 119.4, 1194)).toBe(0.4);
  });
  it("refits after a resize", () => {
    expect(fitPosition({ x: 0.95, y: 0.5, scale: 0.3 }).x).toBe(0.85);
  });
});
