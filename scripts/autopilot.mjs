#!/usr/bin/env node
// Overnight runner. Picks your next ready task (deps merged, files present), runs a coding agent
// unattended in mock mode, verifies, rebases, pushes to main, then repeats. When nothing is ready
// it waits for teammates' pushes instead of stopping, so nobody is blocked by someone sleeping.
//
//   pnpm autopilot <person> [--engine claude|codex|dry] [--model sonnet] [--only P7,P8]
//                           [--max-tasks 8] [--task-usd 4] [--total-usd 25] [--wait-hours 8] [--minutes 50]
//
// Why the runner (not the agent) pushes: main must stay green while 4 laptops push all night, and
// Codex's sandbox may have no network. The agent only edits and commits; the runner verifies.
import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const person = argv[0];
const opt = (n, d) => (argv.indexOf(`--${n}`) > -1 ? argv[argv.indexOf(`--${n}`) + 1] : d);
const engine = opt("engine", "claude");
const model = opt("model", engine === "claude" ? "sonnet" : "");
const only = opt("only", "");
const maxTasks = Number(opt("max-tasks", 8));
const taskUsd = Number(opt("task-usd", 4));
const totalUsd = Number(opt("total-usd", 25));
const waitHours = Number(opt("wait-hours", 8));
const minutes = Number(opt("minutes", 50));

const registry = JSON.parse(readFileSync(join(root, "docs/tasks.json"), "utf8"));
if (!registry.people[person]) {
  console.error(
    `Usage: pnpm autopilot <${Object.keys(registry.people).join("|")}> [--engine claude|codex|dry]`,
  );
  process.exit(1);
}
const dir = join(root, ".autopilot");
mkdirSync(join(dir, "logs"), { recursive: true });
const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const logFile = join(dir, "logs", `${person}-${stamp}.log`);
const summary = [];
const attempts = new Map();
// Tests and agents must never spend live credits unattended.
const env = { ...process.env, AI_MODE: "mock", FORCE_COLOR: "0" };

function log(msg) {
  const line = `[${new Date().toTimeString().slice(0, 8)}] ${msg}`;
  console.log(line);
  appendFileSync(logFile, `${line}\n`);
}
function sh(cmd, args, timeoutMs = 15 * 60e3) {
  const r = spawnSync(cmd, args, {
    cwd: root,
    env,
    encoding: "utf8",
    maxBuffer: 64e6,
    timeout: timeoutMs,
  });
  return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}
const git = (...a) => sh("git", a);
const head = () => git("rev-parse", "HEAD").out.trim();
const dirty = () => git("status", "--porcelain").out.trim() !== "";
const tail = (s, n = 60) => s.split("\n").slice(-n).join("\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rebasing = () =>
  ["rebase-merge", "rebase-apply"].some((p) =>
    existsSync(join(root, git("rev-parse", "--git-path", p).out.trim())),
  );

function nextId() {
  const args = ["scripts/tasks.mjs", "next-id", person];
  if (only) args.push("--only", only);
  return sh("node", args).out.trim().split("\n").pop() ?? "";
}
function isDone(id) {
  // "(ID)" never matches "(ID-wip)", same rule as the task board.
  return (
    git("log", "origin/main", "--fixed-strings", `--grep=(${id})`, "--format=%H").out.trim() !== ""
  );
}
function skip(id, why) {
  appendFileSync(join(dir, `skip-${person}`), `${id}\n`);
  log(`↷ ${id} skipped for this run: ${why}`);
  summary.push(`- ${id}: ${why}`);
}

const ALLOWED = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "TodoWrite",
  "Bash(pnpm:*)",
  "Bash(npx biome:*)",
  "Bash(node scripts/tasks.mjs:*)",
  "Bash(node scripts/doc.mjs:*)",
  "Bash(git status:*)",
  "Bash(git diff:*)",
  "Bash(git log:*)",
  "Bash(git show:*)",
  "Bash(git add:*)",
  "Bash(git commit:*)",
  "Bash(git restore:*)",
  "Bash(git rebase --continue:*)",
  "Bash(git mv:*)",
  "Bash(git rm:*)",
  "Bash(cp:*)",
  "Bash(mv:*)",
  "Bash(find:*)",
  "Bash(ls:*)",
  "Bash(mkdir:*)",
  "Bash(grep:*)",
  "Bash(wc:*)",
  "Bash(head:*)",
  "Bash(tail:*)",
];
const DENIED = [
  "Bash(git push:*)",
  "Bash(git reset --hard:*)",
  "Bash(rm -rf:*)",
  "Read(./.env*)",
  "Edit(./.env*)",
];

function runAgent(prompt, label, usd) {
  const out = join(dir, "logs", `${person}-${stamp}-${label}.jsonl`);
  const last = join(dir, "logs", `${person}-${stamp}-${label}.last.txt`);
  if (engine === "dry") {
    writeFileSync(out, prompt);
    return Promise.resolve({ text: "RESULT: PARTIAL dry run", cost: 0 });
  }
  const args =
    engine === "codex"
      ? [
          "exec",
          "--full-auto",
          "-c",
          "sandbox_workspace_write.network_access=true",
          "-o",
          last,
          ...(model ? ["-m", model] : []),
          prompt,
        ]
      : [
          "-p",
          prompt,
          "--model",
          model,
          "--permission-mode",
          "dontAsk",
          "--allowedTools",
          ALLOWED.join(","),
          "--disallowedTools",
          DENIED.join(","),
          "--strict-mcp-config",
          "--max-turns",
          "90",
          "--max-budget-usd",
          String(usd),
          "--output-format",
          "stream-json",
          "--verbose",
        ];
  return new Promise((resolve) => {
    const child = spawn(engine, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let buf = "";
    const timer = setTimeout(() => {
      log(`⏱ ${label} hit ${minutes} min, stopping the agent`);
      child.kill("SIGTERM");
    }, minutes * 60e3);
    const onData = (d) => {
      appendFileSync(out, d);
      buf = (buf + d).slice(-200_000);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("close", () => {
      clearTimeout(timer);
      let text = existsSync(last) ? readFileSync(last, "utf8") : "";
      let cost = 0;
      for (const line of buf.split("\n")) {
        try {
          const ev = JSON.parse(line);
          if (ev.type === "result") {
            text =
              // Budget/turn limits end a run normally (work is kept); only real API failures count as errors.
              ev.terminal_reason === "api_error" ||
              (ev.is_error && !String(ev.subtype ?? "").startsWith("error_max"))
                ? `AGENT ERROR: ${ev.terminal_reason ?? ev.subtype ?? "unknown"} ${ev.result ?? ""}`
                : String(ev.result ?? ev.subtype ?? "");
            cost = Number(ev.total_cost_usd ?? 0);
          }
        } catch {}
      }
      resolve({ text: text || tail(buf, 20), cost });
    });
  });
}

const RULES = `You run UNATTENDED: nobody can answer questions, so never ask; decide with AGENTS.md and the simplest reliable option.
Never: push (the runner pushes), use AI_MODE=live, read .env*, start a dev server, delete or weaken tests/hooks/fallbacks, edit docs/STATUS.md.
Add a dependency only if essential (one-line reason in the commit). Keep output small (| tail -40).`;

function taskPrompt(t) {
  const brief = t.brief
    ? `node scripts/doc.mjs docs/FEATURES-V2.md ${t.id}`
    : `grep -n "| ${t.id} |" FEATURES.md`;
  return `memorAI task ${t.id} — ${t.title} (owner: ${person}).
${RULES}
1. Read your brief only: \`${brief}\` (and the "Rules for every v2 task" section if it is a v2 task). Read other docs by section with scripts/doc.mjs. Stay inside the files the brief lists. If commits for this task already exist (\`git log --oneline --grep=${t.id}\`), continue from them and from your handoff in docs/status/${person}.md.
2. Implement in small steps; add Vitest tests for new lib/ logic; run \`pnpm verify\` until green (3 fix attempts max).
3. Commit (git add + git commit). Subject "<type>: <summary> (${t.id})" when the brief's "Done when" is met by code; otherwise "(${t.id}-wip)" and list what is left in the body.
4. At the TOP of docs/status/${person}.md add 3-5 lines: what you did, files outside your zone, "Human TODO:" (live runs, listening, visual checks you could not do), "Request:" for other zones.
5. Steps that need a human or live credits: do not do them; put them under Human TODO and still finish the code.
Finish your last message with exactly one line: RESULT: DONE | RESULT: PARTIAL <why> | RESULT: BLOCKED <why>`;
}

function syncDeps(before) {
  // A teammate may have added a dependency: without this, verify fails on a missing module.
  if (git("diff", "--quiet", before, "HEAD", "--", "pnpm-lock.yaml").ok) return;
  log("… lockfile changed upstream, pnpm install");
  sh("pnpm", ["install", "--frozen-lockfile"], 10 * 60e3);
}
function commitLeftovers(msg) {
  if (!dirty()) return;
  git("add", "-A");
  git("commit", "--no-verify", "-m", msg);
}
function verify() {
  log("… pnpm verify");
  return sh("pnpm", ["verify"], 20 * 60e3);
}
function park(id, why) {
  const branch = `autopilot/${person}/${id}`;
  git("branch", "-f", branch, "HEAD");
  git("reset", "--hard", "origin/main");
  skip(id, `${why} — work kept on local branch ${branch}`);
}

async function integrate(id, spent) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    git("fetch", "-q", "origin", "+refs/heads/main:refs/remotes/origin/main");
    const before = head();
    const r = git("rebase", "origin/main");
    if (!r.ok && rebasing()) {
      log(`⚔ rebase conflict on ${id}, asking the agent to resolve`);
      const files = git("diff", "--name-only", "--diff-filter=U").out.trim();
      const fix = await runAgent(
        `A rebase onto origin/main stopped with conflicts in:\n${files}\n${RULES}\nResolve each file keeping both sides' intent (teammates' work AND task ${id}), git add them, then run \`GIT_EDITOR=true git rebase --continue\` until the rebase ends. Then run pnpm verify. End with RESULT: DONE or RESULT: BLOCKED <why>.`,
        `${id}-rebase${attempt}`,
        1.5,
      );
      spent.usd += fix.cost;
      if (rebasing()) {
        git("rebase", "--abort");
        park(id, "rebase conflict not resolved");
        return false;
      }
    }
    if (!rebasing()) syncDeps(before);
    if (!verify().ok) {
      park(id, "verify failed after rebase");
      return false;
    }
    if (git("push", "origin", "HEAD:main").ok) return true;
    log("push rejected (someone pushed first), retrying");
  }
  park(id, "push kept being rejected");
  return false;
}

async function runTask(id, spent) {
  const t = registry.tasks.find((x) => x.id === id);
  const start = head();
  log(`▶ ${id} — ${t.title}`);
  const r = await runAgent(taskPrompt(t), id, taskUsd);
  spent.usd += r.cost;
  if (r.text.startsWith("AGENT ERROR")) {
    spent.errors = (spent.errors ?? 0) + 1;
    log(`✗ ${r.text.slice(0, 200)}`);
    if (spent.errors >= 2)
      throw new Error("Agent errored twice in a row (login/credits/network?). Stopping.");
    return skip(id, "agent error");
  }
  spent.errors = 0;
  const result = (r.text.match(/RESULT:\s*(DONE|PARTIAL|BLOCKED)[^\n]*/) ?? [
    "RESULT: PARTIAL (no result line)",
  ])[0];
  log(`  agent: ${result} · $${r.cost.toFixed(2)}`);
  commitLeftovers(
    result.includes("DONE") ? `feat: ${t.title} (${id})` : `wip: ${t.title} (${id}-wip)`,
  );
  if (head() === start) return skip(id, `no changes produced (${result})`);

  let v = verify();
  if (!v.ok) {
    log("✗ verify failed, one fix pass");
    const fix = await runAgent(
      `Task ${id}: \`pnpm verify\` fails. Fix the cause (never by deleting or skipping tests), commit with "fix: ... (${id}-wip)".\n${RULES}\nLast output:\n${tail(v.out)}\nEnd with RESULT: DONE or RESULT: BLOCKED <why>.`,
      `${id}-fix`,
      1.5,
    );
    spent.usd += fix.cost;
    commitLeftovers(`fix: verify (${id}-wip)`);
    v = verify();
  }
  if (!v.ok) return park(id, "pnpm verify still failing");
  if (!(await integrate(id, spent))) return;
  log(`⬆ pushed ${id}`);
  if (isDone(id)) {
    summary.push(`- ${id}: done ✅`);
    return true;
  }
  // Big tasks often end on the budget/turn cap: give each one a second run that continues the wip.
  attempts.set(id, (attempts.get(id) ?? 0) + 1);
  if (attempts.get(id) < 2 && !result.includes("BLOCKED")) {
    log(`↻ ${id} pushed as wip, it will get one more run`);
    return;
  }
  skip(id, `pushed as wip (${result})`);
}

async function main() {
  if (engine !== "dry" && !sh(engine, ["--version"], 30e3).ok) {
    console.error(`'${engine}' CLI not found.`);
    process.exit(1);
  }
  if (argv.includes("--check")) {
    const r = await runAgent(
      "Reply with exactly this line and nothing else: RESULT: DONE",
      "check",
      0.1,
    );
    console.log(
      r.text.includes("RESULT: DONE")
        ? `✅ ${engine} works unattended`
        : `❌ ${r.text.slice(0, 300)}`,
    );
    return;
  }
  if (dirty()) {
    console.error(
      "Working tree not clean. Commit/stash first (the autopilot needs a clean clone or worktree).",
    );
    process.exit(1);
  }
  if (!argv.includes("--keep-skips")) rmSync(join(dir, `skip-${person}`), { force: true });
  // Keep the Mac awake while we run (lid open + charger still needed).
  if (process.platform === "darwin")
    spawn("caffeinate", ["-ims", "-w", String(process.pid)], {
      stdio: "ignore",
      detached: true,
    }).unref();
  log(
    `autopilot ${person} · ${engine}${model ? ` ${model}` : ""} · ≤${maxTasks} tasks · ≤$${totalUsd} · log ${logFile}`,
  );

  const spent = { usd: 0 };
  let done = 0;
  const giveUpAt = Date.now() + waitHours * 3600e3;
  while (done < maxTasks && spent.usd < totalUsd) {
    git("fetch", "-q", "origin", "+refs/heads/main:refs/remotes/origin/main");
    const before = head();
    git("rebase", "-q", "origin/main");
    syncDeps(before);
    const id = nextId();
    if (!id) {
      if (Date.now() > giveUpAt) break;
      log("· nothing ready (waiting on teammates' tasks or files); checking again in 10 min");
      await sleep(10 * 60e3);
      continue;
    }
    try {
      if (await runTask(id, spent)) done++;
    } catch (e) {
      log(`■ ${e.message}`);
      summary.push(`- stopped: ${e.message}`);
      break;
    }
  }
  const report = `# Autopilot ${person} — ${new Date().toISOString().slice(0, 16)}\nDone: ${done} · spent ≈ $${spent.usd.toFixed(2)}\n${summary.join("\n")}\nLog: ${logFile}\n`;
  writeFileSync(join(dir, `summary-${person}.md`), report);
  log(`\n${report}`);
}

main();
