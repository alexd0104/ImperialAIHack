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

### 2026-11-14 19:50 — Raphaël (design)
- Done: B6 `pnpm seed:demo`. Reads `DEMO_ASSETS_DIR/demo.json` (format: `scripts/demo/demo.example.json`), copies the media into storage and writes one published House at `/house/<DEMO_HOUSE_TOKEN>`. Replaces the previous demo House; refuses unless `MONGODB_DB` ends with `demo`. Planner `scripts/demo/plan.ts` is pure and tested against the contracts.
- In progress: nothing.
- Blocked: B7 `pnpm export:demo` waits on H1 (Yasir's bundle builder). Not run against Atlas yet: run `MONGODB_DB=mh_demo pnpm seed:demo` once demo-assets exist.
- Contract changes: none. Outside my zone: `package.json` (seed:demo script), `docs/tasks.json` (B6, B7; B5 was already taken on main).
- Next: fill demo-assets with the team's real demo content; B7 after H1.

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

### 2026-11-14 19:04 — Alexandre (studio)
- Done: Merged #13 and #12 as requested; #11 was already merged with the contrast fix. #12 is merged at 5177df5 after resolving copy/status conflicts and preserving a concurrent remote handoff resolution. GitHub reports no open PRs. CI is green on the final PR head; mock verify passes with 143 tests, production build passes, and all 5 browser tests pass, including axe.
- In progress: None for the PR-merging request; completed.
- Blocked: No merge blocker remains. Figma access is still unverified for the earlier S1 design-reading request.
- Contract changes: None by the integration. Shared `lib/copy.ts` and handoffs preserved; Studio sign-in adapted to the merged UI primitives and typography tokens. No force-push or direct push to main.
- Next: `node scripts/tasks.mjs check S1 --no-fetch` now passes against main. Resume the requested Figma-to-component mapping before S1 implementation; B1 remains the separately registered login-throttling follow-up.

### 2026-11-14 18:42 — Alexandre (studio)
- CI follow-up: #13 at da5a67c has a successful verify/build run (43628141766). Its replacement Tasks run (43628143748) is pending after the prior task-board job was cancelled during the PR update; the PR remains open for review. The three requested PR reviews are complete.
- Done: Follow-up review of F6 ba1cbcd (updated during the review). Contract-error reproduction now passes after ac1ae03; mock verify passes with 93 tests and all 3 Playwright tests pass again. The short-secret cookie still passes the proxy, reproduced directly with synthetic credentials. Posted a follow-up review acknowledging the corrected part; changes requested remains appropriate for B4.
- In progress: #13, documentation-only task registration (B1 preserved, B2–B4 registered); B3's note updated to reflect the correction already present in F6. No bug is marked merged by this registration PR.
- Blocked: #11 needs B2 (contrast); #12 needs B4 (minimum secret length at verification), plus the noted API-playbook alignment. Both remain unmerged. #10 is merged at 17082e2. S1 therefore still waits for F6.
- Contract changes: None by this review; the updated F6 reuses merged F2. No `.env*` read and no `env:check` execution.
- Next: Owners address the remaining review findings, then rerun CI and request review. Keep #13 open for task-registry review. The Studio working tree retains only the requested handoff changes in this file.

### 2026-11-14 18:38 — Alexandre (studio)
- Done: Reviewed PRs #10 (F2, 3e3d77e), #11 (F5, 3aeb65e), #12 (F6, 8a17b59) in isolated worktrees; task checks pass. Approved and squash-merged #10 at 17082e2. Submitted changes-requested reviews with inline findings on #11/#12. Local mock `pnpm verify` passes on all three (45/39/53 tests); Playwright passes on F5 (2) and F6 (3) with synthetic credentials. Chromium confirms F5 primary-button colours and type size. No `.env*` file opened.
- In progress: Documentation-only task-registration PR from `chore/tasks-review-findings`: B2 (primary text contrast), B3 (login API contract), B4 (minimum signing-secret length); B1 copied unchanged from #12 via `tasks.mjs add` to preserve its allocated ID. The PR contains only `docs/tasks.json`; this handoff stays on the existing Studio branch.
- Blocked: #11 and #12 are not compliant yet and remain unmerged; S1 still waits for F6 and verified Figma access. Existing green checks do not cover the reproduced contrast, error-envelope and short-secret cases.
- Contract changes: None made by this review. F2 contracts are now merged; F6 must reuse them. No application source edited, no push to main, no force-push, no fallback removed.
- Next: Raphaël fixes B2 in #11; Timoté fixes B3/B4 and rebases #12 onto merged F2. Rerun checks and review those commits before approval. The task-registration PR is a handoff, not completion of B1–B4. Recheck S1 only after F6 merges.

### 2026-11-14 17:37 — Alexandre (studio)
- Done: Completed AGENTS.md §11.1 orientation and read the Studio zone, TECHNICAL.md §§3.5/4, FEATURES.md S1–S9, DESIGN.md and both requested playbooks. Clean main was already up to date; created `feat/studio-S1-create-house` for this documentation-only handoff. Node 24.21.0 / pnpm 12.4.1; no `.env*` file opened; `.env.local` absent, shell AI_MODE unset, no listener on port 3000.
- In progress: Step 1 access verification for Figma v5 “Family · Create the House” (22-546). Figma plugin discovery reports not installed; setup offered. No Figma MCP tool is available, so design context/screenshot and the element-by-element mapping remain unverified. Documentation maps the canvas to `bg-background`, headings/body to `font-display`/`font-body` and `text-ink`, name to Input, room choices to Cards with `public/rooms/{garden,kitchen,living}.svg`, consent to Checkbox, and the primary action to Button; these are planned mappings, not observations of the frame.
- Blocked: `node scripts/tasks.mjs check S1` exits 1 for F2 and F6; F5 is only a soft warning. `node scripts/tasks.mjs next alexandre` reports nothing ready. Application scaffold, `lib/contracts/`, `components/ui/` and `package.json` are absent, so implementation and `pnpm verify` have not started. No push or PR; only this local handoff changed.
- Contract changes: None. Reuse merged Zod API/entity schemas; any required contract change needs Timoté review. No application code, task dependencies or design evidence changed.
- Next: Enable Figma access, read node 22-546 design context + screenshot, and finish the verified mapping. After F2/F6 merge, update from main and rerun `check S1`; show the concrete implementation plan, then build `/studio/house/new`, `POST /api/houses` and style-only `POST /api/houses/:id/rooms` with required consent. Validate in mock mode, capture 1194 × 834 evidence, run `pnpm verify` before any push, and open `feat(studio): create the House (S1)` with all shared/out-of-zone files listed.

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
