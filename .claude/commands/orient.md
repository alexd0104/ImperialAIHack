---
description: Orient yourself — branch, repo state, task board, environment — before doing anything. Cheap on tokens.
---

Follow `AGENTS.md` §11 and report in at most 10 lines. Keep every command's output short; do not open whole docs.

1. `git branch --show-current && git status --short | head -20 && git log --oneline -3`
2. `git fetch --quiet origin && git status -sb | head -1` — behind `origin/main`? Suggest `git pull --rebase`.
3. STATUS, top only: `sed -n '/^## Contract changes/,/^## Log/p' docs/STATUS.md | head -60` (contract changes + requests), then the 3 newest log entries: `awk '/^### 20/{c++} c>=1 && c<=3' docs/STATUS.md | head -40`. Never read `docs/status-archive.md`.
4. `node scripts/tasks.mjs next <me>` (map `OWNER_ZONE`: pipeline=timote, studio=alexandre, house=yasir, design=raphael). Do not open `docs/tasks.json`.
5. Environment: `node -v`, `pnpm -v`, `pnpm -s env:check 2>/dev/null | tail -5 || test -f .env.local && echo ".env.local present"` (never print values), `lsof -i :3000 -sTCP:LISTEN | tail -1` (dev server already running?).

End with one recommended next action. Do not edit any file.
