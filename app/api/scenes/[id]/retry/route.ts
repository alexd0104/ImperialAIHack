import "server-only";
import { RetryRequest, RetryResponse } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { db } from "@/lib/db";
import { fail, ok, parseJson } from "@/lib/http";
import { jobConfig, soundModeDefault } from "@/lib/jobs/config";
import { mongoGenerationStore, retryLimiter, retryScene } from "@/lib/jobs/generation";

const words = copy.studio.generation;

/** "Try again": a new scene job that bypasses the generation cache. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = await parseJson(request, RetryRequest);
  if (!input.success) return fail("validation_failed", input.message);
  try {
    const sceneId = (await context.params).id;
    const scene = await db.scenes.findById(sceneId);
    if (!scene) return fail("not_found", words.sceneNotFound);
    if (!retryLimiter.take(scene.houseId, Date.now()))
      return fail("rate_limited", words.tooManyRetries);
    const result = await retryScene(mongoGenerationStore, sceneId, {
      falKeyLabel: jobConfig().falKeyLabel,
      soundModeDefault: soundModeDefault(),
      now: new Date().toISOString(),
    });
    if (result.ok) return ok(RetryResponse.parse(result.data), 202);
    if (result.code === "not_found") return fail("not_found", words.sceneNotFound);
    if (result.code === "conflict") return fail("conflict", words.published);
    return fail("validation_failed", words.needsAnswers);
  } catch (error) {
    console.error(`[retry] ${error instanceof Error ? error.message : String(error)}`);
    return fail("internal", words.error);
  }
}
