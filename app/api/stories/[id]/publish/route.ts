import "server-only";
import { getEntity, listEntities, updateEntity } from "@/app/api/stories/_store";
import { PublishStoryRequest } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";

// Publishing is refused unless every scene of every Memory in the Story has a choice.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await parseJson(request, PublishStoryRequest);
    if (!body.success) return fail("validation_failed", body.message);
    const story = await getEntity("stories", (await context.params).id);
    if (!story) return fail("not_found", copy.studio.place.missing);
    const all = await listEntities("memories", (item) => item.storyId === story.id);
    const memories = [];
    for (const memory of all) {
      const scenes = await listEntities("scenes", (item) => item.memoryId === memory.id);
      // A Memory started then left with no photo stays a draft: it must not block the others
      // (adding to an existing Story, B19). The House never shows a draft anyway.
      if (scenes.length === 0 && memory.status === "draft") continue;
      if (scenes.length === 0 || scenes.some((scene) => !scene.choice))
        return fail("conflict", copy.studio.place.notApproved);
      memories.push(memory);
    }
    if (memories.length === 0) return fail("conflict", copy.studio.place.noMemories);
    const room = await getEntity("rooms", story.roomId);
    const slot = room?.slots.find((candidate) => candidate.id === story.slotId);
    if (!room || !slot) return fail("conflict", copy.studio.place.badSlot);
    if (slot.storyId && slot.storyId !== story.id)
      return fail("conflict", copy.studio.createStory.noSlot);
    const publishedAt = story.publishedAt ?? new Date().toISOString();
    // Publishing reserves the Slot (an Object never moves once it is in the House).
    await updateEntity("rooms", room.id, {
      slots: room.slots.map((s) => (s.id === slot.id ? { ...s, storyId: story.id } : s)),
    });
    await Promise.all(
      memories.map((memory) => updateEntity("memories", memory.id, { status: "published" })),
    );
    const updated = await updateEntity("stories", story.id, { publishedAt });
    return updated ? ok(updated) : fail("not_found", copy.studio.place.missing);
  } catch {
    return fail("internal", copy.studio.place.error);
  }
}
