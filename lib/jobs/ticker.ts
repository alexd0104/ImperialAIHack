import "server-only";
import { defaultEngineDeps } from "./defaults";
import { advanceJob } from "./engine";
import type { EngineDeps } from "./types";

export const TICK_MS = 5_000;
/** Jobs advanced per tick (TECHNICAL.md §5.2). */
export const JOBS_PER_TICK = 4;

declare global {
  var __mhTicker: { timer: ReturnType<typeof setInterval> } | undefined;
}

/** One tick: advance up to JOBS_PER_TICK free, non-final jobs. Never throws. */
export async function tick(deps?: EngineDeps): Promise<number> {
  try {
    const resolved = deps ?? defaultEngineDeps();
    const ids = await resolved.jobs.listAdvanceable(resolved.now().toISOString(), JOBS_PER_TICK);
    await Promise.all(
      ids.map((id) =>
        advanceJob(id, resolved).catch((error: unknown) => {
          console.error(`[jobs] advance ${id} failed: ${String(error)}`);
        }),
      ),
    );
    return ids.length;
  } catch (error) {
    // No DB (e.g. offline demo mode): stay quiet, polling still works when it is back.
    console.warn(`[jobs] tick skipped: ${error instanceof Error ? error.message : String(error)}`);
    return 0;
  }
}

/**
 * Started once per process from instrumentation.ts. The global guard survives dev
 * hot reloads, so jobs are never advanced by two tickers (TECHNICAL.md §10);
 * the DB lease covers anything else.
 */
export function startTicker(deps?: EngineDeps): boolean {
  if (globalThis.__mhTicker) return false;
  let busy = false;
  const timer = setInterval(() => {
    if (busy) return;
    busy = true;
    void tick(deps).finally(() => {
      busy = false;
    });
  }, TICK_MS);
  // Never keep a script or test process alive just for the ticker.
  timer.unref?.();
  globalThis.__mhTicker = { timer };
  return true;
}

export function stopTicker(): void {
  if (globalThis.__mhTicker) clearInterval(globalThis.__mhTicker.timer);
  globalThis.__mhTicker = undefined;
}
