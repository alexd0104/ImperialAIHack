import "server-only";

export interface JobConfig {
  /** How long one advance may hold a job (TECHNICAL.md §5.2 step 1). */
  leaseMs: number;
  /** Retries after the first attempt, then fallback (TECHNICAL.md §4.4). */
  maxRetries: number;
  /** Wait before retry n (index n-1); the last value repeats. */
  backoffMs: readonly number[];
  /** fal requests in flight at once (new accounts allow 2). */
  maxConcurrency: number;
  /** Live spend per FAL_KEY_LABEL above which fal calls switch to mock. */
  budgetUsd: number;
  falKeyLabel: string;
}

function numberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** Read lazily so CI and tests never need these variables at import time. */
export function jobConfig(): JobConfig {
  return {
    // Long enough to upload a clip to fal and download its result on a slow network: a
    // shorter lease let job polling steal the job mid-download, so the step never saved.
    // The lease is released as soon as an advance ends; this only delays crash recovery.
    leaseMs: 120_000,
    maxRetries: 2,
    backoffMs: [5_000, 15_000],
    maxConcurrency: Math.max(1, Math.floor(numberEnv("FAL_MAX_CONCURRENCY", 2))),
    budgetUsd: numberEnv("FAL_BUDGET_USD", 5),
    falKeyLabel: process.env.FAL_KEY_LABEL?.trim() || "dev",
  };
}
