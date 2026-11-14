import type { AssetView } from "@/lib/contracts";

type Kind = AssetView["kind"];

/** A Memory can only be brought to life from at least one real photo or video. */
export function hasVisual(assets: readonly Pick<AssetView, "kind">[]): boolean {
  return assets.some((asset) => asset.kind === "photo" || asset.kind === "video");
}

/** Photos and videos share one picker; the file's own type decides the kind. */
export function visualKind(mime: string): Extract<Kind, "photo" | "video"> | undefined {
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  return undefined;
}

/** Photos are resized on the device; HEIC often can't be decoded there, so it goes up as is. */
export function needsResize(mime: string): boolean {
  return mime === "image/jpeg" || mime === "image/png";
}
