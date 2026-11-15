import type { StoryObject, StoryPosition } from "@/lib/contracts";

export const CANVAS_WIDTH = 1194;
export const CANVAS_HEIGHT = 834;
const MIN_SCALE = 0.05;
const MAX_SCALE = 0.5;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const round = (value: number) => Math.round(value * 10000) / 10000;

/** Pointer pixel (relative to the box's top-left) to a position on the 0..1 canvas, kept inside it. */
export function normalizePoint(
  px: number,
  py: number,
  box: { width: number; height: number },
  scale: number,
): StoryPosition {
  const s = clamp(scale, MIN_SCALE, MAX_SCALE);
  // Keep the whole object visible: half its width/height stays inside the canvas.
  const halfW = s / 2;
  const halfH = (s * CANVAS_WIDTH) / CANVAS_HEIGHT / 2;
  return {
    x: round(clamp(px / box.width, halfW, 1 - halfW)),
    y: round(clamp(py / box.height, halfH, 1 - halfH)),
    scale: round(s),
  };
}

/** New width fraction when the corner handle is dragged by `dxPx` pixels. */
export function resizeScale(start: number, dxPx: number, boxWidth: number): number {
  return round(clamp(start + (dxPx * 2) / boxWidth, MIN_SCALE, MAX_SCALE));
}

/** Re-clamp a position after a resize so it stays on the canvas. */
export function fitPosition(position: StoryPosition): StoryPosition {
  return normalizePoint(position.x, position.y, { width: 1, height: 1 }, position.scale);
}

/** Browser URL of a Story's Object in the Studio (the session cookie covers /api/files). */
export function studioObjectUrl(object: Pick<StoryObject, "kind" | "path">): string {
  if (object.kind === "svg") return `/objects/${object.path}.svg`;
  return object.path.startsWith("/") ? object.path : `/api/files/${object.path}`;
}
