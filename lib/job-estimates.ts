import type { StepName } from "@/lib/contracts";

// Rough average seconds per step, from measured live runs (update when re-measured).
// Only used to say "about N minutes"; never to decide anything.
export const STEP_SECONDS: Record<StepName, number> = {
  compile: 2,
  upload: 3,
  restore: 20,
  colourise: 20,
  animate: 90,
  ambience: 25,
  cutout: 10,
  model3d: 60,
  compress: 8,
  room_edit: 30,
  finalize: 3,
};

type StepLike = { name: StepName; status: string };

/** Seconds left: every step not done/skipped counts, so a running step is counted whole. */
export function estimateRemainingSeconds(steps: readonly StepLike[]): number {
  return steps
    .filter((s) => s.status !== "done" && s.status !== "skipped")
    .reduce((sum, s) => sum + STEP_SECONDS[s.name], 0);
}

/** Minutes rounded up, at least 1; null when nothing is left. */
export function estimateMinutes(steps: readonly StepLike[]): number | null {
  const seconds = estimateRemainingSeconds(steps);
  return seconds === 0 ? null : Math.max(1, Math.ceil(seconds / 60));
}
