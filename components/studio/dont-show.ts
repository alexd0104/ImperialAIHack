import type { MemorySheet } from "@/lib/contracts";

const normalise = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/**
 * Which "Don't show" entries a Memory mentions. A simple whole-word text match on
 * everything the family wrote: it warns, it never blocks.
 */
export function dontShowMatches(
  sheet: Partial<
    Pick<
      MemorySheet,
      "title" | "people" | "place" | "when" | "soundOfPlace" | "message" | "freeText"
    >
  >,
  dontShow: readonly string[],
): string[] {
  const text = normalise(
    [
      sheet.title,
      ...(sheet.people ?? []),
      sheet.place,
      sheet.when,
      sheet.soundOfPlace,
      sheet.message,
      sheet.freeText,
    ]
      .filter(Boolean)
      .join(" \n "),
  );
  return dontShow.filter((entry) => {
    const word = normalise(entry.trim());
    if (!word) return false;
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, "u").test(text);
  });
}

const aloneKey = "memorai:studio:ok-alone-default";

/** House-wide "OK alone" default (SH4). No field on House yet, so it lives in this browser. */
export function readOkAloneDefault(): boolean {
  try {
    return localStorage.getItem(aloneKey) === "true";
  } catch {
    return false;
  }
}

export function writeOkAloneDefault(value: boolean) {
  try {
    localStorage.setItem(aloneKey, String(value));
  } catch {
    // Storage blocked: each Memory's own switch still works.
  }
}
