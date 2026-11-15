// PreToolUse (Bash): when an agent creates a task branch (feat|fix/<zone>-<ID>-...),
// check that the task's hard dependencies are merged on main. Blocks with exit 2 if not.
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const cmd = String(input?.tool_input?.command ?? "");
const m = cmd.match(/git\s+(?:checkout\s+-[bB]|switch\s+-[cC]|worktree\s+add\b.*\s-[bB])\s+((?:feat|fix)\/[a-z]+-(SH\d+|[FPSHQCB]\d+)\b\S*)/);
if (!m) process.exit(0);

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const r = spawnSync("node", [join(root, "scripts/tasks.mjs"), "check", m[2]], { cwd: root, encoding: "utf8", timeout: 30000 });
if (r.status === 1) {
  console.error(`${r.stderr}\nBranch ${m[1]} not created. Tell the human which task is blocking and suggest a ready task.`);
  process.exit(2);
}
if (r.stdout) console.error(r.stdout.trim()); // soft-dependency warnings are shown but do not block
process.exit(0);
