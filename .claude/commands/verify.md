---
description: Run typecheck, lint and unit tests; fix what fails in your zone.
---

Run `pnpm verify` (typecheck + Biome + Vitest).

- If everything passes, say so in one line.
- If something fails: fix failures in files of my zone (`OWNER_ZONE`, see `docs/zones/`). For failures in another zone, do not edit; list them with file:line and add a line under "Requests" in `docs/STATUS.md`.
- Re-run until green or until only other-zone failures remain. Report the final result.
