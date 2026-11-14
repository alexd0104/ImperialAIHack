import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mockFixturePath } from "./fal";
import { estimateCostUsd, FAL_MODEL_KEYS, MODELS } from "./models";

describe("models", () => {
  it.each(FAL_MODEL_KEYS)("%s has a mock fixture and a price", (key) => {
    expect(existsSync(mockFixturePath(key))).toBe(true);
    expect(estimateCostUsd(key)).toBeGreaterThan(0);
  });

  it("estimates per-second models from their default duration", () => {
    expect(estimateCostUsd("animate")).toBeCloseTo(0.35);
    expect(estimateCostUsd("animate", { seconds: 10 })).toBeCloseTo(0.7);
  });

  it("no model ID appears in code outside lib/ai/models.ts", () => {
    const ids = Object.values(MODELS).map((m) => m.id);
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        if (["node_modules", ".next", ".git", "mocks", "docs", "storage"].includes(name)) continue;
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) walk(full);
        else if (
          /\.(ts|tsx|mjs|js)$/.test(name) &&
          !full.endsWith(path.join("lib", "ai", "models.ts"))
        ) {
          const text = readFileSync(full, "utf8");
          for (const id of ids) if (text.includes(`"${id}"`)) offenders.push(`${full}: ${id}`);
        }
      }
    };
    walk(process.cwd());
    expect(offenders).toEqual([]);
  });
});
