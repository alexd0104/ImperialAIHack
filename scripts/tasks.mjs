#!/usr/bin/env node
// Task guardrail for memorAI. No dependencies: runs before the app is scaffolded.
//
//   node scripts/tasks.mjs check <ID>        exit 1 if a hard dependency is not merged on main
//   node scripts/tasks.mjs board             print the task board (markdown) to stdout
//   node scripts/tasks.mjs next [person]     tasks you can start now (deps done, not started)
//   node scripts/tasks.mjs id-from <text>    print the first task ID found in a branch name / title
//   node scripts/tasks.mjs add --title "..." --owner <person> [--deps A,B] [--soft C] [--note "..."]
//                                            append a new B<n> task (bug / troubleshooting / missing piece)
//   node scripts/tasks.mjs next-id <person>  first ready task by order (deps merged, required files present, not skipped)
//   node scripts/tasks.mjs lint              validate docs/tasks.json (duplicate IDs, unknown deps/owners, cycles)
//
// Options: --base <ref> (default origin/main), --no-fetch, --prs <file.json> (open PRs, from gh),
//          --merged <file.json> (merged PRs, from gh), --out <file>
//
// DONE = a commit reachable from the base ref has "(ID)" in its subject or body,
// e.g. "feat(studio): memory bank (S3)" or a merge commit whose body is the PR title.
// "(S3-wip)" does not count.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? def : args[i + 1];
};
const flag = (name) => args.includes(`--${name}`);
const base = opt("base", "origin/main");

const registry = JSON.parse(readFileSync(join(root, "docs/tasks.json"), "utf8"));
const people = registry.people;
const tasks = registry.tasks;
const byId = new Map(tasks.map((t) => [t.id, t]));
const ID_RE = /\b(SH\d+|[FPSHQCB]\d+)\b/;

const sh = (c) => {
  try {
    return execSync(c, { cwd: root, stdio: ["ignore", "pipe", "ignore"], timeout: 15000 }).toString();
  } catch {
    return "";
  }
};

function idsInParens(text) {
  const found = new Set();
  for (const m of text.matchAll(/\(([^)]*)\)/g)) {
    for (const tok of m[1].split(/[\s,;/]+/)) if (byId.has(tok)) found.add(tok);
  }
  return found;
}

function loadDone() {
  if (!flag("no-fetch")) sh("git fetch --quiet origin main");
  const done = new Map(); // id -> { by, at, ref }
  const merged = opt("merged") && existsSync(opt("merged")) ? JSON.parse(readFileSync(opt("merged"), "utf8")) : [];
  for (const pr of merged) {
    for (const id of idsInParens(pr.title ?? "")) {
      if (!done.has(id)) done.set(id, { by: pr.author?.login ? `@${pr.author.login}` : "?", at: (pr.mergedAt ?? "").slice(0, 16).replace("T", " "), ref: `#${pr.number}` });
    }
  }
  const log = sh(`git log ${base} --format=%h%x1f%an%x1f%aI%x1f%s%x1f%b%x1e`);
  for (const rec of log.split("\x1e")) {
    const [hash, author, date, subject = "", body = ""] = rec.trim().split("\x1f");
    if (!hash) continue;
    for (const id of idsInParens(`${subject}\n${body}`)) {
      if (!done.has(id)) done.set(id, { by: author, at: (date ?? "").slice(0, 16).replace("T", " "), ref: hash });
    }
  }
  return done;
}

function loadInProgress(done) {
  const wip = new Map(); // id -> { by, where }
  const prs = opt("prs") && existsSync(opt("prs")) ? JSON.parse(readFileSync(opt("prs"), "utf8")) : [];
  for (const pr of prs) {
    const m = (pr.headRefName ?? "").match(ID_RE) || (pr.title ?? "").match(ID_RE);
    if (m && !done.has(m[1])) wip.set(m[1], { by: pr.author?.login ? `@${pr.author.login}` : "?", where: `PR #${pr.number}` });
  }
  for (const line of sh("git branch -r --format=%(refname:short)").split("\n")) {
    const branch = line.trim().replace(/^origin\//, "");
    const m = branch.match(/^(feat|fix)\/[a-z]+-(SH\d+|[FPSHQCB]\d+)\b/);
    if (m && !done.has(m[2]) && !wip.has(m[2])) wip.set(m[2], { by: "", where: `branch ${branch}` });
  }
  return wip;
}

const who = (key) => people[key]?.name ?? key;
const gh = (key) => (people[key]?.github ? `@${people[key].github}` : "");

const filesMissing = (task) =>
  task.requiresFiles && !(existsSync(join(root, task.requiresFiles)) && readdirSync(join(root, task.requiresFiles)).length > 0)
    ? task.requiresFiles
    : null;

function skipped(person) {
  const f = join(root, ".autopilot", `skip-${person}`);
  return existsSync(f) ? readFileSync(f, "utf8").split(/\s+/).filter(Boolean) : [];
}

function status(task, done, wip) {
  if (done.has(task.id)) return "done";
  const missing = task.deps.filter((d) => !done.has(d));
  if (wip.has(task.id)) return "wip";
  return missing.length || filesMissing(task) ? "blocked" : "ready";
}

function check(id) {
  const task = byId.get(id);
  if (!task) {
    console.error(`Unknown task ID "${id}". See docs/tasks.json / FEATURES.md.`);
    process.exit(2);
  }
  const done = loadDone();
  if (done.has(id)) {
    console.log(`ℹ️  ${id} (${task.title}) is already DONE on main (${done.get(id).by}, ${done.get(id).ref}). Make sure you are not redoing it.`);
  }
  const missing = task.deps.filter((d) => !done.has(d));
  const softMissing = task.soft.filter((d) => !done.has(d));
  for (const d of softMissing) {
    const t = byId.get(d);
    console.log(`⚠️  Soft dependency ${d} (${t.title}, ${who(t.owner)}) is not merged yet. You can start, but use mocks/placeholders and rebase later.`);
  }
  if (filesMissing(task)) {
    console.error(`⛔ Cannot start ${id} (${task.title}) yet: waiting for files in ${task.requiresFiles}/ (added by the team).`);
    process.exit(1);
  }
  if (missing.length) {
    console.error(`⛔ Cannot start ${id} (${task.title}) yet. Waiting for:`);
    for (const d of missing) {
      const t = byId.get(d);
      console.error(`   - ${d} ${t.title} — owner ${who(t.owner)} ${gh(t.owner)}`);
    }
    console.error("Pick another task: node scripts/tasks.mjs next " + task.owner);
    process.exit(1);
  }
  console.log(`✅ ${id} (${task.title}) can start: all hard dependencies are merged on main.`);
}

function board() {
  const done = loadDone();
  const wip = loadInProgress(done);
  const icon = { done: "✅", wip: "🔄", ready: "🟢", blocked: "🔒" };
  const lines = [];
  const total = tasks.filter((t) => t.priority === "MUST");
  const mustDone = total.filter((t) => done.has(t.id)).length;
  const bar = (n, d) => "█".repeat(Math.round((n / Math.max(d, 1)) * 20)).padEnd(20, "░");
  lines.push("# 📋 memorAI task board", "");
  lines.push(`_Updated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC from \`${base}\`. Generated by \`scripts/tasks.mjs\`; edit \`docs/tasks.json\` to change tasks._`, "");
  lines.push(`**MUST progress:** \`${bar(mustDone, total.length)}\` ${mustDone}/${total.length}`, "");
  lines.push("Legend: ✅ done · 🔄 in progress · 🟢 ready to start · 🔒 blocked by a dependency", "");
  for (const [key, p] of Object.entries(people)) {
    const mine = tasks.filter((t) => t.owner === key);
    const n = mine.filter((t) => done.has(t.id)).length;
    lines.push(`## ${p.name} — ${p.zone} (@${p.github}) · ${n}/${mine.length}`, "");
    lines.push("| | ID | Task | Priority | Status |", "|---|---|---|---|---|");
    for (const t of mine) {
      const s = status(t, done, wip);
      let detail = "";
      if (s === "done") detail = `done by ${done.get(t.id).by} · ${done.get(t.id).at} · ${done.get(t.id).ref}`;
      if (s === "wip") detail = `in progress ${wip.get(t.id).by} · ${wip.get(t.id).where}`;
      if (s === "ready") detail = "ready";
      if (s === "blocked") detail = "waiting for " + t.deps.filter((d) => !done.has(d)).map((d) => `${d} (${who(byId.get(d).owner)})`).join(", ");
      lines.push(`| ${icon[s]} | ${t.id} | ${t.title} | ${t.priority} | ${detail} |`);
    }
    lines.push("");
  }
  const out = lines.join("\n");
  if (opt("out")) writeFileSync(opt("out"), out);
  else console.log(out);
}

function next(person) {
  const done = loadDone();
  const wip = loadInProgress(done);
  const list = tasks.filter((t) => (!person || t.owner === person) && status(t, done, wip) === "ready");
  if (!list.length) return console.log("Nothing ready right now. Check `node scripts/tasks.mjs board`.");
  for (const t of list) console.log(`🟢 ${t.id}  ${t.title}  (${t.priority}, ${who(t.owner)})`);
}

function nextId(person) {
  const done = loadDone();
  const skip = new Set(skipped(person));
  const only = opt("only", "") ? opt("only", "").split(",") : null;
  const order = (t) => (typeof t.order === "number" ? t.order : 1000);
  const ready = tasks
    .filter((t) => (only ? only.includes(t.id) : t.owner === person) && !done.has(t.id) && !skip.has(t.id))
    .filter((t) => t.deps.every((d) => done.has(d)) && !filesMissing(t))
    .sort((a, b) => order(a) - order(b));
  if (ready.length) console.log(ready[0].id);
}

function lint() {
  const errors = [];
  const seen = new Set();
  for (const t of tasks) {
    if (seen.has(t.id)) errors.push(`duplicate id ${t.id}`);
    seen.add(t.id);
    if (!ID_RE.test(t.id)) errors.push(`invalid id ${t.id}`);
    if (!people[t.owner]) errors.push(`${t.id}: unknown owner ${t.owner}`);
    for (const d of [...(t.deps ?? []), ...(t.soft ?? [])]) if (!byId.has(d)) errors.push(`${t.id}: unknown dependency ${d}`);
  }
  const visiting = new Set();
  const visited = new Set();
  const visit = (id, path) => {
    if (visiting.has(id)) return errors.push(`cycle: ${[...path, id].join(" -> ")}`);
    if (visited.has(id) || !byId.has(id)) return;
    visiting.add(id);
    for (const d of byId.get(id).deps ?? []) visit(d, [...path, id]);
    visiting.delete(id);
    visited.add(id);
  };
  for (const t of tasks) visit(t.id, []);
  if (errors.length) {
    console.error("docs/tasks.json is invalid:\n - " + errors.join("\n - "));
    process.exit(1);
  }
  console.log(`docs/tasks.json OK (${tasks.length} tasks).`);
}

function add() {
  const title = opt("title");
  const owner = opt("owner");
  if (!title || !people[owner]) {
    console.error('Usage: add --title "..." --owner <timote|alexandre|yasir|raphael> [--deps A,B] [--soft C] [--note "..."]');
    process.exit(2);
  }
  const list = (s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : []);
  const n = Math.max(0, ...tasks.filter((t) => /^B\d+$/.test(t.id)).map((t) => Number(t.id.slice(1)))) + 1;
  const task = { id: `B${n}`, title, owner, priority: "FIX", deps: list(opt("deps")), soft: list(opt("soft")), note: opt("note", "") };
  for (const d of [...task.deps, ...task.soft]) if (!byId.has(d)) { console.error(`Unknown dependency ${d}`); process.exit(2); }
  registry.tasks.push(task);
  writeFileSync(join(root, "docs/tasks.json"), JSON.stringify(registry, null, 2) + "\n");
  console.log(`Added ${task.id}: ${title} (owner ${who(owner)}). Commit docs/tasks.json in a small PR "chore(tasks): add ${task.id}" or with your fix.`);
}

if (cmd === "check") check(args[1]);
else if (cmd === "lint") lint();
else if (cmd === "add") add();
else if (cmd === "board") board();
else if (cmd === "next-id") nextId(args[1]);
else if (cmd === "next") next(args[1] && !args[1].startsWith("--") ? args[1] : undefined);
else if (cmd === "id-from") {
  const m = (args[1] ?? "").match(ID_RE);
  if (m) console.log(m[1]);
} else {
  console.log("Usage: node scripts/tasks.mjs check <ID> | board | next [person] | id-from <text> | add --title ... --owner ... | lint");
  process.exit(2);
}
