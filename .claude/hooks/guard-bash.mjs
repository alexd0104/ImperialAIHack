// PreToolUse (Bash): block force-push, pushes to main, and commands that print secrets.
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const cmd = String(input?.tool_input?.command ?? "");

const rules = [
  [/git\s+push\b.*(--force\b|\s-f\b|--force-with-lease\b)/, "Force-push is not allowed. Rebase locally and push a new branch if needed."],
  [/git\s+push\b(?!.*\bfeat\/|.*\bfix\/|.*\bdocs\/|.*\bchore\/).*\b(main|master)\b/, "Pushing to main is not allowed. Push your feat/* branch and open a PR (see GIT.md)."],
  [/\b(cat|less|more|head|tail|bat|type)\b[^|;&]*\.env(?!\.example)\b/, "Printing .env files is not allowed (secrets)."],
  [/\b(printenv|env)\b\s*($|\|)/, "Dumping the environment is not allowed (secrets)."],
];

for (const [re, msg] of rules) {
  if (re.test(cmd)) {
    console.error(`Blocked: ${msg}`);
    process.exit(2);
  }
}
process.exit(0);
