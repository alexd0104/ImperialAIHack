import type { BundleMemory } from "@/lib/contracts";

// Timing of one Memory (H6): scenes play in family order and the Memory lasts at least
// until the family voice has finished, holding the last scene meanwhile.

/** The voice starts once the first scene has settled. */
export const VOICE_START_MS = 1500;
/** Quiet after the voice before the Heart screen. */
export const VOICE_TAIL_MS = 1000;
export const CROSSFADE_MS = 600;

export const MUSIC_VOLUME = 0.7;
export const AMBIENCE_VOLUME = 0.35;
/** Voice (or a real video's own sound) ducks the music to 30 %. */
export const DUCK_RATIO = 0.3;

export function memoryDuration(memory: BundleMemory): number {
  const scenes = memory.scenes.reduce((sum, s) => sum + Math.max(0, s.durationMs), 0);
  const voice =
    memory.voiceUrl && memory.voiceDurationMs
      ? VOICE_START_MS + memory.voiceDurationMs + VOICE_TAIL_MS
      : 0;
  return Math.max(scenes, voice);
}

/** Index of the scene showing at `elapsedMs`; the last scene holds until the end. */
export function sceneIndexAt(memory: BundleMemory, elapsedMs: number): number {
  let end = 0;
  for (let i = 0; i < memory.scenes.length; i++) {
    end += Math.max(0, memory.scenes[i]?.durationMs ?? 0);
    if (elapsedMs < end) return i;
  }
  return Math.max(0, memory.scenes.length - 1);
}

export function musicVolume(ducked: boolean): number {
  return ducked ? MUSIC_VOLUME * DUCK_RATIO : MUSIC_VOLUME;
}
