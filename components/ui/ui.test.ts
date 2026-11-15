import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";
import { avatarTone, initials } from "./avatar-group";
import { stepState } from "./stepper";

describe("cn", () => {
  it("keeps a custom font size and a text colour together", () => {
    expect(cn("text-18 text-ink")).toBe("text-18 text-ink");
  });

  it("lets a later font size override an earlier one", () => {
    expect(cn("text-18", "text-16")).toBe("text-16");
  });

  it("lets a later custom shadow override an earlier one", () => {
    expect(cn("shadow-card", "shadow-polaroid")).toBe("shadow-polaroid");
  });

  it("merges custom radii", () => {
    expect(cn("rounded-lg", "rounded-card")).toBe("rounded-card");
  });
});

describe("avatarTone", () => {
  it("cycles honey, sage, rose", () => {
    expect([0, 1, 2, 3].map(avatarTone)).toEqual([
      "bg-avatar-honey",
      "bg-avatar-sage",
      "bg-avatar-rose",
      "bg-avatar-honey",
    ]);
  });

  it("never returns undefined for odd input", () => {
    expect(avatarTone(-1)).toBe("bg-avatar-rose");
  });
});

describe("initials", () => {
  it("takes up to two words", () => {
    expect(initials("anne marie martin")).toBe("AM");
    expect(initials("  Léa ")).toBe("L");
    expect(initials("")).toBe("");
  });
});

describe("stepState", () => {
  it("marks steps before, at and after the current one", () => {
    expect([0, 1, 2].map((i) => stepState(i, 1))).toEqual(["done", "current", "todo"]);
  });
});
