import { describe, expect, it } from "vitest";
import {
  activeSection,
  bankMemoryId,
  flowStep,
  stepHref,
  stepLabel,
  studioParent,
  withHouse,
} from "./studio-nav";

const m = "/studio/memories/abc";

describe("stepHref", () => {
  it("links earlier steps only", () => {
    const ids = { memoryId: "abc", storyId: "s1" };
    expect(stepHref(1, 4, ids)).toBe(m);
    expect(stepHref(2, 4, ids)).toBe(`${m}/questions`);
    expect(stepHref(3, 4, ids)).toBe(`${m}/sheet`);
    expect(stepHref(4, 4, ids)).toBeNull();
    expect(stepHref(5, 4, ids)).toBeNull();
  });
  it("needs ids to link", () => {
    expect(stepHref(1, 3, {})).toBeNull();
  });
});

describe("studioParent", () => {
  it("walks the create flow back step by step", () => {
    expect(studioParent(`${m}/review`)?.href).toBe(`${m}/sheet`);
    expect(studioParent(`${m}/sheet`)?.href).toBe(`${m}/questions`);
    expect(studioParent(`${m}/questions`)?.href).toBe(m);
  });

  it("sends the Memory bank to its Story's place page, or home before it is known", () => {
    expect(studioParent(m, { storyId: "s1" })?.href).toBe("/studio/stories/s1/place");
    expect(studioParent(m, { houseId: "h1" })?.href).toBe("/studio?house=h1");
  });

  it("sends top-level screens home, keeping the House", () => {
    for (const path of [
      "/studio/stories/s1/place",
      "/studio/stories/new",
      "/studio/house/new",
      "/studio/care",
      "/studio/stories/s1/memories/new",
    ])
      expect(studioParent(path, { houseId: "h1" })?.href).toBe("/studio?house=h1");
    expect(studioParent("/studio/care")?.href).toBe("/studio");
  });

  it("has no back link on home or sign-in", () => {
    expect(studioParent("/studio")).toBeNull();
    expect(studioParent("/studio/")).toBeNull();
    expect(studioParent("/studio/login")).toBeNull();
  });
});

describe("activeSection", () => {
  it("marks the right header link", () => {
    expect(activeSection("/studio")).toBe("home");
    expect(activeSection("/studio/care")).toBe("care");
    expect(activeSection("/studio/stories/new")).toBe("create");
    expect(activeSection(`${m}/sheet`)).toBe("create");
    expect(activeSection("/studio/house/new")).toBe("create");
    expect(activeSection("/studio/login")).toBeNull();
    expect(activeSection("/house/t")).toBeNull();
  });
});

describe("flowStep", () => {
  it("numbers bank → questions → sheet → review → place", () => {
    expect(flowStep(m)).toBe(1);
    expect(flowStep(`${m}/questions`)).toBe(2);
    expect(flowStep(`${m}/sheet`)).toBe(3);
    expect(flowStep(`${m}/review`)).toBe(4);
    expect(flowStep("/studio/stories/s1/place")).toBe(5);
    expect(flowStep("/studio/care")).toBeNull();
    expect(stepLabel(2)).toBe("Step 2 of 5");
  });
});

it("bankMemoryId and withHouse", () => {
  expect(bankMemoryId(m)).toBe("abc");
  expect(bankMemoryId(`${m}/sheet`)).toBeNull();
  expect(withHouse("/studio", null)).toBe("/studio");
  expect(withHouse("/studio/care", "h 1")).toBe("/studio/care?house=h%201");
});
