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

// WCAG 2.2 contrast for the colour pairs our components actually use (PR #11 review).
// Covers hover/selected states that axe cannot reach on a static page.
function token(name: string): string {
  const match = css.match(new RegExp(`--color-${name}: (#[0-9a-f]{6});`));
  if (!match) throw new Error(`token --color-${name} not found`);
  return match[1];
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const pairs: [fg: string, bg: string, min: number, usedBy: string][] = [
  [
    "white",
    "primary-strong",
    4.5,
    "Button primary, Badge attention/photoPrimary, ToggleGroup primary, Stepper current",
  ],
  ["white", "primary-strong-hover", 4.5, "Button primary hover"],
  ["success-strong", "success-surface", 4.5, "Badge approved"],
  ["white", "success-text", 4.5, "Stepper done, Checkbox checked"],
  ["ink", "avatar-honey", 4.5, "AvatarGroup initials"],
  ["ink", "avatar-sage", 4.5, "AvatarGroup initials"],
  ["ink", "avatar-rose", 4.5, "AvatarGroup initials"],
  ["ink", "background", 4.5, "body text"],
  ["ink", "surface", 4.5, "cards, inputs"],
  ["ink", "surface-muted", 4.5, "Tabs, ToggleGroup track"],
  ["white", "primary", 3, "IconButton primary (icon only)"],
  ["white", "switch-on", 3, "Switch knob (non-text)"],
];

describe("colour contrast", () => {
  it.each(pairs)("%s on %s ≥ %d:1 (%s)", (fg, bg, min) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(min);
  });
});
