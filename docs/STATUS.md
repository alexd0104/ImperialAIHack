# STATUS.md — memorAI

Async coordination. **Append only; never edit someone else's lines.** Newest entry on top of each section. Claude Code: `/handoff`. Codex: copy the format by hand.

## Decisions log

- 2026-11-14 — Stack, architecture, data, AI models and team zones validated (see `TECHNICAL.md`).
- 2026-11-14 — Product name: **memorAI**. House keeps Figma's "Choose a room" entry. Tapping an Object opens polaroids; tap one or the first Memory auto-starts after 3 s.
- 2026-11-14 — Default room backgrounds = Figma SVG scenes (no generation). Library Objects = Figma SVG illustrations.
- 2026-11-14 — fal concurrency is 2 per account: one key per developer; demo key only for final content.

## Test results

| # | Test | Result | Decision | Who |
|---|---|---|---|---|
| 1 | GLB on room SVG | | | Yasir |
| 2 | Memory chain fidelity (Kling vs Veo) | | | Timoté |
| 3 | Room from real photo | | | Timoté |
| 4 | Rodin vs Trellis | | | Raphaël |
| 5 | Time + cost per Memory | | | Timoté |

## Contract changes

_(newest first: date — what changed — who)_

## Requests

_(newest first: date — from → to — what)_

## Log

### 2026-11-14 17:45 — Raphaël (design)
- Done: exported logo, 3 room backgrounds, 9 Objects from Figma v5 as SVG via the MCP server → `public/brand`, `public/rooms`, `public/objects` (cleaned of exporter frame rects). Component specs for F5 read via MCP and logged in `docs/DESIGN.md` §4.1; first 3 Figma captures in `docs/design-evidence/`.
- In progress: Q4 (evidence log, ongoing).
- Blocked: F5 waits for F1 (scaffold). Local machine has no Node/pnpm yet.
- Contract changes: none. Token additions planned in F5: `--shadow-house-control`, `--color-avatar-ring` (`#FFF8EE`).
- Next: F5 as soon as F1 merges; test 4 (Rodin vs Trellis) by hand in the fal playground.

### Template
```
### <YYYY-MM-DD HH:MM> — <name> (<zone>)
- Done:
- In progress:
- Blocked:
- Contract changes:
- Next:
```
