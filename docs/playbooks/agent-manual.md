# Agent operating manual — memorAI

Full version of the short rules in `AGENTS.md` §11. Read a subsection only when you need it (e.g. `grep -n "^### " docs/playbooks/agent-manual.md`).

### 1 Orient yourself first (every session, before any edit)

1. **Where am I?** `git branch --show-current`, `git status --short`, `git log --oneline -3`. Work on `main` (no PRs during the hackathon). Feature branches are optional.
2. **Who am I?** Your zone is the human's `OWNER_ZONE` (pipeline=Timoté, studio=Alexandre, house=Yasir, design=Raphaël). If unknown, ask once.
3. **What is the state?** `git pull --ff-only` (or `git fetch && git rebase origin/main` on a branch), read `docs/STATUS.md` (newest entries + Requests + Contract changes), run `node scripts/tasks.mjs board` or `next <person>`.
4. **Is my task allowed?** `node scripts/tasks.mjs check <ID>`. Blocked → do not start; pick a ready task.
5. **Is the environment sane?** `node -v` (≥ 24), `pnpm -v`, `test -f .env.local && echo ok` (never print it), `AI_MODE` should be `mock` unless the human said otherwise. Is a dev server already on port 3000? Reuse it instead of starting a second one.
6. **Read before writing:** the task row in `FEATURES.md`, your `docs/zones/<zone>.md`, the contracts you will use in `lib/contracts/`, and the relevant `TECHNICAL.md` section. Then propose a short plan.

### 2 While working

- Stay in your zone. A one-line fix elsewhere is acceptable if it unblocks you; list it in the PR. Anything bigger → a Request in `docs/STATUS.md`.
- Mock first: everything must work with `AI_MODE=mock`. Never spend live credits to debug UI.
- Small steps: make it work for one case, run it, then generalise. Commit often on your branch.
- Run what you build: `pnpm verify` after each meaningful change; open the page or call the route (`curl`) to see it really works; for House changes run `pnpm demo:check`.
- Check your own diff before committing (`git diff`): no secrets, no debug logs, no unrelated reformatting, no files from other zones by accident.
- Never weaken a guardrail to get unblocked (skip a hook, remove a fallback, hard-code a key, disable a test, edit `docs/tasks.json` deps to bypass a block).

### 3 When something goes wrong (troubleshooting)

1. Check `TECHNICAL.md` §10 Troubleshooting first; most expected failures are listed with their fix.
2. Reproduce with the smallest case, read the full error, form one hypothesis at a time.
3. **Two-strikes rule:** if the same approach fails twice, stop retrying it. Change approach, or report to the human what you tried and what you observed.
4. Do not "fix" by deleting tests, catching and ignoring errors, or switching to live mode.
5. If the cause is in another zone or a contract: write a Request in `docs/STATUS.md` with the exact error, file:line, and your proposed fix; work around it with a mock meanwhile.
6. Once fixed, if the problem could hit someone else, add a row to `TECHNICAL.md` §10 (symptom · cause · fix) in the same PR.

### 4 Adding tasks you discover (bugs, missing pieces, troubleshooting work)

You will find work that is not in `FEATURES.md`. Do not silently grow your current PR; register it:

```bash
node scripts/tasks.mjs add --title "Safari: audio does not start on first tap" --owner yasir --deps H6 --note "Howler ctx suspended; see STATUS 23:10"
node scripts/tasks.mjs lint
```

- IDs are assigned automatically as `B1`, `B2`, … (priority `FIX`). Owner = the zone that owns the files to change, not necessarily you.
- If you fix it yourself now (small, in your zone): add the task, include `docs/tasks.json` in your PR, and put the ID in the PR title, e.g. `fix(house): unlock audio on first tap (B1)`.
- If someone else must do it: open a tiny PR `chore(tasks): add B1` with only `docs/tasks.json`, and add a line under "Requests" in `docs/STATUS.md` mentioning the owner.
- Duplicate ID after a rebase (two people added B5): keep the other one, rerun `add` for yours, `lint`, push.
- New tasks never block MUST work unless the human decides so; set `deps` only to what is truly required.

### 5 Finishing

- Acceptance criteria met, `pnpm verify` green, reviewer agent (Claude Code) or self-review (Codex) done.
- `docs/STATUS.md` handoff written (`/handoff`), including anything you learned that others need.
- Commit subject ends with `(<ID>)` so the board marks it done; note files outside your zone and contract changes in `docs/STATUS.md`.
- If you stop mid-task: push with a `(<ID>-wip)` commit subject (keep `main` runnable), and say in STATUS exactly where you stopped and what is next.

### 6 Token hygiene (every agent, every session)

Context is resent on every step, so big reads and noisy output make each task slow and expensive.

- `/clear` (or a new Codex thread) between tasks; `/compact` when the context is past ~60 %.
- Read docs **by section**: `grep -n '^## \|^### ' TECHNICAL.md`, then read only the line range you need. Same for `docs/DESIGN.md` (grep the frame name) and `FEATURES.md` (grep the task ID).
- `docs/STATUS.md`: read the top sections and the 3 newest log entries only. Never read `docs/status-archive.md` unless asked.
- Tasks: use `node scripts/tasks.mjs next|check|board`; do not open `docs/tasks.json` unless you edit it.
- Keep command output short: `| tail -40`, `git diff --stat`, `git log --oneline -5`; quiet test reporters. Never open `pnpm-lock.yaml`, build artefacts, `node_modules/` listings or large media.
- Next.js docs in `node_modules/next/dist/docs/` (§12): `grep -rl <topic>` to find **one** guide and read only that file.
- Pipeline sessions do not need the Figma MCP server: disable it (`/mcp`) to save its tool definitions on every request.
- Use a lighter model for routine work (`/model sonnet`); keep the strongest model for hard tasks. No subagents unless asked.

