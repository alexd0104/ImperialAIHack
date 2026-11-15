import { HouseEventRequest } from "@/lib/contracts";
import { db, findHouseByToken } from "@/lib/db";
import { DEMO_DB_TIMEOUT_MS, isDemoToken, orNullWithin } from "@/lib/house/load-bundle";
import { fail, ok, parseJson } from "@/lib/http";

// POST /api/h/:token/events → { ok: true } (TECHNICAL.md §4.3). Hearts and views go back
// to the family's "Hear back" page. Demo mode saves them when the DB answers (B33) and
// otherwise drops them: the demo House never shows a failure.
export async function POST(request: Request, ctx: RouteContext<"/api/h/[token]/events">) {
  const { token } = await ctx.params;
  const body = await parseJson(request, HouseEventRequest);
  if (!body.success) return fail("validation_failed", body.message);
  const save = async () => {
    const house = await findHouseByToken(token);
    if (!house) return null;
    await db.events.insert({
      houseId: house.id,
      memoryId: body.data.memoryId,
      type: body.data.type,
      at: new Date().toISOString(),
    });
    return true;
  };
  if (isDemoToken(token)) {
    await orNullWithin(save, DEMO_DB_TIMEOUT_MS);
    return ok({ ok: true });
  }

  try {
    if (!(await save())) return fail("not_found", "House not found");
    return ok({ ok: true });
  } catch {
    return fail("upstream_failed", "Event not saved");
  }
}
