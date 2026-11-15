import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream, type ReadStream } from "node:fs";
import { mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

// Local disk storage under STORAGE_DIR (TECHNICAL.md §6). Every stored path is relative,
// `<houseId>/<...>`, so a House can be deleted by removing its folder and DB documents
// never hold machine-specific absolute paths.

export class StoragePathError extends Error {}

const SEGMENT = /^[A-Za-z0-9._-]+$/;

export function storageRoot(): string {
  return path.resolve(process.env.STORAGE_DIR || "./storage");
}

/**
 * Splits and checks a relative storage path. Rejects absolute paths, `..`/`.`, empty
 * segments, backslashes and anything outside a conservative character set, so URL
 * decoding tricks (`%2e%2e`, `%5c`, NUL) cannot escape STORAGE_DIR.
 */
export function storageSegments(relPath: string | string[]): string[] {
  const segments = Array.isArray(relPath) ? relPath : relPath.split("/");
  if (segments.length === 0) throw new StoragePathError("Empty path");
  for (const segment of segments) {
    // `.tmp` is reserved for in-progress writes of saveFile: never addressable.
    if (!SEGMENT.test(segment) || segment === "." || segment === ".." || segment.endsWith(".tmp")) {
      throw new StoragePathError("Invalid path segment");
    }
  }
  return segments;
}

/** Absolute path inside STORAGE_DIR; throws StoragePathError on anything unsafe. */
export function resolveStoragePath(relPath: string | string[]): string {
  const root = storageRoot();
  const absolute = path.resolve(root, ...storageSegments(relPath));
  // Belt and braces after the segment check.
  if (!absolute.startsWith(root + path.sep)) throw new StoragePathError("Path escapes storage");
  return absolute;
}

export type SavedFile = { path: string; bytes: number; sha256: string };

/**
 * Saves `data` at `<houseId>/<name>` (name may contain `/`). Written to a temp file then
 * renamed, so a crash never leaves a half-written file at the final path.
 */
export async function saveFile(
  houseId: string,
  name: string,
  data: Uint8Array | ReadableStream<Uint8Array>,
): Promise<SavedFile> {
  const relPath = [...storageSegments(houseId), ...storageSegments(name)].join("/");
  const absolute = resolveStoragePath(relPath);
  await mkdir(path.dirname(absolute), { recursive: true });

  const hash = createHash("sha256");
  let bytes = 0;
  // Streamed chunk by chunk so a large video is never held in memory whole.
  const source =
    data instanceof Uint8Array
      ? Readable.from([data])
      : Readable.fromWeb(data as NodeReadableStream<Uint8Array>);
  const temp = `${absolute}.${randomUUID()}.tmp`;
  try {
    await pipeline(
      source,
      new Transform({
        transform(chunk: Buffer, _encoding, done) {
          hash.update(chunk);
          bytes += chunk.byteLength;
          done(null, chunk);
        },
      }),
      createWriteStream(temp),
    );
    await rename(temp, absolute);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
  return { path: relPath, bytes, sha256: hash.digest("hex") };
}

export async function sha256File(relPath: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(resolveStoragePath(relPath))) hash.update(chunk);
  return hash.digest("hex");
}

/** Size of a stored regular file, or null if missing (or not a file). */
export async function statFile(relPath: string | string[]): Promise<{ bytes: number } | null> {
  try {
    const info = await stat(resolveStoragePath(relPath));
    return info.isFile() ? { bytes: info.size } : null;
  } catch (error) {
    if (error instanceof StoragePathError) throw error;
    return null;
  }
}

/** `end` is inclusive, as in HTTP Range. */
export function openReadStream(
  relPath: string | string[],
  range?: { start: number; end: number },
): ReadStream {
  return createReadStream(resolveStoragePath(relPath), range);
}

/** GDPR cascade, storage half (DB half: `deleteHouseDocuments`). */
export async function deleteHouseFolder(houseId: string): Promise<void> {
  await rm(resolveStoragePath(houseId), { recursive: true, force: true });
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".ogg": "audio/ogg",
  ".glb": "model/gltf-binary",
  ".json": "application/json",
};

export function contentTypeFor(relPath: string): string {
  return CONTENT_TYPES[path.extname(relPath).toLowerCase()] ?? "application/octet-stream";
}
