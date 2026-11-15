import "server-only";
import { IdParams } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok } from "@/lib/http";
import { findHouse, houseFeedback } from "../../_house-ops";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const params = IdParams.safeParse(await context.params);
  if (!params.success) return fail("validation_failed", copy.studio.care.invalid, 422);
  try {
    if (!(await findHouse(params.data.id))) return fail("not_found", copy.studio.care.missingHouse);
    return ok(await houseFeedback(params.data.id));
  } catch {
    return fail("internal", copy.studio.hearBack.loadError);
  }
}
