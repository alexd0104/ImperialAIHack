import "server-only";
import { deleteRoom, updateRoom } from "@/app/api/houses/_room-ops";
import { getEntity } from "@/app/api/stories/_store";
import { IdParams, UpdateRoomRequest } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const room = await getEntity("rooms", (await context.params).id);
    return room ? ok(room) : fail("not_found", copy.studio.createStory.missingRoom);
  } catch {
    return fail("internal", copy.studio.createStory.error);
  }
}

export async function PATCH(request: Request, context: Context) {
  const params = IdParams.safeParse(await context.params);
  const input = await parseJson(request, UpdateRoomRequest);
  if (!params.success || !input.success)
    return fail("validation_failed", copy.studio.rooms.invalid, 422);
  try {
    const room = await getEntity("rooms", params.data.id);
    if (!room) return fail("not_found", copy.studio.createStory.missingRoom);
    const next = await updateRoom(room, input.data);
    // Null only when the photo asset is missing: the Room is left untouched.
    return next ? ok(next) : fail("not_found", copy.studio.rooms.photoMissing);
  } catch {
    return fail("internal", copy.studio.rooms.error, 500, true);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const params = IdParams.safeParse(await context.params);
  if (!params.success) return fail("validation_failed", copy.studio.rooms.invalid, 422);
  try {
    const room = await getEntity("rooms", params.data.id);
    if (!room) return fail("not_found", copy.studio.createStory.missingRoom);
    await deleteRoom(room);
    return ok({ deleted: true });
  } catch {
    return fail("internal", copy.studio.rooms.error, 500, true);
  }
}
