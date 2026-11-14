---
description: Orient yourself — branch, repo state, task board, environment — before doing anything.
---

Follow `AGENTS.md` §11.1 and report in at most 10 lines:

1. `git branch --show-current`, `git status --short`, `git log --oneline -3` — warn loudly if on `main` or on another person's branch.
2. `git fetch --quiet origin && git status -sb` — am I behind `origin/main`? Suggest `git pull --ff-only` / rebase.
3. Newest 3 entries, Requests addressed to my zone, and Contract changes from `docs/STATUS.md`.
4. `node scripts/tasks.mjs next <me>` (map `OWNER_ZONE`: pipeline=timote, studio=alexandre, house=yasir, design=raphael) and the status of the task in my current branch name (`node scripts/tasks.mjs check <ID>`).
5. Environment: `node -v`, `pnpm -v`, `test -f .env.local && echo ".env.local present"` (never print it), whether port 3000 is already in use.

End with one recommended next action. Do not edit any file.
