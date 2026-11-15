---
description: Check that the House demo mode loads and plays offline.
---

Run `pnpm demo:check` (production build, `HOUSE_DEMO_MODE=true`, all non-localhost requests blocked; asserts Choose a room → Room → Object opens → first Memory playing with audio).

- If it passes, report it in one line.
- If it fails, show the failing assertion and the most likely cause (check `TECHNICAL.md` §10 Troubleshooting first). Fix it only if the cause is in my zone; otherwise add it under "Requests" in `docs/STATUS.md`.
