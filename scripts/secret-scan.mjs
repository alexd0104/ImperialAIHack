// Pre-commit secret scan: the repo is public, so a leaked key is unrecoverable.
// Reports file, line and rule only; the matched text is never printed.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";

/** @type {{ name: string; pattern: RegExp }[]} */
export const SECRET_RULES = [
  {
    // fal keys are "<uuid key id>:<32 hex secret>"
    name: "fal key",
    pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}:[0-9a-f]{32}/i,
  },
  { name: "Anthropic key (sk-ant-)", pattern: /sk-ant-[A-Za-z0-9_-]{16,}/ },
  {
    // Only a URI carrying credentials is a secret; the bare scheme appears in docs.
    name: "MongoDB Atlas URI with credentials (mongodb+srv://)",
    pattern: /mongodb\+srv:\/\/[^\s:@/<>]+:[^\s@<>]+@/,
  },
];

/** `.env.example` is the only env file allowed in git. */
export function isForbiddenEnvFile(path) {
  const name = basename(path);
  return /^\.env(\..+)?$/.test(name) && name !== ".env.example";
}

/**
 * @param {string} text
 * @returns {{ line: number; rule: string }[]}
 */
export function scanText(text) {
  const findings = [];
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    for (const rule of SECRET_RULES) {
      if (rule.pattern.test(lines[index])) {
        findings.push({ line: index + 1, rule: rule.name });
      }
    }
  }
  return findings;
}

function stagedFiles() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], {
    encoding: "utf8",
  });
  return out.split("\0").filter(Boolean);
}

function stagedContent(path) {
  // Scan what is staged, not the working copy, so a partial `git add` cannot hide a key.
  return execFileSync("git", ["show", `:${path}`], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function main() {
  const all = process.argv.includes("--all");
  const files = all
    ? execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)
    : stagedFiles();

  const problems = [];
  for (const file of files) {
    if (isForbiddenEnvFile(file)) {
      problems.push(`${file}: env files must never be committed`);
      continue;
    }
    let text;
    try {
      text = all ? readFileSync(file, "utf8") : stagedContent(file);
    } catch (error) {
      // A tracked file deleted from the working copy has nothing to scan; anything else
      // unreadable fails the scan, because skipping it silently could let a key through.
      if (all && error instanceof Error && "code" in error && error.code === "ENOENT") continue;
      problems.push(`${file}: could not be read for scanning`);
      continue;
    }
    // Binary files cannot hold a pasted key in a way these rules would catch.
    if (text.includes("\u0000")) continue;
    for (const finding of scanText(text)) {
      problems.push(`${file}:${finding.line}: ${finding.rule}`);
    }
  }

  if (problems.length > 0) {
    console.error("Secret scan failed. Remove these before committing:");
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
