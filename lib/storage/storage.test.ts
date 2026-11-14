import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  contentTypeFor,
  deleteHouseFolder,
  resolveStoragePath,
  StoragePathError,
  saveFile,
  sha256File,
  statFile,
} from "./index";
import { parseRange } from "./range";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "mh-storage-"));
  vi.stubEnv("STORAGE_DIR", dir);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("storage", () => {
  it("saves under <houseId>/ with size and sha256, from bytes or a stream", async () => {
    const bytes = new TextEncoder().encode("hello memorai");
    const expected = createHash("sha256").update(bytes).digest("hex");

    const saved = await saveFile("h1", "photos/a.jpg", bytes);
    expect(saved).toEqual({ path: "h1/photos/a.jpg", bytes: bytes.length, sha256: expected });
    expect(await readFile(path.join(dir, "h1/photos/a.jpg"), "utf8")).toBe("hello memorai");
    expect(await sha256File(saved.path)).toBe(expected);

    const streamed = await saveFile("h1", "b.jpg", new Blob([bytes]).stream());
    expect(streamed.sha256).toBe(expected);
    expect(await statFile("h1/b.jpg")).toEqual({ bytes: bytes.length });
  });

  it("rejects path traversal and odd segments", () => {
    for (const bad of [
      "../x",
      "h1/../../etc/passwd",
      "/etc/passwd",
      "h1//a",
      "h1/./a",
      "h1\\a",
      "h1/a\0b",
      "h1/a.jpg.0f.tmp",
    ]) {
      expect(() => resolveStoragePath(bad), bad).toThrow(StoragePathError);
    }
    expect(() => resolveStoragePath(["h1", ".."])).toThrow(StoragePathError);
    expect(resolveStoragePath("h1/a.jpg")).toBe(path.join(dir, "h1", "a.jpg"));
  });

  it("refuses to save outside the house folder", async () => {
    await expect(saveFile("..", "a.jpg", new Uint8Array())).rejects.toThrow(StoragePathError);
    await expect(saveFile("h1", "../h2/a.jpg", new Uint8Array())).rejects.toThrow(StoragePathError);
  });

  it("deletes a house folder (GDPR cascade)", async () => {
    await saveFile("h1", "a.jpg", new Uint8Array([1]));
    await saveFile("h2", "a.jpg", new Uint8Array([1]));
    await deleteHouseFolder("h1");
    expect(await statFile("h1/a.jpg")).toBeNull();
    expect(await statFile("h2/a.jpg")).not.toBeNull();
  });

  it("maps extensions to content types", () => {
    expect(contentTypeFor("h1/clip.MP4")).toBe("video/mp4");
    expect(contentTypeFor("h1/song.mp3")).toBe("audio/mpeg");
    expect(contentTypeFor("h1/unknown.xyz")).toBe("application/octet-stream");
  });
});

describe("parseRange", () => {
  it.each([
    [null, 100, null],
    ["bytes=0-9", 100, { start: 0, end: 9 }],
    ["bytes=90-", 100, { start: 90, end: 99 }],
    ["bytes=-10", 100, { start: 90, end: 99 }],
    ["bytes=50-500", 100, { start: 50, end: 99 }],
    ["bytes=-500", 100, { start: 0, end: 99 }],
    ["bytes=100-", 100, "unsatisfiable"],
    ["bytes=9-3", 100, "unsatisfiable"],
    ["bytes=0-1,5-6", 100, null],
    ["items=0-1", 100, null],
  ] as const)("%s of %i bytes", (header, size, expected) => {
    expect(parseRange(header, size)).toEqual(expected);
  });
});
