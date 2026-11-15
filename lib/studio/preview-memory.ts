import type { AssetView, BundleMemory, BundleScene, SceneView } from "@/lib/contracts";

// Same scene timings as the House bundle (lib/house/bundle.ts), so the preview is what Frank hears.
const CLIP_MS = 5000;
const PHOTO_MS = 6000;
const VIDEO_FALLBACK_MS = 8000;

/** Browser-side BundleMemory for the Studio preview: song + voice + ambience as the House plays them. */
export function buildPreviewMemory(memory: {
  id: string;
  title: string;
  scenes: SceneView[];
  assets: AssetView[];
}): BundleMemory | null {
  const scenes = [...memory.scenes].sort((a, b) => a.order - b.order);
  const out: BundleScene[] = [];
  let polaroid: string | undefined;
  for (const scene of scenes) {
    const colour = scene.choice
      ? scene.choice.restored && scene.choice.colour === "colour"
      : Boolean(scene.urls.colourised);
    const still =
      scene.choice && !scene.choice.restored
        ? scene.originalUrl
        : ((colour ? scene.urls.colourised : undefined) ??
          scene.urls.restored ??
          scene.originalUrl);
    polaroid ??= still;
    const animated = (scene.choice?.use ?? "animated") === "animated";
    if (animated && scene.urls.clip) {
      out.push({
        kind: "clip",
        url: scene.urls.clip,
        durationMs: CLIP_MS,
        ...(still ? { stillUrl: still } : {}),
      });
    } else if (still) {
      out.push({ kind: "photo", url: still, durationMs: PHOTO_MS });
    }
  }
  const own = memory.assets;
  for (const video of own.filter((a) => a.kind === "video")) {
    out.push({ kind: "video", url: video.url, durationMs: video.durationMs ?? VIDEO_FALLBACK_MS });
  }
  if (out.length === 0 || !polaroid) return null;
  const song = own.find((a) => a.kind === "song");
  const voice = own.find((a) => a.kind === "voice");
  const ambience =
    scenes.find((s) => s.urls.ambience)?.urls.ambience ?? own.find((a) => a.kind === "audio")?.url;
  return {
    id: memory.id,
    title: memory.title,
    polaroidUrl: polaroid,
    scenes: out,
    songUrl: song?.url,
    ambienceUrl: ambience,
    voiceUrl: voice?.url,
    voiceDurationMs: voice?.durationMs,
  };
}
