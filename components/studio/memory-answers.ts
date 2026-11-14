import type { MemoryAnswers, UpdateMemoryRequest } from "@/lib/contracts";

/** What the guided-questions form holds while the family types. */
export type AnswerDraft = {
  title: string;
  people: string;
  place: string;
  when: string;
  soundOfPlace: string;
  songAssetId: string;
  message: string;
  colour: NonNullable<MemoryAnswers["colour"]>;
  freeText: string;
  okAlone: boolean;
};

export function toDraft(memory: {
  title: string;
  answers: MemoryAnswers;
  freeText?: string;
  okAlone: boolean;
}): AnswerDraft {
  const { answers } = memory;
  return {
    title: answers.title ?? memory.title,
    people: (answers.people ?? []).join(", "),
    place: answers.place ?? "",
    when: answers.when ?? "",
    soundOfPlace: answers.soundOfPlace ?? "",
    songAssetId: answers.songAssetId ?? "",
    message: answers.message ?? "",
    colour: answers.colour ?? "keep_bw",
    freeText: memory.freeText ?? "",
    okAlone: memory.okAlone,
  };
}

const optional = (value: string) => value.trim() || undefined;

/** The PATCH body; empty fields are sent as undefined so the server keeps nothing blank. */
export function toPatch(draft: AnswerDraft): UpdateMemoryRequest {
  const title = draft.title.trim();
  return {
    title: title || undefined,
    answers: {
      title: title || undefined,
      people: draft.people
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .slice(0, 10),
      place: optional(draft.place),
      when: optional(draft.when),
      soundOfPlace: optional(draft.soundOfPlace),
      songAssetId: optional(draft.songAssetId),
      message: optional(draft.message),
      colour: draft.colour,
    },
    freeText: draft.freeText,
    okAlone: draft.okAlone,
  };
}
