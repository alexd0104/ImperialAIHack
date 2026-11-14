import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Locks globals.css to TECHNICAL.md §3.2 so a token cannot drift silently.
const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8").toLowerCase();

const spec: Record<string, string> = {
  "--color-background": "#fbf3e8",
  "--color-surface": "#fffcf6",
  "--color-surface-muted": "#f6eadb",
  "--color-ink": "#3b2a20",
  "--color-primary": "#d9734e",
  "--color-success": "#7fa36f",
  "--color-success-surface": "#e3ecd9",
  "--color-success-text": "#4f7a44",
  "--color-warning-surface": "#fbe6d8",
  "--color-danger": "#c2412d",
  "--color-switch-off": "#dcd5cb",
  "--color-overlay": "#1e140d",
  "--color-avatar-honey": "#f2b45a",
  "--color-avatar-sage": "#8fb08a",
  "--color-avatar-rose": "#e79a86",
  "--color-heart-from": "#ee9475",
  "--color-heart-to": "#d2603d",
  "--color-room-garden": "#efedda",
  "--color-room-kitchen": "#fbead2",
  "--color-room-living": "#f9e3d7",
  "--radius-card": "24px",
  "--radius-screen": "28px",
  "--shadow-polaroid": "0 18px 34px -6px rgba(122, 74, 42, 0.18)",
  "--shadow-heart": "0 18px 50px 0 rgba(217, 115, 78, 0.45)",
  "--ease-memorai": "cubic-bezier(0.22, 1, 0.36, 1)",
};

describe("design tokens", () => {
  it.each(Object.entries(spec))("%s matches TECHNICAL.md §3.2", (name, value) => {
    expect(css).toContain(`${name}: ${value};`);
  });

  it("has no leftover #2B2420 or DM Sans", () => {
    expect(css).not.toContain("#2b2420;");
    expect(css).not.toContain("dm sans");
  });
});
