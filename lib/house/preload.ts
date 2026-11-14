// H2 preloader: every bundle file is loaded before the House shows anything, so nothing
// pops in or stalls mid-Story. A file that fails or hangs is marked and skipped, never
// blocking: the player falls back to the still photo for it.

export type FileKind = "image" | "audio" | "video" | "model" | "other";

const KINDS: Record<string, FileKind> = {
  svg: "image",
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  gif: "image",
  mp3: "audio",
  m4a: "audio",
  wav: "audio",
  flac: "audio",
  ogg: "audio",
  webm: "video",
  mp4: "video",
  mov: "video",
  glb: "model",
};

export function fileKind(url: string): FileKind {
  const path = url.split(/[?#]/)[0] ?? "";
  const ext = path.slice(path.lastIndexOf(".") + 1).toLowerCase();
  return KINDS[ext] ?? "other";
}

export type Loader = (url: string, kind: FileKind) => Promise<void>;

/** Browser loader: decodes images, downloads everything else into the HTTP cache. */
export const browserLoader: Loader = async (url, kind) => {
  if (kind === "image") {
    const img = new Image();
    img.src = url;
    await img.decode();
    return;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(String(response.status));
  await response.blob();
};

function withTimeout(promise: Promise<void>, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** Resolves once every file is loaded or given up on; returns the URLs that failed. */
export async function preloadFiles(
  urls: readonly string[],
  load: Loader = browserLoader,
  timeoutMs = 20_000,
): Promise<Set<string>> {
  const failed = new Set<string>();
  await Promise.all(
    [...new Set(urls)].map(async (url) => {
      try {
        await withTimeout(load(url, fileKind(url)), timeoutMs);
      } catch {
        failed.add(url);
      }
    }),
  );
  return failed;
}
