// PostToolUse: format the edited file with Biome. Never blocks.
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}");
  const file = String(input?.tool_input?.file_path ?? "");
  if (file && /\.(ts|tsx|js|jsx|mjs|json|css)$/.test(file) && existsSync(file)) {
    spawnSync("npx", ["--no-install", "biome", "format", "--write", file], { stdio: "ignore", timeout: 15000 });
  }
} catch {
  // formatting is best effort
}
process.exit(0);
