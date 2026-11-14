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

- 2026-11-14 — **`GenerationCacheEntry` added (F4)** — Timoté. `lib/contracts/jobs.ts`: {id, key, model, outputPath, costUsd, createdAt}, the `generation_cache` document of TECHNICAL.md §6. Additive only.
- 2026-11-14 — **Contracts v1 published (F2)** — Timoté. `import { … } from "@/lib/contracts"`; types are `z.infer`. Fixtures in `lib/contracts/__fixtures__/` (Frank, garden room, one Memory with 2 scenes, a bundle).
  1. Entities (`entities.ts`): `House`, `Room` with embedded `Slot` {id, x, y, scale normalised 0..1 on 1194×834, storyId?}, `Story` {object {kind glb|svg, path, jobId?}, memoryOrder}, `Memory` {answers, freeText?, sheet?, okAlone, status draft|generating|ready_for_review|approved|published}, `Asset`, `Scene` {outputs {restored?, colourised?, clip?, ambience?} as storage paths, choice? {use, colour, restored}, status pending|generating|done|fallback|failed}, `Event`. String ids, ISO date strings.
  2. `MemorySheet` = TECHNICAL.md §4.2 exactly. `MemoryAnswers` = the sheet minus freeText/okAlone/source, all optional and **without defaults** (what PATCH `/api/memories/:id` sends as `answers`; merge it, do not replace).
  3. `HouseBundle` = §4.2 exactly (`BundleRoom/Slot/Story/Memory/Scene` exported). `BundleQuery` defaults `mode` to `together`.
  4. `api.ts`: one request/response schema per route in §4.3 (`CreateHouseRequest`, `HouseDetail`, `CreateRoomRequest` union on `source`, `CreateStoryRequest` union on `object.kind`, `MemoryDetail` with assets + `SceneView` URLs + jobs, `SceneChoiceRequest`, `HouseEventRequest`, …) and `ASSET_LIMITS`. `Job` is in `jobs.ts`. **Responses to the browser use `JobView` / `AssetView`** (no fal request ids, costs, key label, storage path); `GET /api/jobs/:id` returns `JobView` with `steps[].name/status/previewUrl`. Additions beyond §4: `Slot.storyId`, `Scene.jobId`, `Event.mode`, `Room.backgroundJobId`.
  5. Errors: `{ error: { code, message, retryable } }`, 10 codes of §4.4 with default HTTP status. Route helpers in `lib/http.ts`: `ok(data, status?)`, `fail(code, message, status?, retryable?)`, `parseJson(req, Schema)` (safe-parse result, never throws).

## Requests

_(newest first: date — from → to — what)_

- 2026-11-14 — Raphaël → Timoté — `/studio/login` (F6) a11y: when the error shows, set `aria-invalid` on the password `Input` and `aria-describedby` → the `role=alert` paragraph id (`app/studio/login/LoginForm.tsx:44-55`). `Input` already turns its border `danger` on `aria-invalid`. Axe passes otherwise (DESIGN.md §7).
- ~~2026-11-14 — Raphaël → Timoté — The Tasks workflow rejected `(ID-wip)` PR titles although its error message recommends them (`.github/workflows/tasks.yml:47`). Fixed in `fix/shared-tasks-wip-title`; please review. Not registered as a B task because `tasks.mjs add` needs Node, which is not set up on my machine yet: please add it if you want it on the board.~~ Resolved by #9.

## Log

### 2026-11-14 19:30 — Timoté (pipeline)
- Done: F3 mock layer. `lib/ai/`: `models.ts` (every §7.1 model: id, defaults, price, output path; unverified ones marked `// TODO verify`, Kling ID awaits Test 2), `fal.ts` (`getFal()` → `FalGateway` {upload, submit, status, result} + `extractOutput()`; live = fal queue API + 1 h lifecycle header; mock = 2–5 s delay, `MOCK_FAIL_RATE`, fixtures from `mocks/fal/`), `claude.ts` + `prompt-compiler.ts` + `prompt-templates.ts` (never throws, template fallback, default negative prompt + "no music" + family's colour choice enforced). `mocks/` = 10 fal fixtures, Claude fixture, generated placeholder media (248 KB, no photos). New deps: `@fal-ai/client`, `@anthropic-ai/sdk` (AI integrations, AGENTS.md §4), `server-only` already added by F4. 180 tests green.
- In progress: nothing.
- Blocked: nothing.
- Contract changes: none (`CompiledPrompts` schema lives in `lib/ai/prompt-types.ts`, pipeline-only).
- Next: P1 job engine. Notes for everyone: mock outputs are `file://…/mocks/media/*` URLs, so the engine's download step copies them from disk (`isMockUrl`). Mock request IDs carry their own state and survive a dev-server restart. Errors are `AiRequestError { code, retryable }` in both modes. Decision: live Claude uses structured outputs instead of a forced tool call, because forced `tool_choice` is rejected by `claude-sonnet-5-5` (our quality fallback). Details in TECHNICAL.md §7.4. Live smoke test of the compiler still to do (P3).

### 2026-11-14 19:25 — Timoté (pipeline)
- Done: F4. `lib/db` (`import { db, findHouseByToken, deleteHouseDocuments } from "@/lib/db"`): client singleton on `globalThis`, env read lazily; `db.houses|rooms|stories|memories|assets|scenes|jobs|events|generationCache` with `insert/findById/findOne/find/update/deleteById/deleteMany/raw`, all parsed with the contracts. `lib/storage`: `saveFile(houseId, name, bytes|stream) → {path, bytes, sha256}`, `statFile`, `openReadStream`, `sha256File`, `deleteHouseFolder`, `contentTypeFor`, traversal-safe. `GET/HEAD /api/files/<houseId>/...` with Range (206/416), access = Studio session or `?t=<House token>` of the House owning the folder. `pnpm db:ping`, `pnpm db:indexes`. Checked on real Atlas (`mh_timote`): ping, the 5 indexes, typed insert/read/update/delete OK.
- In progress: nothing.
- Blocked: nothing.
- Contract changes: `GenerationCacheEntry` (additive).
- Next: P1 job engine.
- Notes for everyone: **in Mongo only `_id` is an ObjectId; foreign keys (`houseId`, `roomId`…) stay strings**, dates are BSON `Date`, so query with `{ roomId }` directly. Ids passed to `findById` that are not 24-hex return `null` (→ 404). Stored paths are relative (`<houseId>/...`); the API turns them into `/api/files/<path>` (House adds `?t=<token>`). In `HOUSE_DEMO_MODE` the token in `DEMO_HOUSE_TOKEN` (must be set, no default) opens any file, since there is no DB to look up the House. Files are cached 5 min (`private`). Run `pnpm env:check`, then `pnpm db:ping` and `pnpm db:indexes` once for your own DB. `.gitignore` now anchors `/storage/` and `/demo-assets/` (the old `storage/` pattern also ignored `lib/storage/`). Scripts that need the DB (Raphaël: `seed-demo`) use the raw driver like `scripts/db-ping.mts`: plain Node cannot load `lib/db` (`server-only`, `@/` alias); see TECHNICAL.md §10.

### 2026-11-14 19:03 — Alexandre (studio)
- Done: Reconciled the concurrent push on #12: remote 06fdc5c includes the same main integration and application code already validated locally (143 unit tests, production build and 5 browser tests). Its only difference from the local resolution is the chronological order of handoff entries; retained the remote version.
- In progress: Final GitHub verification and merge of #12 at the latest remote head, per the user's explicit request.
- Blocked: No remaining code or merge conflict. Required checks need to report on the new resolved head.
- Contract changes: None; this finalization changes only this shared handoff.
- Next: Merge #12 once required checks report success, then confirm the open PR list is empty. No force-push or direct push to main.

### 2026-11-14 19:20 — Raphaël (design)
- Done: B2 (contrast fix) shipped inside the F5 merge 9ab8f45; this entry marks it on the board. Q4: DESIGN.md §8 accessibility notes (contrast table, targets, focus, motion) and §6 MCP note for F5.
- In progress: Q4 (ongoing: a Figma-vs-code row per screen as Studio/House screens land).
- Blocked: Figma MCP needs re-auth for new captures and Figma Variables.
- Contract changes: none.
- Next: test 4 (Rodin vs Trellis); Figma Variables for the tokens once re-authed.

### 2026-11-14 19:05 — Raphaël (design)
- Done: B2 (PR #11 review by Alexandre). New tokens `primary-strong #B4552F` / `primary-strong-hover #A44B2C` for filled controls with white text (4.9 / 5.8:1), `success-strong #426B38` for the Approved badge; avatar initials in ink; checkbox/stepper checks on `success-text`. Contrast unit test for every pair + axe (WCAG 2.2 AA) e2e on `/dev/ui`.
- In progress: PR #11 (F5) waiting for re-review.
- Blocked: nothing.
- Contract changes: none.
- Next: everyone: use `bg-primary-strong` (not `bg-primary`) behind white text. Test 4.

### 2026-11-14 18:58 — Alexandre (studio)
- Done: F6 integration validated after resolving `lib/copy.ts` and `docs/STATUS.md` conflicts with main. Mock `pnpm verify` passes (143 tests), production build passes, and all 5 Playwright tests pass including the shared UI axe check. B3/B4 regressions pass; sign-in uses F5 primitives and readable type tokens.
- In progress: Push the tested merge commit to the existing PR #12 branch, approve and merge at that exact commit. #13 has been merged; #11 was already merged.
- Blocked: None locally; awaiting the final GitHub checks and merge result.
- Contract changes: None. Shared files touched for integration: `lib/copy.ts` and `docs/STATUS.md`; application adjustments are within `app/studio/login/`. Existing main changes were preserved without force-push.
- Next: Confirm #12 merged and the open PR list is empty. S1 can be rechecked once F6 is on main; B1 remains a separate tracked follow-up.

### 2026-11-14 18:55 — Alexandre (studio)
- Done: User requested accepting all remaining PRs and resolving conflicts. #11 was already merged with its B2 contrast fix; merged #13 (task registry). Integrated main into #12, preserving both `copy.ui` and `copy.auth`/`copy.studio`, and all design/pipeline handoff entries. Studio sign-in now uses the merged Button/Input/Label primitives and current type tokens.
- In progress: Verify/build/browser checks of the combined F5 + F6 tree, then approve and merge #12 (F6, B3, B4). Reviewed the author's fixes: shared API errors, 422 validation responses, minimum signing-secret length enforced during both issuance and verification, and proxy regression coverage.
- Blocked: None after conflict resolution; integration validation pending.
- Contract changes: None. Outside Studio: conflict resolution in shared `lib/copy.ts` and this handoff; upstream main changes retained, including AGENTS.md. No pipeline behavior or shared component source changed by this integration; no `.env*` file read.
- Next: Complete checks, push the merge commit to the existing #12 branch without force-push, approve the tested commit and merge it. Confirm no PR remains open and recheck S1 readiness.

### 2026-11-14 18:30 — Raphaël (design)
- Done: F5. Tokens in `app/globals.css` (TECHNICAL.md §3.2 + shadcn mapping), fonts in `app/fonts.ts`, 14 components in `components/ui/` (Button, Switch, Badge, Card, Input/Textarea/Label, Checkbox, Tabs, ToggleGroup, Polaroid, IconButton 64/76/92/124, HeartButton, AvatarGroup, Stepper, SegmentedProgress). Gallery at `/dev/ui` (dev only, 404 in prod). Evidence `docs/design-evidence/f5-dev-ui.png`, deviations in `docs/DESIGN.md` §4.3.
- In progress: PR "feat(design): tokens, fonts and base components (F5)".
- Blocked: nothing. Figma MCP needs re-auth (`/mcp`) for new captures.
- Contract changes: none. New tokens: `switch-on #3F8A55`, `avatar-ring`, `shadow-house-control`, `shadow-knob`, `spacing-page`.
- Next: Test 4 (Rodin vs Trellis). Everyone: Tailwind's default palette, `text-sm/lg…` and `shadow-sm…` are gone; use our tokens (`text-16`, `text-ink/70`, `shadow-card`, `rounded-card`). Import components from `@/components/ui/*`; `cn` is in `@/lib/utils`. House screens: IconButton 76+ and HeartButton only (Switch/Checkbox/Button sm are Studio-only).

### 2026-11-14 18:26 — Timoté (pipeline)
- Done: F6 Studio auth on `feat/pipeline-F6-studio-auth`: `POST /api/auth/login` (signed `mh_session`, 7 days, Secure only on https), `POST /api/auth/logout`, `proxy.ts` guard (pages → `/studio/login?next=`, APIs → 401 envelope, `/api/h` + `/api/files` + login/logout open, `X-Robots-Tag: noindex` everywhere), minimal `/studio/login`, `pnpm env:check`. 97 unit tests + 3 e2e, `pnpm build` green.
- In progress: PR #12 (F6, B3, B4), rebased on main after #10. Fixed Alexandre's review: sessions signed with a SESSION_SECRET under 32 chars are now rejected by `verifySessionToken` (so by the proxy) and refused by `createSessionToken`; invalid login body returns 422; every error parses with `ApiErrorResponse`; API messages live in `copy.auth.*`.
- Blocked: #12 needs Alexandre's re-review. B1 moved to #13 (it registers B1–B4), so #12 no longer touches `docs/tasks.json`.
- Contract changes: none.
- Next: F4 (DB + storage), then P1. Known gaps: login has no throttle (registered as B1); logout does not revoke a copied cookie (stateless HMAC token, fine for the hackathon).
- Notes for everyone: run **`pnpm env:check`** after pulling: it validates `.env.local` (names only, never values). You need `STUDIO_PASSWORD` and a `SESSION_SECRET` of **32+ characters**, otherwise sign-in returns 500 "not configured". Studio routes call `/api/**` with the cookie automatically; `/api/files` stays open in the proxy, so its F4 handler must check session-or-House-token itself. `biome.json` now ignores `public/**/*.svg` (the exported SVGs broke `pnpm lint` on main). Raphaël/Alexandre: `/studio/login` is unstyled until F5; restyle freely, keep the label "Password" and the `role="alert"` (e2e uses them).

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
