import "server-only";
import { getEntity } from "@/app/api/stories/_store";
import { copy } from "@/lib/copy";
import { fail, ok } from "@/lib/http";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const story = await getEntity("stories", (await context.params).id);
    return story ? ok(story) : fail("not_found", copy.studio.createStory.error);
  } catch {
    return fail("internal", copy.studio.createStory.error);
  }
}
