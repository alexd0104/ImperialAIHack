import "server-only";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, prune, textureCompress, weld } from "@gltf-transform/functions";
import sharp from "sharp";

/** TECHNICAL.md §7.1: a GLB above this is heavy for the tablet. */
export const GLB_TARGET_BYTES = 3 * 1024 * 1024;

/**
 * Same intent as `gltf-transform optimize --texture-compress webp`, in process:
 * merge duplicates, drop unused data, weld vertices, textures to ≤ 1024 px WebP
 * (three's GLTFLoader reads EXT_texture_webp). Throws on a file it cannot read;
 * the compress step then keeps the raw GLB.
 */
export async function compressGlb(input: Uint8Array): Promise<Uint8Array> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const document = await io.readBinary(input);
  await document.transform(
    dedup(),
    prune(),
    weld(),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024] }),
  );
  return io.writeBinary(document);
}
