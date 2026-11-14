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
| 4 | Rodin vs Trellis | 3 photos (teapot, radio, watering can), same input, via fal API. Speed and weight equal: 18–74 s, 0.8–1.4 MB, ~19–20K triangles each. Rodin: 3/3 clean, faithful shapes, simplified/saturated texture (fits the illustrated rooms). Trellis 2: richer teapot glaze, but radio grille texture is noise and the watering can kept a disc of the decking (background bled). | Keep **Rodin v2.5 fast** as default, Trellis 2 as fallback. Cutout before model3d is mandatory (busy backgrounds). Cost (fal usage export): Rodin **$0.10** / generation (not $0.40), Trellis 2 **$0.30** / run (6 units × $0.05). Whole test: $1.20. | Raphaël |
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

- 2026-11-14 — Alexandre → Timoté — S2 provisional Slot assignment is explicitly approved by Alexandre (modifiable in S8, no reservation/publication here). P5 is still absent: the temporary Studio object-job route persists Job/JobView and uses a sample GLB only in mock mode. Please replace that adapter with P5 when ready; normal persistence uses F4 MongoDB, explicit offline tests use STUDIO_MOCK_STORE. Object photos upload through POST /api/houses/:id/assets with existing Asset/AssetView schemas.

- 2026-11-14 19:37 — Alexandre → Timoté — F4 arrived during S1 finalization; the earlier persistence request is resolved in S1. Default creation now uses db.houses/db.rooms with ObjectId-compatible ids and duplicate-key replay. The offline adapter requires STUDIO_MOCK_STORE=true plus AI_MODE=mock; no silent DB fallback. B5 remains in #17. F4's existing lib/storage/index.ts:19 emits a Turbopack whole-project tracing warning; build still passes, source unchanged by S1.

- 2026-11-14 19:30 — Alexandre → Timoté — S1 mock creation is ready. F4 helpers are still absent from main: replace `app/api/houses/_mock-store.ts` with `lib/db` persistence when F4 lands, preserving consent timestamps, private tokens, stable Room Slots and idempotent retries. The temporary adapter only runs in AI_MODE=mock and writes to gitignored STORAGE_DIR/studio-mock. Also registered B5 (API playbook uses `input.error`, but `parseJson` exposes `message`) separately in https://github.com/alexd0104/ImperialAIHack/pull/17.
- 2026-11-14 19:30 — Alexandre → Raphaël / Yasir — S1 reuses F5 and exported SVGs. Alexandre explicitly approved proceeding without direct Figma MCP access; frame 22-546 comparison remains pending (mapping and captures in DESIGN §9). Garden Slots reuse the F2 fixture; please review the provisional Kitchen/Living presets in `components/studio/room-styles.ts` before House integration. S1 has no fake link into unimplemented S2.

- 2026-11-14 18:42 — Alexandre → Timoté — Update to #12 review: ba1cbcd/ac1ae03 corrects B3's error codes and uses F2 contracts; confirmed both error responses parse. B4 remains: a cookie signed with the synthetic short configured secret passes the actual proxy (200, `x-middleware-next=1`). Please enforce the same 32-character minimum at verification. Task registrations and current disposition: https://github.com/alexd0104/ImperialAIHack/pull/13.

- 2026-11-14 18:38 — Alexandre → Raphaël — PR #11 changes requested (B2): `components/ui/button.tsx:13` renders white on primary at 3.22:1, 18px/700 (Chromium); Badge attention/photoPrimary and ToggleGroup primary share the issue. Use accessible token pairs including hover/selected states and add a contrast/axe regression. Review: https://github.com/alexd0104/ImperialAIHack/pull/11#pullrequestreview-5906434308.
- 2026-11-14 18:38 — Alexandre → Timoté — PR #12 changes requested: B3, `app/api/auth/login/route.ts:36` emits codes rejected by F2 `ApiErrorResponse`; F2 is now merged, so replace temporary inline contracts/helpers. B4, `lib/session.ts:47` accepts cookies signed with a short configured secret despite login's 32-character minimum; reject at verification and test the proxy. Review: https://github.com/alexd0104/ImperialAIHack/pull/12#pullrequestreview-5906434698. B1 from your PR is preserved unchanged when registering B2–B4 to avoid allocating its ID twice.

- 2026-11-14 17:37 — Alexandre → Timoté — S1 readiness check exits 1: F2 (Contracts v1) and F6 (Studio auth) are not merged on `origin/main`. Please hand off their merged contracts/auth before Studio implementation starts; no dependency bypass or contract edits made.
- 2026-11-14 17:37 — Alexandre → Raphaël — S1 will use F5 tokens, Input, Checkbox, Button, Card and exported logo/room SVGs. F5 is a soft dependency; any missing UI primitive will stay temporarily in `components/studio/`, with a promotion request. Exact frame inventory awaits Figma MCP access.

_(newest first: date — from → to — what)_

- 2026-11-14 — Raphaël → Timoté — `/studio/login` (F6) a11y: when the error shows, set `aria-invalid` on the password `Input` and `aria-describedby` → the `role=alert` paragraph id (`app/studio/login/LoginForm.tsx:44-55`). `Input` already turns its border `danger` on `aria-invalid`. Axe passes otherwise (DESIGN.md §7).
- ~~2026-11-14 — Raphaël → Timoté — The Tasks workflow rejected `(ID-wip)` PR titles although its error message recommends them (`.github/workflows/tasks.yml:47`). Fixed in `fix/shared-tasks-wip-title`; please review. Not registered as a B task because `tasks.mjs add` needs Node, which is not set up on my machine yet: please add it if you want it on the board.~~ Resolved by #9.

## Log

### 2026-11-14 — Alexandre (studio, S2 final review)
- Done: S2 library/photo creation, House-scoped upload, persisted object_3d mock progress, fallback and resumable drafts implemented. Provisional free Slot explicitly approved, never reserved or published by S2. Corrected and registered B8: auth E2E alert locator scoped to the sign-in form. Tablet/phone captures saved under docs/design-evidence/create-object-*.png; direct Figma MCP comparison remains unavailable and is documented.
- In progress: Final checks and PR merge explicitly requested by Alexandre. Combined-tree verify passed (291 tests), all 12 browser tests passed, and 3 S2 scenarios passed against the production build; final regression additionally checks that a failed replacement upload cannot reuse an older photo silently.
- Blocked: No mock-flow blocker. P5 remains a soft dependency: the temporary Studio provider uses a labelled synthetic GLB, refuses non-mock photo generation, and preserves the library fallback. S3 navigation awaits S3.
- Contract changes: None. New routes reuse CreateStoryRequest, Room, Story, Asset/AssetView and Job/JobView. Out-of-zone/shared edits: lib/copy.ts, e2e/create-story.spec.ts, e2e/studio-auth.spec.ts, TECHNICAL.md, docs/DESIGN.md, docs/tasks.json, design captures and this handoff; no new dependency or pipeline implementation edit.
- Next: Merge S2/B8 after green CI. Timoté replaces the mock Object provider with P5; S8 selects/reserves the final Slot atomically. No live credits, family data or .env reads used for validation.

### 2026-11-14 — Alexandre (studio, S2 implementation)
- Done: Alexandre approved provisional Slot assignment, adjustable in S8. Implemented Room lookup, House-scoped photo upload, Story creation, persisted mock object_3d progress and library fallback; linked S1 to S2. Photos resize to 2048 px JPEG, drafts/uploads survive reload, retries preserve the Story id, no Slot reservation or publication occurs.
- In progress: Browser checks and integration of current main before the requested merge. Unit/type/lint checks pass (245 tests); all 3 new S2 browser tests passed, including axe and photo resizing.
- Blocked: Existing auth browser test has an ambiguous alert locator (Next route announcer also has role=alert); registering and fixing that one-line test issue next. P5 remains soft; mock output is explicitly labelled as a sample Object.
- Contract changes: None; reuse existing entity/request/JobView/AssetView schemas. New Studio routes will be documented in TECHNICAL.md; P5 integration request follows.
- Next: Finish regression/build and design captures, update handoff, then publish and merge S2 on green CI. Original placement question is resolved.

### 2026-11-14 — Alexandre (studio, S2 orientation)
- Done: Updated from main, checked S2 successfully and created feat/studio-S2-create-object. Read Studio requirements and current creation contracts; no application code or contract edited.
- In progress: Preparing library/photo Object creation, Story naming, saved draft and mock generation progress.
- Blocked: Product decision pending on provisional Slot assignment versus a reviewed contract change. P5 is only a soft dependency and does not block mock implementation.
- Contract changes: None. Proposed behavior and upload-route gap recorded under Requests.
- Next: Resolve placement representation, implement and validate S2, then open and merge its PR only when acceptance criteria and checks pass. No S2 implementation or merge is claimed yet.


_Older entries: `docs/status-archive.md`. Keep this file short: newest entries on top; when the Log has more than ~10 entries, move the oldest to the archive._

### 2026-11-14 19:50 — Raphaël (design)
- Done: B6 `pnpm seed:demo`. Reads `DEMO_ASSETS_DIR/demo.json` (format: `scripts/demo/demo.example.json`), copies the media into storage and writes one published House at `/house/<DEMO_HOUSE_TOKEN>`. Replaces the previous demo House; refuses unless `MONGODB_DB` ends with `demo`. Planner `scripts/demo/plan.ts` is pure and tested against the contracts.
- In progress: nothing.
- Blocked: B7 `pnpm export:demo` waits on H1 (Yasir's bundle builder). Not run against Atlas yet: run `MONGODB_DB=mh_demo pnpm seed:demo` once demo-assets exist.
- Contract changes: none. Outside my zone: `package.json` (seed:demo script), `docs/tasks.json` (B6, B7; B5 was already taken on main).
- Next: fill demo-assets with the team's real demo content; B7 after H1.

### 2026-11-14 19:45 — Raphaël (design)
- Done: Test 4 (Rodin vs Trellis), result in the test table. Timoté: P5 can keep `fal-ai/hyper3d/rodin/v2.5/fast` as in TECHNICAL.md §7; Trellis 2 with `texture_size 1024, decimation_target 20000` works as fallback. Background must be cut out first. Rodin is also 3× cheaper ($0.10 vs $0.30); TECHNICAL.md §7 cost corrected.
- In progress: Q4 (as screens land).
- Blocked: nothing.
- Contract changes: none.
- Next: pitch slide outline; Q4 rows for the first Studio/House screens.

### 2026-11-14 19:40 — Alexandre (studio)
- Verification: Combined S1/F3/F4 tree passes pnpm verify (232 tests) and production build. No new S1 application behavior changed by the F3 integration.
- Done: Final S1 production browser checks pass (4/4), with MongoDB integration covered separately by collection tests. Integrated concurrent F3 0e664fc as well; dependency conflicts retain both AI SDKs and the Studio form/query packages. All pipeline source and media are preserved unchanged.
- In progress: Final combined-tree verification and GitHub CI for #18; merge explicitly authorized.
- Blocked: None locally; concurrent main updates required fresh conflict resolution before GitHub could run PR checks.
- Contract changes: None by S1. Shared handoffs and both package/lockfile additions retained.
- Next: Merge #18 once the combined tree is green. Figma comparison and Slot review remain documented follow-ups; MongoDB wiring is complete.

### 2026-11-14 19:37 — Alexandre (studio)
- Done: Integrated concurrent F4 fa2b4c4, preserving dependencies, contracts and all handoffs. S1 now uses F4 MongoDB collections by default, including in AI_MODE=mock. Added collection-level integration tests for ObjectId mapping, private tokens, duplicate-key replay, parent lookup and no fallback on DB failure. Offline browser testing requires an explicit STUDIO_MOCK_STORE=true; documented in TECHNICAL.md and enabled by Playwright.
- In progress: Final browser regression and CI for PR #18, then merge as requested. pnpm verify passes with 195 tests; production build passes (existing F4 storage tracing warning).
- Blocked: No implementation blocker. Exact frame 22-546 comparison remains deferred by Alexandre's explicit approval; Kitchen/Living Slot presets still need House-owner review before House integration.
- Contract changes: None by S1; F4's additive GenerationCacheEntry is preserved. Additional shared files: playwright.config.ts (explicit test store) and TECHNICAL.md (configuration). No lib/db or lib/storage implementation edited.
- Next: Merge #18 on green checks. S2 uses the persisted House/Room. #17 registers B5 for Timoté separately; do not mistake registration for its fix.

### 2026-11-14 19:30 — Alexandre (studio)
- Done: Implemented S1 on feat/studio-S1-create-house: /studio/house/new, POST /api/houses and style-only POST /api/houses/:id/rooms. Required consent, shared contracts, fixed empty Slots, private token withheld, session guard, saved tab draft, idempotent retries including lost responses, and expired-session recovery. Self-review complete; pnpm verify passes (161 tests), production build passes, 9 browser tests pass in dev and 4 S1 scenarios pass against production, including axe on tablet/phone. Captures in docs/design-evidence/create-house-{code,phone-code}.png.
- In progress: Publishing and merging the S1 PR, explicitly requested by Alexandre. Prior local review handoffs are preserved in this file.
- Blocked: No mock-flow blocker. F4 MongoDB integration and exact Figma comparison remain follow-ups; the mock store is deliberately disabled outside AI_MODE=mock. Completion stays on S1 until S2 is implemented. No live AI calls or .env file reads.
- Contract changes: None. Shared/out-of-zone edits: lib/copy.ts, package.json, pnpm-lock.yaml, e2e/create-house.spec.ts, docs/DESIGN.md, docs/design-evidence/ and this handoff. Added React Hook Form for form state, @hookform/resolvers for existing Zod validation, and TanStack Query for typed API mutations (all prescribed by the stack).
- Next: Merge after green CI; Timoté handles F4 adapter integration and B5, Raphaël checks frame 22-546, Yasir reviews Slot positions. S2 can consume the created House/Room; no contract or shared UI component changes required.

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

### Template
```
### <YYYY-MM-DD HH:MM> — <name> (<zone>)
- Done:
- In progress:
- Blocked:
- Contract changes:
- Next:
```
