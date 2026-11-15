import "server-only";
import { randomBytes } from "node:crypto";
import { getEntity, insertEntity, updateEntity } from "@/app/api/stories/_store";
import { CreateMemoryRequest, Memory } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const words = copy.studio.memory;
  const input = await parseJson(request, CreateMemoryRequest);
  if (!input.success) return fail("validation_failed", words.invalidTitle, 422);
  try {
    const story = await getEntity("stories", (await context.params).id);
    if (!story) return fail("not_found", words.missingStory);
    const memory = Memory.parse({
      id: randomBytes(12).toString("hex"),
      houseId: story.houseId,
      storyId: story.id,
      title: input.data.title,
      status: "draft",
      createdAt: new Date().toISOString(),
    });
    await insertEntity("memories", memory);
    await updateEntity("stories", story.id, { memoryOrder: [...story.memoryOrder, memory.id] });
    return ok(memory, 201);
  } catch {
    return fail("internal", words.error);
  }
}
