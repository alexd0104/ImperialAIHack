import "server-only";
import { JobView } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok } from "@/lib/http";
import { advanceJob, defaultEngineDeps } from "@/lib/jobs";

const words = copy.studio.generation;

/** Polling advances the job (TECHNICAL.md §5.2), so it moves even without the ticker. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { job } = await advanceJob((await context.params).id, defaultEngineDeps());
    return job ? ok(JobView.parse(job)) : fail("not_found", words.jobNotFound);
  } catch (error) {
    console.error(`[jobs] ${error instanceof Error ? error.message : String(error)}`);
    return fail("internal", words.error);
  }
}
