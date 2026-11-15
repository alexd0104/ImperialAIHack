import { ASSET_LIMITS } from "@/lib/contracts";
import { copy } from "@/lib/copy";

/** What the photo pickers offer: any photo the device may be able to open (B32). */
export const PHOTO_ACCEPT = "image/*,.heic,.heif";

/**
 * The original may be large (a phone photo): it is shrunk to 2048 px and re-encoded as
 * JPEG on the device, so the upload stays far under the server limit.
 */
const MAX_ORIGINAL_BYTES = 4 * ASSET_LIMITS.photo.maxBytes;

function looksLikePhoto(file: File): boolean {
  // Some browsers give HEIC files an empty type; fall back to the extension.
  return file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
}

export async function resizeObjectPhoto(file: File): Promise<Blob> {
  if (!file.size || file.size > MAX_ORIGINAL_BYTES)
    throw new Error(copy.studio.createStory.fileSize);
  if (!looksLikePhoto(file)) throw new Error(copy.studio.createStory.fileType);
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
