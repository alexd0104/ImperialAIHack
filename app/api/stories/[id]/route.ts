import "server-only";
import { getEntity, listEntities, updateEntity } from "@/app/api/stories/_store";
import { UpdateStoryRequest } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const story = await getEntity("stories", (await context.params).id);
    return story ? ok(story) : fail("not_found", copy.studio.createStory.error);
  } catch {
    return fail("internal", copy.studio.createStory.error);
  }
}

// Studio Place screen: rename, reorder Memories, move to another free Slot (before publishing).
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await parseJson(request, UpdateStoryRequest);
    if (!body.success) return fail("validation_failed", body.message);
    const story = await getEntity("stories", (await context.params).id);
    if (!story) return fail("not_found", copy.studio.createStory.error);
    const { title, memoryOrder, slotId } = body.data;
    if (memoryOrder) {
      const own = (await listEntities("memories", (item) => item.storyId === story.id)).map(
        (m) => m.id,
      );
      const same =
        memoryOrder.length === own.length &&
        new Set(memoryOrder).size === own.length &&
        memoryOrder.every((id) => own.includes(id));
      if (!same) return fail("validation_failed", copy.studio.place.badOrder);
    }
    if (slotId && slotId !== story.slotId) {
      const room = await getEntity("rooms", story.roomId);
      const slot = room?.slots.find((candidate) => candidate.id === slotId);
      if (!room || !slot) return fail("validation_failed", copy.studio.place.badSlot);
      if (slot.storyId && slot.storyId !== story.id)
        return fail("conflict", copy.studio.createStory.noSlot);
    }
    const updated = await updateEntity("stories", story.id, {
      ...(title ? { title } : {}),
      ...(memoryOrder ? { memoryOrder } : {}),
      ...(slotId ? { slotId } : {}),
    });
    return updated ? ok(updated) : fail("not_found", copy.studio.createStory.error);
  } catch {
    return fail("internal", copy.studio.place.error);
  }
}
