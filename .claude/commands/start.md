---
description: Start a task safely — checks dependencies, creates the branch, plans.
argument-hint: <task ID, e.g. S3>
---

Start task $ARGUMENTS:

1. `git checkout main && git pull --ff-only`.
2. Run `node scripts/tasks.mjs check $ARGUMENTS`. If it exits with an error, STOP: tell me which task blocks it and who owns it, then run `node scripts/tasks.mjs next` with my name (from `OWNER_ZONE`: pipeline=timote, studio=alexandre, house=yasir, design=raphael) and suggest one ready task. Do not write code.
3. If it passes, read the task's row in `FEATURES.md`, my `docs/zones/<zone>.md` and `docs/STATUS.md`. Create the branch `feat/<zone>-$ARGUMENTS-<short-topic>`.
4. Propose a plan (files, contracts used, tests). Wait for my OK before editing.
5. When finished: tests, `/verify`, reviewer agent, `/handoff`, then a PR whose title ends with `($ARGUMENTS)` so the task is marked done when merged.
