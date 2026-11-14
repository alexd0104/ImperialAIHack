import { describe, expect, it } from "vitest";
import { isForbiddenEnvFile, scanText } from "./secret-scan.mjs";

// Fixtures are assembled at runtime so this file never contains a string the scan would block.
const hex = (length: number) => "a1b2c3d4e5f60718293a4b5c6d7e8f90".repeat(2).slice(0, length);
const falKey = `${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}:${hex(32)}`;
const anthropicKey = `sk-${"ant"}-api03-${hex(24)}`;
const mongoUri = `mongodb+${"srv"}://someone:${hex(12)}@cluster0.example.mongodb.net/db`;

describe("scanText", () => {
  it("flags a fal key", () => {
    expect(scanText(`FAL_KEY=${falKey}`)).toEqual([{ line: 1, rule: "fal key" }]);
  });

  it("flags an Anthropic key", () => {
    expect(scanText(`const key = "${anthropicKey}";`).map((f) => f.rule)).toEqual([
      "Anthropic key (sk-ant-)",
    ]);
  });

  it("flags a MongoDB Atlas URI with credentials and reports the right line", () => {
    const findings = scanText(`first line\nMONGODB_URI=${mongoUri}`);
    expect(findings).toHaveLength(1);
    expect(findings[0]?.line).toBe(2);
  });

  it("ignores placeholders and prose", () => {
    const text = [
      "FAL_KEY=ci-dummy",
      "ANTHROPIC_API_KEY=sk-ant-...",
      "MONGODB_URI=mongodb://localhost:27017",
      "MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net",
      "Scans for fal keys, sk-ant- and mongodb+srv:// patterns.",
    ].join("\n");
    expect(scanText(text)).toEqual([]);
  });
});

describe("isForbiddenEnvFile", () => {
  it("allows only .env.example", () => {
    expect(isForbiddenEnvFile(".env.example")).toBe(false);
    expect(isForbiddenEnvFile(".env")).toBe(true);
    expect(isForbiddenEnvFile(".env.local")).toBe(true);
    expect(isForbiddenEnvFile("apps/web/.env.production")).toBe(true);
    expect(isForbiddenEnvFile("lib/env.ts")).toBe(false);
  });
});
