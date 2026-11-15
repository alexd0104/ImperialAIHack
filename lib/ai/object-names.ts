import path from "node:path";

/** Library name for a source photo: `Record Player.JPG` → `record-player`. */
export function defaultObjectName(file: string): string {
  return path
    .parse(file)
    .name.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Public paths (committed static assets) used by the library and the House. */
export const defaultObjectGlbPath = (name: string) => `/objects/glb/${name}.glb`;
export const defaultObjectThumbPath = (name: string) => `/objects/thumbs/${name}.png`;
