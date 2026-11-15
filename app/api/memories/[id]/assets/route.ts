import "server-only";
import { randomBytes } from "node:crypto";
import { getEntity, insertEntity } from "@/app/api/stories/_store";
import { ASSET_LIMITS, Asset, AssetView, UploadAssetFields } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok } from "@/lib/http";
import { saveFile } from "@/lib/storage";

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/heif": "heif",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/webm": "webm",
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const words = copy.studio.memory;
  try {
    const memory = await getEntity("memories", (await context.params).id);
    if (!memory) return fail("not_found", words.missing);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      // An unreadable form is almost always a body cut at the size limit, not a wrong type.
      return fail("file_too_large", words.fileSize, 413);
    }
    const fields = UploadAssetFields.safeParse({ kind: form.get("kind") });
    const file = form.get("file");
    if (!fields.success || !(file instanceof File) || file.size === 0)
      return fail("validation_failed", words.fileType, 422);
    const limit = ASSET_LIMITS[fields.data.kind];
    // Browsers add codec parameters (audio/webm;codecs=opus); the base type decides.
    const mime = file.type.split(";")[0]?.trim().toLowerCase() ?? "";
    if (!limit.mimes.includes(mime)) return fail("unsupported_type", words.fileType);
    if (file.size > limit.maxBytes) return fail("file_too_large", words.fileSize);
    const id = randomBytes(12).toString("hex");
    const saved = await saveFile(
      memory.houseId,
      `memories/${memory.id}/${id}.${extensions[mime] ?? "bin"}`,
      new Uint8Array(await file.arrayBuffer()),
    );
    const asset = Asset.parse({
      ...saved,
      id,
      houseId: memory.houseId,
      memoryId: memory.id,
      kind: fields.data.kind,
      mime,
      createdAt: new Date().toISOString(),
    });
    await insertEntity("assets", asset);
    return ok(AssetView.parse({ ...asset, url: `/api/files/${saved.path}` }), 201);
  } catch {
    return fail("internal", words.error);
  }
}
