import { describe, expect, it } from "vitest";
import { buildSheet } from "@/app/api/memories/_sheet";
import { UpdateMemoryRequest } from "@/lib/contracts";
import { toDraft, toPatch } from "./memory-answers";

const memory = { title: "Christmas 1982", answers: {}, okAlone: false };

describe("guided answers", () => {
  it("starts from the Memory name and keeps black and white", () => {
    const draft = toDraft(memory);
    expect(draft.title).toBe("Christmas 1982");
    expect(draft.colour).toBe("keep_bw");
    expect(draft.people).toBe("");
  });

  it("sends a valid PATCH with names split and blanks left out", () => {
    const patch = toPatch({
      ...toDraft(memory),
      people: " Mum, Grandad Jim ,, ",
      place: "  ",
      when: "1982",
    });
    expect(UpdateMemoryRequest.safeParse(patch).success).toBe(true);
    expect(patch.answers?.people).toEqual(["Mum", "Grandad Jim"]);
    expect(patch.answers?.place).toBeUndefined();
    expect(patch.answers?.when).toBe("1982");
  });

  it("round-trips through the server sheet", () => {
    const patch = toPatch({ ...toDraft(memory), people: "Mum", okAlone: true });
    const sheet = buildSheet({
      title: memory.title,
      answers: patch.answers ?? {},
      freeText: "",
      okAlone: true,
    });
    expect(sheet).toMatchObject({ title: "Christmas 1982", people: ["Mum"], okAlone: true });
    expect(sheet.freeText).toBeUndefined();
    expect(sheet.source).toBe("form");
  });
});
