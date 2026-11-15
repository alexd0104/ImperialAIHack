import { type Memory, MemorySheet } from "@/lib/contracts";

/**
 * Builds the MemorySheet from saved answers. Colour defaults to "keep_bw" so that
 * nothing is changed until the family chooses.
 */
export function buildSheet(memory: Pick<Memory, "title" | "answers" | "freeText" | "okAlone">) {
  const { answers } = memory;
  return MemorySheet.parse({
    ...answers,
    title: answers.title ?? memory.title,
    people: answers.people ?? [],
    colour: answers.colour ?? "keep_bw",
    freeText: memory.freeText || undefined,
    okAlone: memory.okAlone,
    source: "form",
  });
}
