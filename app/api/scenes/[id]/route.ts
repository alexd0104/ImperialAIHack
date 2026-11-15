import "server-only";
import { getEntity, updateEntity } from "@/app/api/stories/_store";
import { UpdateSceneRequest } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";

// Saves how one photo should move (v2, P7). It is read by the next generation / "Try again";
// the prompt compiler still vets any custom text there (AGENTS.md §3.1).
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await parseJson(request, UpdateSceneRequest);
    if (!body.success) return fail("validation_failed", body.message);
    const scene = await getEntity("scenes", (await context.params).id);
    if (!scene) return fail("not_found", copy.studio.generation.sceneNotFound);
    const { motion, soundMode } = body.data;
    const fields = {
      ...(motion && {
        // Gentle never carries free text.
        motion:
          motion.preset === "gentle"
            ? { preset: motion.preset, durationSec: motion.durationSec }
            : motion,
      }),
      ...(soundMode && { soundMode }),
    };
    const updated = await updateEntity("scenes", scene.id, fields);
    return updated ? ok(updated) : fail("not_found", copy.studio.generation.sceneNotFound);
  } catch {
    return fail("internal", copy.studio.generation.error);
  }
}
