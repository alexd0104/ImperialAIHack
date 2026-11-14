import { describe, expect, it } from "vitest";
import { detectRefusedRequests, mergeRefusedRequests } from "./refused-requests";

describe("detectRefusedRequests", () => {
  it.each([
    ["add grandpa", ["add grandpa"]],
    ["Can you put the dog in the picture?", ["Can you put the dog in the picture"]],
    ["Remove the man on the left", ["Remove the man on the left"]],
    ["Change her dress to red and make her smile", ["Change her dress to red", "make her smile"]],
    ["Make Frank wave at the camera", ["Make Frank wave at the camera"]],
    ["Add some music please", ["Add some music please"]],
  ])("refuses %j", (text, expected) => {
    expect(detectRefusedRequests(text)).toEqual(expected);
  });

  it.each([
    [undefined],
    [""],
    ["She was so happy that summer."],
    ["Please don't add anything, keep it simple."],
    ["Add the sound of seagulls"],
    ["Add colour if you can"],
    ["Fix the scratches"],
  ])("accepts %j", (text) => {
    expect(detectRefusedRequests(text)).toEqual([]);
  });
});

describe("mergeRefusedRequests", () => {
  it("keeps model items first and drops overlapping detections", () => {
    expect(
      mergeRefusedRequests(
        ["Add grandpa next to her."],
        ["Add grandpa next to her", "remove the dog"],
      ),
    ).toEqual(["Add grandpa next to her.", "remove the dog"]);
  });

  it("caps the list and skips empty items", () => {
    const many = Array.from({ length: 8 }, (_, i) => `add person ${i}0`);
    expect(mergeRefusedRequests(["  "], many)).toHaveLength(5);
  });
});
