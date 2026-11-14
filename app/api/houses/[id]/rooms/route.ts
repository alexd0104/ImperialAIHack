import "server-only";
import { CreateRoomRequest, IdParams } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";
import { createRoom, creationId, findHouse } from "../../_store";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = IdParams.safeParse(await context.params);
  const input = await parseJson(request, CreateRoomRequest);
  const id = creationId(request);
  if (!params.success || !input.success || !id)
    return fail("validation_failed", copy.studio.createHouse.invalidRoom, 422);
  if (input.data.source !== "style")
    return fail("unsupported_type", copy.studio.createHouse.styleOnly, 422);
  try {
    if (!(await findHouse(params.data.id)))
      return fail("not_found", copy.studio.createHouse.missingHouse);
    const room = await createRoom(id, params.data.id, input.data);
    if (
      room.houseId !== params.data.id ||
      room.style !== input.data.style ||
      room.name !== input.data.name
    ) {
      return fail("conflict", copy.studio.createHouse.conflict);
    }
    return ok(room, 201);
  } catch {
    return fail("internal", copy.studio.createHouse.saveError);
  }
}
