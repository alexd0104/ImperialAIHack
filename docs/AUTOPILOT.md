# AUTOPILOT.md — run your tasks while you sleep

`pnpm autopilot <you>` picks your next ready task from `docs/tasks.json` (priority order, dependencies merged, required files present), runs a coding agent **unattended and in mock mode**, then the runner itself runs `pnpm verify`, rebases on `main` and pushes. It repeats. When none of your tasks is ready (e.g. waiting for F7), it checks again every 10 minutes instead of stopping. So nobody waits for anyone who is asleep.

## One-time setup (5 min)

1. **Use a separate worktree** so the autopilot never touches the folder you work in:
   ```bash
   git fetch origin && git worktree add -b autopilot-$USER ../mh-autopilot origin/main
   cp .env.local ../mh-autopilot/.env.local      # you copy it, agents never read it
   cd ../mh-autopilot && pnpm install
   ```
2. **Pay with the API key** (optional, recommended for long nights): in *this terminal only*, `export ANTHROPIC_API_KEY=...` (never in a file in the repo). Without it, Claude Code uses your subscription.
3. **Check it works:** `pnpm autopilot <you> --check` → `✅ claude works unattended`.
4. Mac: plugged in, lid open (the runner calls `caffeinate`). Linux: `systemd-inhibit pnpm autopilot <you>`.

## Run it

| Person | Command (from `../mh-autopilot`) |
|---|---|
| Timoté (after F7 is pushed) | `pnpm autopilot timote --total-usd 25` |
| Yasir (now) | `pnpm autopilot yasir --total-usd 20` |
| Alexandre (Codex) | `pnpm autopilot alexandre --engine codex` |
| Raphaël (only the GLB task; SH8 is done by hand) | `pnpm autopilot raphael --only S14 --wait-hours 10` |

Options: `--engine claude|codex|dry` · `--model sonnet` (default; `opus` for hard tasks) · `--only P7,P8` · `--max-tasks 8` · `--task-usd 4` (per task cap) · `--total-usd 25` (night cap) · `--wait-hours 8` · `--minutes 50` (per task time cap) · `--all` (include first-round leftovers).

`--engine dry` prints the prompts without running anything: use it to see what it would do.

## What happens for each task

1. `git fetch` + rebase on `origin/main`, then `tasks.mjs next-id <you>`.
2. The agent gets a short prompt: read only its brief (`docs/FEATURES-V2.md <ID>`), implement, test, `pnpm verify`, **commit but never push**, write a handoff at the top of `docs/status/<you>.md`, finish with `RESULT: DONE | PARTIAL | BLOCKED`.
   - Claude: `claude -p` with `--permission-mode dontAsk`, a narrow tool allowlist (edit files, `pnpm`, `git add/commit/diff/log`, the task scripts), `git push`, `reset --hard` and `.env*` denied, no MCP servers, `--max-turns 90`, `--max-budget-usd`.
   - Codex: `codex exec --full-auto` (workspace sandbox).
3. The runner commits anything left over (`(ID)` if DONE, `(ID-wip)` otherwise), runs `pnpm verify`; if it fails, one short fix pass by the agent; still red → the work is kept on a **local** branch `autopilot/<you>/<ID>`, `main` is untouched, the task is skipped for the night.
4. Rebase on the latest `main`. Conflict → one agent pass to resolve it; unresolved → parked like above. Verify again, push (`HEAD:main`), retry up to 3 times if someone pushed first.
5. Task with a `(ID)` commit on main = done; otherwise it is skipped for this run and the next task starts.

Stops when: `--max-tasks` reached, night budget reached, the agent errors twice in a row (login/credits), or nothing became ready for `--wait-hours`.

## In the morning (5 min)

1. `cat .autopilot/summary-<you>.md` — done, skipped and why, money spent.
2. `docs/status/<you>.md` on main — each task's handoff, **Human TODO** (live runs, listening, visual checks) and **Requests** for other zones. Do the Human TODOs first.
3. Parked work: `git log autopilot/<you>/<ID>` in the worktree; finish it by hand or delete the branch.
4. Full logs: `.autopilot/logs/` (never committed).

## Rules the autopilot keeps

Mock mode only (`AI_MODE=mock` is forced) · `main` only gets green commits · no secrets read · no force-push · only v2 tasks and `B<n>` bug tasks unless `--all` · a task needing files (S14 → `public/objects/glb/`) waits until they land.
