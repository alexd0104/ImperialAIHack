import "server-only";
import { getEntity } from "@/app/api/stories/_store";
import { copy } from "@/lib/copy";
import { fail, ok } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const room = await getEntity("rooms", (await context.params).id);
    return room ? ok(room) : fail("not_found", copy.studio.createStory.missingRoom);
  } catch {
    return fail("internal", copy.studio.createStory.error);
  }
}
