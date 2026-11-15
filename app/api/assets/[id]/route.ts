import "server-only";
import { rm } from "node:fs/promises";
import { deleteEntity, getEntity, replaceEntity } from "@/app/api/stories/_store";
import { copy } from "@/lib/copy";
import { fail, ok } from "@/lib/http";
import { resolveStoragePath } from "@/lib/storage";
import { buildSheet } from "../../memories/_sheet";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const words = copy.studio.memory;
  try {
    const asset = await getEntity("assets", (await context.params).id);
    if (!asset) return fail("not_found", words.missing);
    if (asset.memoryId) {
      // Never leave the sheet pointing at a file that is gone.
      const memory = await getEntity("memories", asset.memoryId);
      if (memory) {
        const answers = { ...memory.answers };
        if (answers.songAssetId === asset.id) answers.songAssetId = undefined;
        if (answers.voiceAssetId === asset.id) answers.voiceAssetId = undefined;
        const next = { ...memory, answers };
        await replaceEntity("memories", { ...next, sheet: memory.sheet && buildSheet(next) });
      }
    }
    await deleteEntity("assets", asset.id);
    await rm(resolveStoragePath(asset.path), { force: true });
    return ok({ deleted: true });
  } catch {
    return fail("internal", words.error);
  }
}
