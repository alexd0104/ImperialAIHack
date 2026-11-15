import { copy } from "@/lib/copy";

/** 3D defaults built once by `pnpm objects:make` (S14): the only library Objects (B15). */
export const defaultObjects3d = ["armchair", "record-player", "teapot"] as const;

// The "3d-" prefix keeps library names apart from the old SVG names that existing Stories
// still use (`object.kind === "svg"`); those keep rendering, they are just not offered.
export const objectLibrary = defaultObjects3d.map((name) => `3d-${name}` as const);
export type LibraryName = (typeof objectLibrary)[number];

/** Committed GLB path for a 3D default, or null for an SVG library Object. */
export function libraryGlbPath(name: string): string | null {
  return name.startsWith("3d-") ? `/objects/glb/${name.slice(3)}.glb` : null;
}
/** 2D thumbnail of a library Object for the Studio picker. */
export function libraryImage(name: LibraryName): string {
  return `/objects/thumbs/${name.slice(3)}.png`;
}
export function objectLabel(name: LibraryName) {
  return copy.studio.createStory.objects[name];
}
