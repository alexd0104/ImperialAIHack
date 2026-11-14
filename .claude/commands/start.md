---
description: Start a task safely — checks dependencies, reads only what it needs, plans.
argument-hint: <task ID, e.g. S3>
---

Start task $ARGUMENTS (hackathon mode: work on `main`, push directly).

1. `git pull --rebase --quiet`.
2. `node scripts/tasks.mjs check $ARGUMENTS`. If it fails, STOP: say which task blocks it and who owns it, run `node scripts/tasks.mjs next <me>` and suggest one ready task. No code.
3. Read only what the task needs:
   - its row: `grep -n "| $ARGUMENTS |" FEATURES.md`
   - my zone doc `docs/zones/<zone>.md` (short)
   - the TECHNICAL.md sections it references, by heading: `grep -n '^## \|^### ' TECHNICAL.md` then read only those line ranges
   - the contracts it uses in `lib/contracts/` (only the relevant files)
   - for UI: the one Figma frame listed in `docs/DESIGN.md` (`grep -n` the frame name), not the whole file
4. Propose a short plan (files, contracts, tests). Wait for my OK.
5. Build in small steps; keep command output short (`| tail -40`, `git diff --stat`); never open `pnpm-lock.yaml`.
6. Finish: `pnpm verify`, `/handoff`, commit with subject ending `($ARGUMENTS)`, `git pull --rebase && git push`.
