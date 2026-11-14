import "server-only";
import { getEntity, updateEntity } from "@/app/api/stories/_store";
import { SceneChoiceRequest } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";

// Records the family's choice for one scene. A scene still being made cannot be approved;
// an animated choice needs a clip (otherwise the original photo stays, rule: House never looks broken).
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await parseJson(request, SceneChoiceRequest);
    if (!body.success) return fail("validation_failed", body.message);
    const scene = await getEntity("scenes", (await context.params).id);
    if (!scene) return fail("not_found", copy.studio.approve.missing);
    if (scene.status !== "done" && scene.status !== "fallback")
      return fail("conflict", copy.studio.approve.notReady);
    if (body.data.use === "animated" && !scene.outputs.clip)
      return fail("validation_failed", copy.studio.approve.noClip);
    const updated = await updateEntity("scenes", scene.id, {
      choice: { ...body.data, chosenAt: new Date().toISOString() },
    });
    return updated ? ok(updated) : fail("not_found", copy.studio.approve.missing);
  } catch {
    return fail("internal", copy.studio.approve.error);
  }
}
