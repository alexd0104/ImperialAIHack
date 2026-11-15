import type { BundleScene } from "@/lib/contracts";

/**
 * What the House shows when a scene can't move (B10): a photo scene is its own still;
 * a clip or video falls back to that scene's still, and only then to the Memory's polaroid.
 */
export function sceneStill(scene: BundleScene, polaroidUrl: string): string {
  if (scene.kind === "photo") return scene.url;
  return scene.stillUrl ?? polaroidUrl;
}
