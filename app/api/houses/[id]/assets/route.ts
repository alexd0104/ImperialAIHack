import "server-only";
import { randomBytes } from "node:crypto";
import { getEntity, insertEntity } from "@/app/api/stories/_store";
import { ASSET_LIMITS, Asset, AssetView } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok } from "@/lib/http";
import { saveFile } from "@/lib/storage";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const words = copy.studio.createStory;
  try {
    const houseId = (await context.params).id;
    if (!(await getEntity("houses", houseId))) return fail("not_found", words.missingRoom);
    if (Number(request.headers.get("content-length") ?? 0) > ASSET_LIMITS.photo.maxBytes + 65536)
      return fail("file_too_large", words.fileSize);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return fail("validation_failed", words.fileType, 422);
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0 || file.type !== "image/jpeg")
      return fail("unsupported_type", words.fileType);
    if (file.size > ASSET_LIMITS.photo.maxBytes) return fail("file_too_large", words.fileSize);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255)
      return fail("unsupported_type", words.fileType);
    const id = randomBytes(12).toString("hex");
    const saved = await saveFile(houseId, `objects/${id}.jpg`, bytes);
    const asset = Asset.parse({
      ...saved,
      id,
      houseId,
      kind: "photo",
      mime: "image/jpeg",
      createdAt: new Date().toISOString(),
    });
    await insertEntity("assets", asset);
    return ok(AssetView.parse({ ...asset, url: `/api/files/${saved.path}` }), 201);
  } catch {
    return fail("internal", words.error);
  }
}
