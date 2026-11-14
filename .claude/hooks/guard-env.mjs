// PreToolUse: block any read or write of .env files (secrets).
// Exit code 2 blocks the tool call and shows stderr to Claude.
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const p = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path ?? "";
const name = basename(String(p));

if (name === ".env" || (name.startsWith(".env.") && name !== ".env.example")) {
  console.error(
    `Blocked: ${name} holds secrets. Agents never read or edit .env files. ` +
      "Use .env.example for variable names, and ask the human to set values.",
  );
  process.exit(2);
}
process.exit(0);
