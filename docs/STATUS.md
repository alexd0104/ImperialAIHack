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

- 2026-11-14 — **Contracts v1 published (F2)** — Timoté. `import { … } from "@/lib/contracts"`; types are `z.infer`. Fixtures in `lib/contracts/__fixtures__/` (Frank, garden room, one Memory with 2 scenes, a bundle).
  1. Entities (`entities.ts`): `House`, `Room` with embedded `Slot` {id, x, y, scale normalised 0..1 on 1194×834, storyId?}, `Story` {object {kind glb|svg, path, jobId?}, memoryOrder}, `Memory` {answers, freeText?, sheet?, okAlone, status draft|generating|ready_for_review|approved|published}, `Asset`, `Scene` {outputs {restored?, colourised?, clip?, ambience?} as storage paths, choice? {use, colour, restored}, status pending|generating|done|fallback|failed}, `Event`. String ids, ISO date strings.
  2. `MemorySheet` = TECHNICAL.md §4.2 exactly. `MemoryAnswers` = the sheet minus freeText/okAlone/source, all optional and **without defaults** (what PATCH `/api/memories/:id` sends as `answers`; merge it, do not replace).
  3. `HouseBundle` = §4.2 exactly (`BundleRoom/Slot/Story/Memory/Scene` exported). `BundleQuery` defaults `mode` to `together`.
  4. `api.ts`: one request/response schema per route in §4.3 (`CreateHouseRequest`, `HouseDetail`, `CreateRoomRequest` union on `source`, `CreateStoryRequest` union on `object.kind`, `MemoryDetail` with assets + `SceneView` URLs + jobs, `SceneChoiceRequest`, `HouseEventRequest`, …) and `ASSET_LIMITS`. `Job` is in `jobs.ts`. **Responses to the browser use `JobView` / `AssetView`** (no fal request ids, costs, key label, storage path); `GET /api/jobs/:id` returns `JobView` with `steps[].name/status/previewUrl`. Additions beyond §4: `Slot.storyId`, `Scene.jobId`, `Event.mode`, `Room.backgroundJobId`.
  5. Errors: `{ error: { code, message, retryable } }`, 10 codes of §4.4 with default HTTP status. Route helpers in `lib/http.ts`: `ok(data, status?)`, `fail(code, message, status?, retryable?)`, `parseJson(req, Schema)` (safe-parse result, never throws).

## Requests

_(newest first: date — from → to — what)_

- 2026-11-14 — Raphaël → Timoté — The Tasks workflow rejected `(ID-wip)` PR titles although its error message recommends them (`.github/workflows/tasks.yml:47`). Fixed in `fix/shared-tasks-wip-title`; please review. Not registered as a B task because `tasks.mjs add` needs Node, which is not set up on my machine yet: please add it if you want it on the board.

## Log

### 2026-11-14 19:05 — Raphaël (design)
- Done: B2 (PR #11 review by Alexandre). New tokens `primary-strong #B4552F` / `primary-strong-hover #A44B2C` for filled controls with white text (4.9 / 5.8:1), `success-strong #426B38` for the Approved badge; avatar initials in ink; checkbox/stepper checks on `success-text`. Contrast unit test for every pair + axe (WCAG 2.2 AA) e2e on `/dev/ui`.
- In progress: PR #11 (F5) waiting for re-review.
- Blocked: nothing.
- Contract changes: none.
- Next: everyone: use `bg-primary-strong` (not `bg-primary`) behind white text. Test 4.

### 2026-11-14 18:30 — Raphaël (design)
- Done: F5. Tokens in `app/globals.css` (TECHNICAL.md §3.2 + shadcn mapping), fonts in `app/fonts.ts`, 14 components in `components/ui/` (Button, Switch, Badge, Card, Input/Textarea/Label, Checkbox, Tabs, ToggleGroup, Polaroid, IconButton 64/76/92/124, HeartButton, AvatarGroup, Stepper, SegmentedProgress). Gallery at `/dev/ui` (dev only, 404 in prod). Evidence `docs/design-evidence/f5-dev-ui.png`, deviations in `docs/DESIGN.md` §4.3.
- In progress: PR "feat(design): tokens, fonts and base components (F5)".
- Blocked: nothing. Figma MCP needs re-auth (`/mcp`) for new captures.
- Contract changes: none. New tokens: `switch-on #3F8A55`, `avatar-ring`, `shadow-house-control`, `shadow-knob`, `spacing-page`.
- Next: Test 4 (Rodin vs Trellis). Everyone: Tailwind's default palette, `text-sm/lg…` and `shadow-sm…` are gone; use our tokens (`text-16`, `text-ink/70`, `shadow-card`, `rounded-card`). Import components from `@/components/ui/*`; `cn` is in `@/lib/utils`. House screens: IconButton 76+ and HeartButton only (Switch/Checkbox/Button sm are Studio-only).

### 2026-11-14 17:55 — Raphaël (design)
- Done: SH7, 8 missing frames on Figma v5 row 4 (Questions + free text, Record a voice, Story end, loading/error/clip fallback, Order memories, Room from a photo, Sent confirmation, Studio phone). Mapped in `docs/DESIGN.md` §2, captures in `docs/design-evidence/sh7-*`.
- In progress: Q4 evidence (branch `feat/design-Q4-figma-specs`, also holds the exported SVGs).
- Blocked: F5 waits for F1. No Node/pnpm on my machine yet.
- Contract changes: none.
- Next: F5 when F1 merges. Alexandre: S4/SH5/S8 can build from frames 57-624, 58-638, 61-734, 61-982. Yasir: Story end 58-812 and clip fallback in 60-709.
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

### 2026-11-14 18:25 — Timoté (pipeline)
- Done: F2 contracts v1 on `feat/pipeline-F2-contracts`: `lib/contracts/` (entities, memory-sheet, jobs, house-bundle, api, errors, index), `lib/http.ts` (`ok`/`fail`/`parseJson`), fixtures + 45 tests. Added `zod@4`. `biome.json` now skips `public/**/*.svg` (Figma exports failed the a11y lint, so `main` CI was red).
- In progress: PR "feat(contracts): contracts v1 (F2)".
- Blocked: nothing.
- Contract changes: Contracts v1 published, see "Contract changes" above.
- Next: F3 mock layer, then F4 DB + storage. Alexandre can start S1, Yasir H1 (with F4). Raphaël: your `(ID-wip)` Request is resolved by #9.

### 2026-11-14 17:48 — Timoté (pipeline)
- Done: F1 scaffold on `feat/pipeline-F1-scaffold`. Next.js 16.4.6 (App Router, TS strict, Tailwind v4, alias `@/*`), Biome, Vitest, Playwright, husky pre-commit secret scan, every script from `AGENTS.md` §5. `pnpm verify`, `pnpm build` and `pnpm test:e2e` pass locally.
- In progress: PR "feat(pipeline): scaffold Next.js app (F1)".
- Blocked: nothing.
- Contract changes: none.
- Next: F2 contracts v1.
- Notes for everyone: run `pnpm install` once after pulling (it installs the pre-commit hook). `pnpm typecheck` runs `next typegen` first because Next 16 generates the `LayoutProps`/`PageProps` types. Biome skips Markdown and `scripts/tasks.mjs`. `pnpm demo`, `demo:check`, `seed:demo` and `export:demo` are stubs that print a TODO and exit 0. `lib/copy.ts` exists with an `app.*` namespace: add `studio.*` / `house.*` next to it. Read `AGENTS.md` §12 before writing Next.js code: this version differs from older ones, the guides are in `node_modules/next/dist/docs/`. For `pnpm test:e2e`, run `pnpm exec playwright install chromium` once.
