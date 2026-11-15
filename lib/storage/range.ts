// HTTP Range (RFC 9110 §14) for a single byte range. Safari refuses to play or seek a
// video without it (TECHNICAL.md §10). Multi-range requests get the whole file (200),
// which the spec allows.

export type ByteRange = { start: number; end: number };

/** `null` → serve the whole file; `"unsatisfiable"` → 416. `end` is inclusive. */
export function parseRange(
  header: string | null,
  size: number,
): ByteRange | "unsatisfiable" | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, first, last] = match;
  if (!first && !last) return null;

  if (!first) {
    // Suffix range: the last N bytes.
    const length = Number(last);
    if (length === 0 || size === 0) return "unsatisfiable";
    return { start: Math.max(0, size - length), end: size - 1 };
  }

  const start = Number(first);
  const end = last ? Math.min(Number(last), size - 1) : size - 1;
  if (start >= size || (last && Number(last) < start)) return "unsatisfiable";
  return { start, end };
}
