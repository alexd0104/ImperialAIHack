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

### Template
```
### <YYYY-MM-DD HH:MM> — <name> (<zone>)
- Done:
- In progress:
- Blocked:
- Contract changes:
- Next:
```

### 2026-11-14 17:48 — Timoté (pipeline)
- Done: F1 scaffold on `feat/pipeline-F1-scaffold`. Next.js 16.4.6 (App Router, TS strict, Tailwind v4, alias `@/*`), Biome, Vitest, Playwright, husky pre-commit secret scan, every script from `AGENTS.md` §5. `pnpm verify`, `pnpm build` and `pnpm test:e2e` pass locally.
- In progress: PR "feat(pipeline): scaffold Next.js app (F1)".
- Blocked: nothing.
- Contract changes: none.
- Next: F2 contracts v1.
- Notes for everyone: run `pnpm install` once after pulling (it installs the pre-commit hook). `pnpm typecheck` runs `next typegen` first because Next 16 generates the `LayoutProps`/`PageProps` types. Biome skips Markdown and `scripts/tasks.mjs`. `pnpm demo`, `demo:check`, `seed:demo` and `export:demo` are stubs that print a TODO and exit 0. `lib/copy.ts` exists with an `app.*` namespace: add `studio.*` / `house.*` next to it. Read `AGENTS.md` §12 before writing Next.js code: this version differs from older ones, the guides are in `node_modules/next/dist/docs/`. For `pnpm test:e2e`, run `pnpm exec playwright install chromium` once.
