import { HouseEventRequest } from "@/lib/contracts";
import { db, findHouseByToken } from "@/lib/db";
import { isDemoToken } from "@/lib/house/load-bundle";
import { fail, ok, parseJson } from "@/lib/http";

// POST /api/h/:token/events → { ok: true } (TECHNICAL.md §4.3). Hearts and views go back
// to the family's "Hear back" page. Demo mode has no DB: accepted and dropped.
export async function POST(request: Request, ctx: RouteContext<"/api/h/[token]/events">) {
  const { token } = await ctx.params;
  const body = await parseJson(request, HouseEventRequest);
  if (!body.success) return fail("validation_failed", body.message);
  if (isDemoToken(token)) return ok({ ok: true });

  try {
    const house = await findHouseByToken(token);
    if (!house) return fail("not_found", "House not found");
    await db.events.insert({
      houseId: house.id,
      memoryId: body.data.memoryId,
      type: body.data.type,
      at: new Date().toISOString(),
    });
    return ok({ ok: true });
  } catch {
    return fail("upstream_failed", "Event not saved");
  }
}
