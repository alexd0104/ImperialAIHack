import type { MemoryDetail } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { toDraft } from "./memory-answers";
import { hasVisual } from "./memory-bank";

const words = copy.studio.sheet;

export type SheetRow = { key: string; label: string; value: string; href: string };

/** Plain-language rows of the Memory sheet; every row links back to the field it came from. */
export function sheetRows(memory: MemoryDetail): SheetRow[] {
  const draft = toDraft(memory);
  const questions = `/studio/memories/${memory.id}/questions`;
  const bank = `/studio/memories/${memory.id}`;
  const visuals = memory.assets.filter((asset) => asset.kind === "photo" || asset.kind === "video");
  const has = (kind: "song" | "voice", id: string) =>
    memory.assets.some((asset) => asset.kind === kind && asset.id === id);
  const placeWhen = [draft.place, draft.when]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  const row = (key: string, label: string, value: string, href = `${questions}#field-${key}`) => ({
    key,
    label,
    value: value.trim() || words.notSet,
    href,
  });

  return [
    row("photos", words.photosRow, hasVisual(visuals) ? words.photos(visuals.length) : "", bank),
    row("title", words.rows.title, draft.title),
    row("people", words.rows.people, draft.people),
    row("place", words.rows.placeWhen, placeWhen),
    row("soundOfPlace", words.rows.sound, draft.soundOfPlace),
    row("songAssetId", words.rows.song, has("song", draft.songAssetId) ? words.rows.song : ""),
    row("message", words.rows.message, draft.message),
    row(
      "voice",
      words.rows.voice,
      has("voice", memory.answers.voiceAssetId ?? "") ? words.rows.voice : "",
      bank,
    ),
    row("colour", words.rows.colour, words.colour[draft.colour]),
    row("okAlone", words.rows.okAlone, draft.okAlone ? words.yes : words.no),
    row("freeText", words.rows.freeText, draft.freeText),
  ];
}
