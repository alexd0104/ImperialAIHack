import { describe, expect, it } from "vitest";
import type { MemoryDetail } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { sheetRows } from "./memory-sheet-rows";

const words = copy.studio.sheet;

const base = {
  id: "m1",
  title: "Christmas 1982",
  answers: { people: ["Mum"], place: "Maple Street", colour: "colourise" },
  okAlone: false,
  assets: [{ id: "a1", kind: "photo" }],
} as unknown as MemoryDetail;

describe("Memory sheet rows", () => {
  it("writes plain language and fills blanks with 'Not added'", () => {
    const rows = Object.fromEntries(sheetRows(base).map((row) => [row.key, row.value]));
    expect(rows.photos).toBe(words.photos(1));
    expect(rows.people).toBe("Mum");
    expect(rows.place).toBe("Maple Street");
    expect(rows.colour).toBe(words.colour.colourise);
    expect(rows.okAlone).toBe(words.no);
    expect(rows.message).toBe(words.notSet);
  });

  it("links every row back to its field", () => {
    const rows = sheetRows(base);
    expect(rows.find((row) => row.key === "people")?.href).toBe(
      "/studio/memories/m1/questions#field-people",
    );
    expect(rows.find((row) => row.key === "photos")?.href).toBe("/studio/memories/m1");
  });
});
