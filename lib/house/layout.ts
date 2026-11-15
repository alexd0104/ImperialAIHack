// Geometry of the House stage (Figma v5 frames are 1194 × 834). Slots are normalised
// 0..1 on this canvas: (x, y) is the centre of the Object's base area and `scale` is
// its width as a fraction of the canvas width.

export const STAGE_WIDTH = 1194;
export const STAGE_HEIGHT = 834;

export type Box = { left: number; top: number; width: number; height: number };

/** Pixel box of an Object on the stage, given its image aspect ratio (height / width). */
export function slotBox(slot: { x: number; y: number; scale: number }, aspect = 1): Box {
  const width = slot.scale * STAGE_WIDTH;
  const height = width * aspect;
  return {
    left: slot.x * STAGE_WIDTH - width / 2,
    top: slot.y * STAGE_HEIGHT - height / 2,
    width,
    height,
  };
}

/** Same position in three.js units for an orthographic camera of 1 unit = 1 px, origin centre. */
export function slotToScene(slot: { x: number; y: number }): [number, number] {
  return [(slot.x - 0.5) * STAGE_WIDTH, (0.5 - slot.y) * STAGE_HEIGHT];
}

export type PolaroidPlace = { x: number; y: number; tilt: number };

const POLAROID_W = 200;
const POLAROID_H = 250;
const MARGIN = 24;

/**
 * Where the polaroids land when an Object opens (Figma "Flower opened"): a gentle arc
 * above the Object, centred on it, slightly tilted, kept fully on the stage.
 * Returns the centre of each polaroid in stage pixels.
 */
export function polaroidLayout(count: number, origin: { x: number; y: number }): PolaroidPlace[] {
  if (count <= 0) return [];
  const gap = 230;
  const cx = origin.x * STAGE_WIDTH;
  const cy = origin.y * STAGE_HEIGHT;
  const minX = MARGIN + POLAROID_W / 2;
  const maxX = STAGE_WIDTH - MARGIN - POLAROID_W / 2;
  const minY = MARGIN + POLAROID_H / 2;
  const maxY = STAGE_HEIGHT - MARGIN - POLAROID_H / 2;
  // Shift the whole row so it fits, instead of squashing it.
  const span = (count - 1) * gap;
  const startX = Math.min(Math.max(cx - span / 2, minX), Math.max(minX, maxX - span));
  return Array.from({ length: count }, (_, i) => {
    const offset = count === 1 ? 0 : i / (count - 1) - 0.5; // -0.5 … 0.5
    const x = Math.min(startX + i * gap, maxX);
    const y = Math.min(Math.max(cy - 300 + Math.abs(offset) * 60, minY), maxY);
    return { x, y, tilt: Math.round(offset * 10) };
  });
}
