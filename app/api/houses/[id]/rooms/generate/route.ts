import "server-only";
import { rm } from "node:fs/promises";
import { getEntity, insertEntity, updateEntity } from "@/app/api/stories/_store";
import { roomStyles } from "@/components/studio/room-styles";
import { closestRoomStyle, generateRoomPhoto } from "@/lib/ai/room-generate";
import { GenerateRoomRequest, IdParams, Room } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";
import { resolveStoragePath, saveFile } from "@/lib/storage";
import { creationId, findHouse } from "../../../_store";

/**
 * Room background from a description (B17). Generated in the request like photo Rooms
 * (`cleanRoomPhoto`); any failure gives the closest standard Room, so the House never breaks.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = IdParams.safeParse(await context.params);
  const input = await parseJson(request, GenerateRoomRequest);
  const id = creationId(request);
  if (!params.success || !input.success || !id)
    return fail("validation_failed", copy.studio.rooms.describeInvalid, 422);
  const houseId = params.data.id;
  const { name, description, roomId } = input.data;
  try {
    if (!(await findHouse(houseId))) return fail("not_found", copy.studio.createHouse.missingHouse);
    const existing = roomId ? await getEntity("rooms", roomId) : null;
    if (roomId && (!existing || existing.houseId !== houseId))
      return fail("not_found", copy.studio.rooms.invalid);

    const style = closestRoomStyle(description);
    let saved: { path: string } | null = null;
    try {
      const bytes = await generateRoomPhoto(description);
      saved = await saveFile(houseId, `rooms/${roomId ?? id}-${Date.now()}.jpg`, bytes);
    } catch (error) {
      console.warn(`[rooms/generate] standard Room instead: ${String(error)}`);
    }
    const fields = saved
      ? {
          source: "description" as const,
          style: undefined,
          backgroundPath: saved.path,
          background: { kind: "description" as const, text: description, path: saved.path },
        }
      : {
          source: "style" as const,
          style,
          backgroundPath: roomStyles[style].image,
          background: { kind: "style" as const, style },
        };

    if (existing) {
      const next = await updateEntity("rooms", existing.id, {
        ...fields,
        ...(name ? { name } : {}),
        pendingBackground: undefined,
      });
      if (!next) return fail("not_found", copy.studio.rooms.invalid);
      // The previous generated or cleaned picture is now unreachable.
      if (existing.source !== "style" && existing.backgroundPath !== next.backgroundPath)
        await rm(resolveStoragePath(existing.backgroundPath), { force: true });
      return ok(next);
    }
    const room = Room.parse({
      id,
      houseId,
      name,
      ...fields,
      // Objects start on the closest standard layout; the family moves them later.
      slots: roomStyles[style].slots,
      createdAt: new Date().toISOString(),
    });
    await insertEntity("rooms", room);
    return ok(room, 201);
  } catch {
    return fail("internal", copy.studio.rooms.error);
  }
}
