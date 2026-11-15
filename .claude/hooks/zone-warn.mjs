// PostToolUse: warn (do not block) when a file outside the developer's zone was edited.
// Zone comes from OWNER_ZONE in the environment or in .env.local (read here without printing it).
import { readFileSync, existsSync } from "node:fs";
import { relative, join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

function ownerZone() {
  if (process.env.OWNER_ZONE) return process.env.OWNER_ZONE.trim();
  const f = join(root, ".env.local");
  if (!existsSync(f)) return "";
  const line = readFileSync(f, "utf8").split("\n").find((l) => l.startsWith("OWNER_ZONE="));
  return line ? line.slice("OWNER_ZONE=".length).trim() : "";
}

const zones = {
  pipeline: ["lib/ai/", "lib/jobs/", "lib/contracts/", "lib/db/", "lib/storage/", "lib/session.ts", "app/api/jobs/", "app/api/files/", "app/api/auth/", "app/api/memories/[id]/generate/", "app/api/scenes/[id]/retry/", "instrumentation.ts", "proxy.ts", "mocks/", ".github/", ".claude/"],
  studio: ["app/studio/", "components/studio/", "app/api/houses/", "app/api/rooms/", "app/api/stories/", "app/api/memories/", "app/api/assets/", "app/api/scenes/[id]/choice/"],
  house: ["app/house/", "components/house/", "lib/house/", "app/api/h/", "e2e/", "scripts/demo-check.ts"],
  design: ["app/globals.css", "app/fonts.ts", "components/ui/", "public/", "docs/DESIGN.md", "scripts/seed-demo.ts", "scripts/export-demo.ts"],
};
const shared = ["docs/", "lib/copy.ts", "README.md", "FEATURES.md", "PLAN.md", "TESTING.md", "TECHNICAL.md", "GIT.md", "AGENTS.md", "CLAUDE.md", "package.json", "pnpm-lock.yaml"];

try {
  const input = JSON.parse(readFileSync(0, "utf8") || "{}");
  const file = String(input?.tool_input?.file_path ?? "");
  const zone = ownerZone();
  if (!file || !zone || !zones[zone]) process.exit(0);
  const rel = relative(root, file).replaceAll("\\", "/");
  const inZone = zones[zone].some((p) => rel.startsWith(p));
  const isShared = shared.some((p) => rel.startsWith(p));
  if (!inZone && !isShared) {
    console.error(
      `Zone warning: ${rel} is outside your zone (${zone}). Keep the change minimal and list this file ` +
        "in the PR description under 'Files outside my zone' (see GIT.md §4).",
    );
    process.exit(2); // PostToolUse: the edit is kept; stderr is shown to Claude as a warning
  }
} catch {
  // never break the session on hook errors
}
process.exit(0);
