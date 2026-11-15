import { ASSET_LIMITS } from "@/lib/contracts";
import { copy } from "@/lib/copy";

export async function resizeObjectPhoto(file: File): Promise<Blob> {
  if (!file.size || file.size > ASSET_LIMITS.photo.maxBytes)
    throw new Error(copy.studio.createStory.fileSize);
  if (!["image/jpeg", "image/png"].includes(file.type))
    throw new Error(copy.studio.createStory.fileType);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(copy.studio.createStory.fileType);
  }
  try {
    const ratio = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error(copy.studio.createStory.fileType);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error(copy.studio.createStory.fileType))),
        "image/jpeg",
        0.88,
      ),
    );
  } finally {
    bitmap.close();
  }
}
