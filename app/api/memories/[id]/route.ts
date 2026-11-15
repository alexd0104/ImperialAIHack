import "server-only";
import { getEntity, listEntities, replaceEntity } from "@/app/api/stories/_store";
import { type AssetView, MemoryDetail, type SceneView, UpdateMemoryRequest } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";
import { buildSheet } from "../_sheet";

const fileUrl = (path: string) => `/api/files/${path}`;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const words = copy.studio.memory;
  try {
    const memory = await getEntity("memories", (await context.params).id);
    if (!memory) return fail("not_found", words.missing);
    const assets = await listEntities("assets", (asset) => asset.memoryId === memory.id);
    // Storage paths and fal URLs never leave the server.
    const views: AssetView[] = assets.map(({ path, falUrl, falUrlExpiresAt, ...rest }) => ({
      ...rest,
      url: fileUrl(path),
    }));
    const scenes = (await listEntities("scenes", (scene) => scene.memoryId === memory.id)).map(
      (scene): SceneView => ({
        ...scene,
        originalUrl: views.find((asset) => asset.id === scene.assetId)?.url,
        urls: Object.fromEntries(
          Object.entries(scene.outputs).map(([key, path]) => [key, fileUrl(path)]),
        ),
      }),
    );
    return ok(MemoryDetail.parse({ ...memory, assets: views, scenes }));
  } catch {
    return fail("internal", words.error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const words = copy.studio.memory;
  const input = await parseJson(request, UpdateMemoryRequest);
  if (!input.success) return fail("validation_failed", words.invalid, 422);
  try {
    const memory = await getEntity("memories", (await context.params).id);
    if (!memory) return fail("not_found", words.missing);
    const { answers, freeText, okAlone, title } = input.data;
    // Merge field by field so saving one answer never erases the others.
    const next = {
      ...memory,
      title: title ?? memory.title,
      answers: { ...memory.answers, ...answers },
      freeText: freeText === undefined ? memory.freeText : freeText.trim() || undefined,
      okAlone: okAlone ?? memory.okAlone,
      updatedAt: new Date().toISOString(),
    };
    const saved = { ...next, sheet: buildSheet(next) };
    await replaceEntity("memories", saved);
    return ok(saved);
  } catch {
    return fail("internal", words.error);
  }
}
