import "server-only";
import { AiRequestError } from "@/lib/ai/errors";
import { extractOutput, isMockRequestId } from "@/lib/ai/fal";
import { estimateCostUsd, type FalModelKey, MODELS } from "@/lib/ai/models";
import { FINAL_JOB_STATUSES, type Job, type JobStatus, type StepName } from "@/lib/contracts";
import { cacheKey } from "./cache";
import type {
  AdvanceNotice,
  AdvanceResult,
  EngineDeps,
  FalPlan,
  StepContext,
  StepHandler,
} from "./types";

/** Steps one advance may run back to back (local steps and cache hits are instant). */
const MAX_STEPS_PER_ADVANCE = 12;

/**
 * Written on `step.error` of a step served by mock because the budget was spent:
 * the Job contract has no notice field, and the step is not failed.
 */
export const BUDGET_NOTICE: AdvanceNotice = "budget_exceeded";

export function isFinalStatus(status: JobStatus): boolean {
  return (FINAL_JOB_STATUSES as readonly JobStatus[]).includes(status);
}

/** `/api/files/...` URL of a storage path, for Studio previews. */
export function fileUrl(storagePath: string): string {
  return `/api/files/${storagePath}`;
}

type StepOutcome =
  /** Something changed and the next step may run now. */
  | { kind: "progressed" }
  /** Waiting on fal or on the concurrency cap: try again on the next tick. */
  | { kind: "waiting" }
  /** A retry is scheduled: keep the job locked until `notBefore`. */
  | { kind: "retry"; notBefore: string };

/**
 * TECHNICAL.md §5.2. Safe to call from any number of places at once (ticker,
 * job polling): only the holder of the lease changes the job. Never throws for
 * step failures; they become retries, then `fallback` (scene) or `failed`.
 */
export async function advanceJob(id: string, deps: EngineDeps): Promise<AdvanceResult> {
  const now = deps.now();
  const lease = new Date(now.getTime() + deps.config.leaseMs).toISOString();
  const leased = await deps.jobs.acquireLease(id, now.toISOString(), lease);
  if (!leased) return { job: await deps.jobs.get(id), advanced: false };
  if (isFinalStatus(leased.status)) {
    await deps.jobs.release(id, lease, null);
    return { job: { ...leased, lockedUntil: null }, advanced: false };
  }

  const job: Job = structuredClone({ ...leased, lockedUntil: lease });
  const state: { notice?: AdvanceNotice } = {};
  let notBefore: string | null = null;
  try {
    if (job.status === "queued") job.status = "running";
    for (let i = 0; i < MAX_STEPS_PER_ADVANCE && !isFinalStatus(job.status); i++) {
      const outcome = await advanceStep(job, deps, now, state);
      job.updatedAt = deps.now().toISOString();
      if (!(await deps.jobs.save(job, lease))) break;
      if (outcome.kind === "retry") notBefore = outcome.notBefore;
      if (outcome.kind !== "progressed") break;
    }
    if (isFinalStatus(job.status)) {
      try {
        await deps.settle(job);
      } catch (error) {
        // The job result is already saved; a settle failure must not undo it.
        console.error(`[jobs] settle failed for ${id}: ${errorMessage(error)}`);
      }
    }
  } finally {
    await deps.jobs.release(id, lease, notBefore);
  }
  return { job: { ...job, lockedUntil: notBefore }, advanced: true, notice: state.notice };
}

async function advanceStep(
  job: Job,
  deps: EngineDeps,
  now: Date,
  state: { notice?: AdvanceNotice },
): Promise<StepOutcome> {
  while (job.current < job.steps.length && isSettledStep(job, job.current)) job.current++;
  if (job.current >= job.steps.length) {
    job.status = "done";
    return { kind: "progressed" };
  }

  const step = job.steps[job.current];
  const ctx: StepContext = { job, step, outputs: collectOutputs(job) };
  const handler: StepHandler | undefined = deps.handlers[step.name];
  try {
    if (!handler) {
      throw new AiRequestError("not_configured", `No handler for step ${step.name}`, false);
    }
    if (handler.kind === "local") {
      step.status = "running";
      step.attempts++;
      const result = await handler.run(ctx);
      step.status = result.skipped ? "skipped" : "done";
      step.output = result.output;
      step.previewUrl = result.previewUrl ?? (result.output ? fileUrl(result.output) : undefined);
      step.error = undefined;
      job.current++;
      return { kind: "progressed" };
    }
    return step.falRequestId
      ? await pollFalStep(ctx, handler, deps)
      : await submitFalStep(ctx, handler, deps, state);
  } catch (error) {
    return failStep(job, error, deps, now);
  }
}

function isSettledStep(job: Job, index: number): boolean {
  const { status } = job.steps[index];
  return status === "done" || status === "skipped";
}

function collectOutputs(job: Job): Partial<Record<StepName, string>> {
  const outputs: Partial<Record<StepName, string>> = {};
  for (const step of job.steps) {
    if (step.status === "done" && step.output) outputs[step.name] = step.output;
  }
  return outputs;
}

function planCacheKey(plan: FalPlan): string {
  return cacheKey(MODELS[plan.model].id, plan.params, plan.input?.sha256);
}

async function submitFalStep(
  ctx: StepContext,
  handler: Extract<StepHandler, { kind: "fal" }>,
  deps: EngineDeps,
  state: { notice?: AdvanceNotice },
): Promise<StepOutcome> {
  const { job, step } = ctx;
  const plan = await handler.plan(ctx);
  if ("skip" in plan) {
    step.status = "skipped";
    job.current++;
    return { kind: "progressed" };
  }

  const key = planCacheKey(plan);
  if (!job.bypassCache) {
    const hit = await deps.cache.get(key);
    if (hit) {
      Object.assign(step, {
        status: "done",
        model: hit.model,
        output: hit.outputPath,
        previewUrl: fileUrl(hit.outputPath),
        costUsd: 0,
        cacheHit: true,
        error: undefined,
      });
      job.current++;
      return { kind: "progressed" };
    }
  }

  if ((await deps.jobs.countRunningFal()) >= deps.config.maxConcurrency) return { kind: "waiting" };

  let gateway = deps.fal();
  if (gateway.mode === "live") {
    const spent = await deps.jobs.spentUsd(job.falKeyLabel);
    if (spent >= deps.config.budgetUsd) {
      gateway = deps.fal("mock");
      state.notice = BUDGET_NOTICE;
      console.warn(`[jobs] fal budget reached for ${job.falKeyLabel}: using mock outputs`);
    }
  }

  step.attempts++;
  const input = { ...plan.params };
  if (plan.input) {
    const url = plan.input.url ?? (await gateway.upload(await plan.input.read()));
    input[plan.input.field] = plan.input.list ? [url] : url;
  }
  step.falRequestId = await gateway.submit(plan.model, input);
  step.status = "running";
  step.model = MODELS[plan.model].id;
  step.cacheHit = false;
  // Counted at submit so concurrent jobs cannot overshoot the budget; mock spends nothing.
  step.costUsd =
    gateway.mode === "live" ? estimateCostUsd(plan.model, { seconds: plan.seconds }) : 0;
  step.error = state.notice;
  return { kind: "progressed" };
}

async function pollFalStep(
  ctx: StepContext,
  handler: Extract<StepHandler, { kind: "fal" }>,
  deps: EngineDeps,
): Promise<StepOutcome> {
  const { job, step } = ctx;
  const requestId = step.falRequestId as string;
  const model = modelKeyOf(step.model);
  const gateway = isMockRequestId(requestId) ? deps.fal("mock") : deps.fal();
  if ((await gateway.status(model, requestId)) !== "COMPLETED") return { kind: "waiting" };

  const result = await gateway.result(model, requestId);
  const { url, mime } = extractOutput(model, result.data);
  const output = await deps.storeOutput(job, step, url, mime);
  // Keep the budget notice visible to the Studio; drop errors of earlier attempts.
  const error = step.error === BUDGET_NOTICE ? BUDGET_NOTICE : undefined;
  Object.assign(step, { status: "done", output, previewUrl: fileUrl(output), error });

  // Re-plan to get the same cache key as at submit (plans are deterministic).
  const plan = await handler.plan(ctx);
  if (!("skip" in plan) && gateway.mode === "live") {
    await deps.cache.put({
      key: planCacheKey(plan),
      model: MODELS[plan.model].id,
      outputPath: output,
      costUsd: step.costUsd ?? 0,
      createdAt: deps.now().toISOString(),
    });
  }
  job.current++;
  return { kind: "progressed" };
}

function modelKeyOf(modelId: string | undefined): FalModelKey {
  const key = (Object.keys(MODELS) as FalModelKey[]).find((k) => MODELS[k].id === modelId);
  if (!key) throw new AiRequestError("unknown_request", `Unknown model ${modelId}`, false);
  return key;
}

function failStep(job: Job, error: unknown, deps: EngineDeps, now: Date): StepOutcome {
  const step = job.steps[job.current];
  const retryable = !(error instanceof AiRequestError) || error.retryable;
  step.error = errorMessage(error).slice(0, 300);
  step.falRequestId = undefined;
  // Attempts are counted when work starts, so a failure before that still uses one.
  if (step.attempts === 0) step.attempts = 1;

  if (retryable && step.attempts <= deps.config.maxRetries) {
    step.status = "pending";
    const { backoffMs } = deps.config;
    const wait = backoffMs[Math.min(step.attempts - 1, backoffMs.length - 1)] ?? 0;
    console.warn(`[jobs] ${job.id} ${step.name} attempt ${step.attempts} failed: ${step.error}`);
    return { kind: "retry", notBefore: new Date(now.getTime() + wait).toISOString() };
  }

  step.status = "failed";
  for (const later of job.steps.slice(job.current + 1)) {
    if (later.status === "pending") later.status = "skipped";
  }
  // Scenes fall back to the original photo; objects and rooms to library/default style.
  job.status = job.type === "scene" ? "fallback" : "failed";
  console.warn(`[jobs] ${job.id} ${step.name} gave up → ${job.status}: ${step.error}`);
  return { kind: "progressed" };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
