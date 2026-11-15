import "server-only";
import { GenerateRequest, GenerateResponse } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";
import { jobConfig, soundModeDefault } from "@/lib/jobs/config";
import { mongoGenerationStore, startGeneration } from "@/lib/jobs/generation";

const words = copy.studio.generation;

/** One scene job per photo; the ticker and GET /api/jobs/:id advance them. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const input = await parseJson(request, GenerateRequest);
  if (!input.success) return fail("validation_failed", input.message);
  try {
    const result = await startGeneration(mongoGenerationStore, (await context.params).id, {
      falKeyLabel: jobConfig().falKeyLabel,
      soundModeDefault: soundModeDefault(),
      now: new Date().toISOString(),
    });
    if (result.ok) return ok(GenerateResponse.parse(result.data), 202);
    if (result.code === "not_found") return fail("not_found", words.notFound);
    if (result.code === "conflict") return fail("conflict", words.published);
    return fail("validation_failed", words.needsAnswers);
  } catch (error) {
    console.error(`[generate] ${error instanceof Error ? error.message : String(error)}`);
    return fail("internal", words.error);
  }
}
