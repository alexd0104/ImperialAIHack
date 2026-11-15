import "server-only";
import { IdParams, LinkResponse } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok } from "@/lib/http";
import { findHouse } from "../../_house-ops";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = IdParams.safeParse(await context.params);
  if (!params.success) return fail("validation_failed", copy.studio.care.invalid, 422);
  try {
    const house = await findHouse(params.data.id);
    if (!house?.token || house.tokenRevoked)
      return fail("not_found", copy.studio.care.missingHouse);
    // Built from the request origin so the link works on whichever host the family uses.
    const url = `${new URL(request.url).origin}/house/${encodeURIComponent(house.token)}`;
    return ok(LinkResponse.parse({ url, aloneUrl: `${url}?mode=alone` }));
  } catch {
    return fail("internal", copy.studio.hearBack.loadError);
  }
}
