import "server-only";
import type { FalGateway } from "@/lib/ai/fal";
import type { AiMode } from "@/lib/ai/mode";
import type { FalModelKey } from "@/lib/ai/models";
import type { GenerationCacheEntry, Job, JobStep, StepName } from "@/lib/contracts";
import type { JobConfig } from "./config";

/**
 * Job persistence. The lease value (`lockedUntil` ISO string) doubles as a token:
 * writes only land while the caller still holds that exact lease.
 */
export interface JobRepo {
  get(id: string): Promise<Job | null>;
  /** Atomically sets `lockedUntil = until` if the job is free at `now`; returns it (with the new lease) or null. */
  acquireLease(id: string, now: string, until: string): Promise<Job | null>;
  /** Writes steps/current/status/updatedAt; false if the lease was lost. */
  save(job: Job, lease: string): Promise<boolean>;
  /** Ends the lease. `notBefore` keeps the job locked until then (retry backoff). */
  release(id: string, lease: string, notBefore: string | null): Promise<void>;
  /** fal requests in flight across all jobs. */
  countRunningFal(): Promise<number>;
  /** Live spend recorded on steps for this key label. */
  spentUsd(falKeyLabel: string): Promise<number>;
  /** Non-final jobs that are free to advance at `now`, oldest first. */
  listAdvanceable(now: string, limit: number): Promise<string[]>;
}

export interface CacheRepo {
  get(key: string): Promise<GenerationCacheEntry | null>;
  /** Upsert by key ("Try again" overwrites the previous output). */
  put(entry: Omit<GenerationCacheEntry, "id">): Promise<void>;
}

export interface StepContext {
  job: Job;
  step: JobStep;
  /** Outputs of earlier steps that produced a file, by step name. */
  outputs: Partial<Record<StepName, string>>;
}

export interface LocalStepResult {
  output?: string;
  previewUrl?: string;
  /** True when the step decided it has nothing to do. */
  skipped?: boolean;
}

/** What a fal step wants to call; the engine handles cache, budget, upload and polling. */
export interface FalPlan {
  model: FalModelKey;
  /** Model params without the input URL (prompts included: they are part of the cache key). */
  params: Record<string, unknown>;
  /** Seconds of output, for the cost estimate of per-second models (animate). */
  seconds?: number;
  /** The file sent to the model; uploaded to the fal CDN only on a cache miss. */
  input?: {
    field: string;
    /** The model takes a list of URLs in `field` (Rodin `image_urls`). */
    list?: boolean;
    sha256: string;
    /** A still-valid fal CDN URL for this file (from the upload step), to skip re-uploading. */
    url?: string;
    read(): Promise<Blob>;
  };
}

export type StepHandler =
  | { kind: "local"; run(ctx: StepContext): Promise<LocalStepResult> }
  | { kind: "fal"; plan(ctx: StepContext): Promise<FalPlan | { skip: true }> };

export type StepHandlers = Partial<Record<StepName, StepHandler>>;

export interface EngineDeps {
  jobs: JobRepo;
  cache: CacheRepo;
  /** Gateway for a mode; without argument, the configured AI_MODE. */
  fal(mode?: AiMode): FalGateway;
  handlers: StepHandlers;
  /** Copies a model output into storage and returns its storage path. */
  storeOutput(job: Job, step: JobStep, url: string, mime: string): Promise<string>;
  /** Called once when a job reaches a final status (writes scene outputs/status, etc.). */
  settle(job: Job): Promise<void>;
  now(): Date;
  config: JobConfig;
}

export type AdvanceNotice = "budget_exceeded";

export interface AdvanceResult {
  job: Job | null;
  /** False when another advance held the lease, or the job is final or missing. */
  advanced: boolean;
  notice?: AdvanceNotice;
}
