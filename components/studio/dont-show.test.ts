import { describe, expect, it } from "vitest";
import { dontShowMatches } from "./dont-show";

describe("dontShowMatches", () => {
  it("matches whole words across the sheet, ignoring case and accents", () => {
    const sheet = { title: "Christmas", people: ["Mum", "Zoé"], message: "Before the hospital" };
    expect(dontShowMatches(sheet, ["zoe", "Hospital", "mu", "war"])).toEqual(["zoe", "Hospital"]);
  });
});
