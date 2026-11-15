import { copy } from "@/lib/copy";

/** 3D defaults built once by `pnpm objects:make` (S14); listed first, available in every room. */
export const defaultObjects3d = ["armchair", "record-player", "teapot"] as const;
const svgObjects = [
  "watering-can",
  "flower",
  "sun-hat",
  "teapot",
  "mug",
  "apple",
  "record",
  "radio",
  "camera",
] as const;

// The "3d-" prefix keeps a 3D default apart from an SVG of the same name (teapot).
export const objectLibrary = [
  ...defaultObjects3d.map((name) => `3d-${name}` as const),
  ...svgObjects,
] as const;
export type LibraryName = (typeof objectLibrary)[number];

/** Committed GLB path for a 3D default, or null for an SVG library Object. */
export function libraryGlbPath(name: string): string | null {
  return name.startsWith("3d-") ? `/objects/glb/${name.slice(3)}.glb` : null;
}
/** 2D picture of a library Object for the Studio (thumbnail for 3D defaults). */
export function libraryImage(name: LibraryName): string {
  return name.startsWith("3d-") ? `/objects/thumbs/${name.slice(3)}.png` : `/objects/${name}.svg`;
}
export function objectLabel(name: LibraryName) {
  return copy.studio.createStory.objects[name];
}
