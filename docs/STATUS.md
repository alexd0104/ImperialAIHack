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
| 1 | GLB on room SVG | No GLB exists yet; library SVGs render well as R3F textured planes on the room SVGs (float, fade, scale) | Demo default = library SVG Objects; the `object.kind === "glb"` path (useGLTF, fit to Slot width) stays in `components/house/room-canvas.tsx`, untested until a GLB lands | Yasir |
| 2 | Memory chain fidelity (Kling vs Veo) | | | Timoté |
| 3 | Room from real photo | | | Timoté |
| 4 | Rodin vs Trellis | 3 photos (teapot, radio, watering can), same input, via fal API. Speed and weight equal: 18–74 s, 0.8–1.4 MB, ~19–20K triangles each. Rodin: 3/3 clean, faithful shapes, simplified/saturated texture (fits the illustrated rooms). Trellis 2: richer teapot glaze, but radio grille texture is noise and the watering can kept a disc of the decking (background bled). | Keep **Rodin v2.5 fast** as default, Trellis 2 as fallback. Cutout before model3d is mandatory (busy backgrounds). Cost (fal usage export): Rodin **$0.10** / generation (not $0.40), Trellis 2 **$0.30** / run (6 units × $0.05). Whole test: $1.20. | Raphaël |
| 5 | Time + cost per Memory | | | Timoté |

## Contract changes

_(newest first: date — what changed — who)_

- 2026-11-15 — Room from a description (B17): `RoomBackground` gains `{ kind: "description", text, path }` (Pending too), `Room.source` gains `"description"`, new `GenerateRoomRequest` for `POST /api/houses/:id/rooms/generate`. Additive; code switching on `source`/`background.kind` should treat unknown values like `"photo"` (storage path) — Timoté.
- 2026-11-15 — `Memory.sceneMotion` + `UpdateMemoryRequest.sceneMotion` (optional `SceneMotion`): movement chosen before generation, copied onto every scene — Timoté (B15).
- 2026-11-15 — **Contracts v2 published (F7)** — Timoté. All additive and optional; every v1 fixture still parses.
  1. `Scene`: `motion?` (`SceneMotion`, read with `resolveSceneMotion` → gentle 5 s), `soundMode?` (`"clip"|"text"`, absent → env `SOUND_MODE_DEFAULT`, default `"text"`), `bedId?`, `soundEvents?`. **Deviation:** `bedId`/`soundEvents` live on `Scene`, not in `outputs`, which stays files only (the Studio turns every output into a URL).
  2. `Story.position?` (`StoryPosition`, scale 0.05–1); `Room.background?` (`RoomBackground`, read with `resolveRoomBackground`, which falls back to v1 `source`/`style`) + `pendingBackground?` (same + `jobId`).
  3. `HouseBundle.version?`, `BundleScene.bedUrl?`, `BundleStory.position?` (optional so the current bundle builder keeps compiling; the H task fills it). `JobType` adds `scene_sound`. `CompiledPrompts` (lib/ai) adds optional `soundEvents`, `ambienceNegativePrompt`, `motionRefused`.
  4. New `LabRun` (`lib/contracts/lab.ts`) + `db.labRuns` (`lab_runs`). Request bodies: `UpdateSceneRequest`, `UpdateRoomRequest` (+ `RoomBackgroundInput`), `UpdateStoryRequest.position` (`null` = back to its Slot). No route handlers: each feature task owns its own.
  5. Env `SOUND_MODE_DEFAULT` (clip|text), `ENABLE_LAB` (true|false) in `pnpm env:check` (optional). Fixtures: `lib/contracts/__fixtures__/v2.json`.
- 2026-11-14 — **`BundleScene.stillUrl` added (B10)** — Yasir, approved by Timoté. `lib/contracts/house-bundle.ts`: optional `stillUrl` (the scene's chosen still: colourised, restored or original photo), set on clip scenes by `lib/house/bundle.ts`. A failed clip shows it, then the Memory's `polaroidUrl` only if missing. Additive only.
- 2026-11-14 — **`Job.assetId` added (P5)** — Raphaël for Timoté. `lib/contracts/jobs.ts`: optional `assetId` = the Object photo Asset of an `object_3d` job (the job had no way to find its source photo). Additive only; `JobView` carries it too (an id, no path).

- 2026-11-14 — **`GenerationCacheEntry` added (F4)** — Timoté. `lib/contracts/jobs.ts`: {id, key, model, outputPath, costUsd, createdAt}, the `generation_cache` document of TECHNICAL.md §6. Additive only.
- 2026-11-14 — **Contracts v1 published (F2)** — Timoté. `import { … } from "@/lib/contracts"`; types are `z.infer`. Fixtures in `lib/contracts/__fixtures__/` (Frank, garden room, one Memory with 2 scenes, a bundle).
  1. Entities (`entities.ts`): `House`, `Room` with embedded `Slot` {id, x, y, scale normalised 0..1 on 1194×834, storyId?}, `Story` {object {kind glb|svg, path, jobId?}, memoryOrder}, `Memory` {answers, freeText?, sheet?, okAlone, status draft|generating|ready_for_review|approved|published}, `Asset`, `Scene` {outputs {restored?, colourised?, clip?, ambience?} as storage paths, choice? {use, colour, restored}, status pending|generating|done|fallback|failed}, `Event`. String ids, ISO date strings.
  2. `MemorySheet` = TECHNICAL.md §4.2 exactly. `MemoryAnswers` = the sheet minus freeText/okAlone/source, all optional and **without defaults** (what PATCH `/api/memories/:id` sends as `answers`; merge it, do not replace).
  3. `HouseBundle` = §4.2 exactly (`BundleRoom/Slot/Story/Memory/Scene` exported). `BundleQuery` defaults `mode` to `together`.
  4. `api.ts`: one request/response schema per route in §4.3 (`CreateHouseRequest`, `HouseDetail`, `CreateRoomRequest` union on `source`, `CreateStoryRequest` union on `object.kind`, `MemoryDetail` with assets + `SceneView` URLs + jobs, `SceneChoiceRequest`, `HouseEventRequest`, …) and `ASSET_LIMITS`. `Job` is in `jobs.ts`. **Responses to the browser use `JobView` / `AssetView`** (no fal request ids, costs, key label, storage path); `GET /api/jobs/:id` returns `JobView` with `steps[].name/status/previewUrl`. Additions beyond §4: `Slot.storyId`, `Scene.jobId`, `Event.mode`, `Room.backgroundJobId`.
  5. Errors: `{ error: { code, message, retryable } }`, 10 codes of §4.4 with default HTTP status. Route helpers in `lib/http.ts`: `ok(data, status?)`, `fail(code, message, status?, retryable?)`, `parseJson(req, Schema)` (safe-parse result, never throws).

## Requests

- 2026-11-15 09:35 — Timoté → Alexandre — Room from a description (B17) backend is on main: `POST /api/houses/:id/rooms/generate` `{ name, description }` creates a Room, `{ roomId, description, name? }` replaces its background (send `Idempotency-Key`). Takes ~10–20 s live (2–5 s mock): show the "Preparing the new background…" state. If the response has `source: "style"`, generation failed and the closest standard Room was used. Ask: a "Describe a room" field in `RoomManager` / Create House.
- 2026-11-14 22:30 — Yasir → Timoté / Alexandre — e2e runs with `STUDIO_MOCK_STORE=true`, but `POST /api/memories/:id/generate` (`mongoGenerationStore`) and the House bundle (`lib/house/load-bundle.ts`) read MongoDB only, so Studio → generate → House can't chain in e2e (CI has no Mongo service either). Q2 seeds the finished scene file in the mock store and plays the House from `e2e/fixtures/demo-assets` in demo mode. Ask: a mock-store generation store (and bundle loader), or a Mongo service in CI, so Q2 can drop the seeding.
- 2026-11-14 22:00 — Raphaël → Yasir — Q4 found (Studio): (1) after `POST /api/scenes/:id/choice` on every scene the Memory stays `ready_for_review`; the choice route should call `refreshMemoryStatusById` (`lib/jobs/generation.ts`) so it becomes `approved`. (2) Place (`components/studio/PlaceStory.tsx:133`) draws Slots on a plain box: Figma 20-536 shows the Room SVG with its Objects, room tabs and "Send to Mum's house". (3) Studio screens lack the 4-step stepper and family avatars of Figma; full list in `docs/DESIGN.md` §7.
- 2026-11-14 22:00 — Raphaël → Yasir — Q4 found (House): Choose a room shows style ids ("garden", "living") instead of Room names; alone mode doesn't fade Stories that aren't OK alone (Figma 20-701). Details in `docs/DESIGN.md` §7.
- 2026-11-14 20:20 — Raphaël → Alexandre — Kitchen/living Slot positions changed in `components/studio/room-styles.ts` (ids unchanged): Objects now sit on the counter top / floor. Please check your Room preview still looks right.
- 2026-11-14 — Alexandre → Timoté — S2 provisional Slot assignment is explicitly approved by Alexandre (modifiable in S8, no reservation/publication here). P5 is still absent (mock jobs carry a permanent lease so P1 cannot process them): the temporary Studio object-job route persists Job/JobView and uses a sample GLB only in mock mode. Please replace that adapter with P5 when ready; normal persistence uses F4 MongoDB, explicit offline tests use STUDIO_MOCK_STORE. Object photos upload through POST /api/houses/:id/assets with existing Asset/AssetView schemas.
- 2026-11-14 20:07 — Yasir → Timoté — Your 20:15 build request is fixed in eeb26e6 (B8): `/house/[token]` now reads params inside `<Suspense>`; `pnpm build` passes.
- 2026-11-14 20:07 — Yasir → Timoté — Contract asks (House works around both, no edit made): (1) `BundleScene` has no still for a clip, so a failed clip falls back to the Memory's `polaroidUrl`, not that scene's own photo. Proposal: optional `stillUrl` on `BundleScene` (`lib/contracts/house-bundle.ts:5`), filled by `lib/house/bundle.ts` `buildMemory`. (2) `HouseBundle.house.avatars` has no source (no family members on `House`), so the DB bundle sends `[]`; tell me where family members will live.

- 2026-11-14 20:15 — Timoté → Yasir — `pnpm build` fails on main: `/house/[token]` reads runtime data outside `<Suspense>` during prerender (Next 16 cache components). Wrap the data read in `<Suspense>` or call `connection()` first.
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

### 2026-11-15 11:20 — Raphaël (design, B23)
- Add room / Edit room: while a Room or its background is being made, the form is replaced by a "Getting your Room ready" panel (room-shaped placeholder, moving dots, hint per kind; for a description, a bar that fills towards 90 % over ~20 s).
- Sheet step "How should the photos look?": no more switch hiding the rest. Three always-visible rows of buttons (Scratches and fading: Gently repair / Keep as it is; Movement: Keep still / Gentle movement / Describe it; Length 5 s / 10 s, hidden only when Keep still). Each tap saves `answers.motion` and `sceneMotion` together, so they can't disagree; "Saved" shows under the card.
- **Outside my zone (Studio, Alexandre):** `components/studio/RoomManager.tsx`, `components/studio/MemorySheetView.tsx`, `lib/copy.ts` (new keys in `studio.rooms` and `studio.progress`; removed `progress.restore/motion/motionHint`). `MotionPicker` at review is unchanged.
- Checked in the browser (dev, mock): loading panel shows; Describe it shows the text box; Keep still persists after reload. `pnpm verify` green.

- 2026-11-15 10:00 — Timoté — B22: Studio home Rooms are now a door carousel (`components/studio/RoomDoors.tsx`): each door opens `/studio/rooms/[id]` (background, name, move each Object via its place page, delete, New Story here); the "+" doorway opens `/studio/rooms/new` (AddRoom). **Alexandre:** `RoomManager.tsx` now only renders the carousel; `AddRoom` and `RoomRow` are exported and reused by `components/studio/RoomPages.tsx`. Keep editing them in place. e2e `room-picker.spec.ts` updated (link "Add room", door "Open: <name>").

### 2026-11-15 10:40 — Raphaël (design, B21)
- Done, House: Objects "breathe" (±2 % over 4 s) and land from "open" with one soft spring bounce; a warm pool of light blooms under an Object a finger or mouse is on; polaroids "develop" like instant prints as they fly out; the sent Heart and four small ones rise and fade; time-of-day light over the Room (soft-light, 60 s transition); sparse particles per Room (pollen in a garden, steam in a kitchen, dust in a sunbeam elsewhere) in the new `components/house/room-ambience.tsx` (+ test).
- Done, Studio: light sweep while a scene generates; the still dissolves into the clip once it loads; "Approved" stamps in; Memory bank photos drop onto a pile and straighten; chosen 3D Object turns in the library; a placed Object drops in with a dust puff; "sent" shows the card flying into a House whose window lights; Hear back counters tick up and Hearts float up.
- Motion tokens live in `app/globals.css` (`--animate-*`, `--color-light-*`, `--color-glow`); all on `--ease-memorai`; loops hide under reduced motion.
- Checked: `pnpm verify` green, `pnpm demo:check` green, House and Studio checked in the browser (glow, Hearts, counters, turntable, drop).
- Outside zone: `components/house/{room-canvas,room-scene,object-open,heart-screen}.tsx` (House); `components/studio/{ReviewMemory,MemoryBank,HearBack,CreateStoryForm,PlacementEditor,PlaceStory,RoomManager}.tsx` (Studio).

### 2026-11-15 09:40 — Alexandre (Studio, B18 B19 B20)
- Done: B18 Studio home Room picker: Room cards (tap → new Story there, Edit → rename/background/delete) + "+ Add room" card (name + photo or familiar Room). B19 review: one main "Keep and continue" saves every scene's choice then opens Place; "Keep the original photo" / "Use the new version" and "Try again" are secondary. B20: "Add a Memory to this Story" on Place (before and after sending); Vitest + Q2 e2e cover it. Movement on review (preset/custom, text, 5/10 s) was already in `MotionPicker`, unchanged.
- In progress: nothing.
- Done: B18 also wires Timoté's B17 `POST /api/houses/:id/rooms/generate`: "Or describe the room" in Add room and in each Room's Edit ("Make this background"). Offline mock `houseDetail` now lists Rooms/Stories/Memories from the studio-mock store (it returned `rooms: []`, so the picker was empty without Mongo).
- Blocked: nothing. Not done: describe field in Create House; no notice when generation falls back to a standard Room.
- Outside zone: `e2e/{room-picker,create-publish-play,create-story,studio-auth}.spec.ts` (new spec + Teapot instead of the removed Flower after B16).
- Deviations: publish (and Place's Send button) now skips Memories that are still empty drafts, so one abandoned Memory doesn't block re-publishing a Story. No contract change.

### 2026-11-15 09:35 — Timoté (pipeline, B17)
- Done: #7 placeholder clip = mock fixture only (live writes `scene.outputs.clip`, Studio reads `/api/files/...`). #4 movement checked: custom text → `applyCustomMotion` in prompt-compiler, `duration: "10"` reaches Kling and mmaudio, cache key includes params.
- Done: B17 room from a description — `roomGenerate` = `fal-ai/nano-banana-2` (verified on fal 15 Nov, $0.08), `compileRoomPrompt` (realistic like the standard photo Rooms, no people), `lib/ai/room-generate.ts`, route `app/api/houses/[id]/rooms/generate`, mock fixture, tests, TECHNICAL §7.1. Failure → closest standard Room. Synchronous in the request like `cleanRoomPhoto` (simplest; no job/pending flow).
- Outside my zone: `app/api/houses/_room-ops.ts` (cleanup checks `source !== "style"` so generated pictures are deleted too), `lib/copy.ts` (`rooms.describeInvalid`). UI not done: see Requests (Alexandre).

### 2026-11-15 09:40 — Raphaël (design, B16)
- Done: the Object library offers only the 3 committed 3D defaults (armchair, record player, teapot); old SVG Stories still render. The demo garden Story is now the 3D armchair (seed + export + `demo:check` green).
- Done: the Studio placement editor draws the real Object in 3D with the House's own `room-canvas`, plus the Room's other Objects, faded, at their saved spots.
- Checked: `pnpm verify` green (434 tests); placement page checked in the browser (3D chair shows and drags). Not seen yet: a Room holding several Stories.
- Outside zone: `components/studio/{object-library.ts,object-library.test.ts,CreateStoryForm.tsx,PlaceStory.tsx,PlacementEditor.tsx,placement.ts,placement.test.ts}`, `app/api/stories/stories.test.ts` (Studio); `lib/copy.ts`. It imports `components/house/room-canvas` but does not change it.
- Note: the 3D model is fitted to the box's width, so a tall Object (the armchair) pokes above the square drag box.

### 2026-11-15 09:30 — Timoté (pipeline, B15)
- Done: movement type (Gentle / Describe) and length (5/10 s) now chosen on the Memory sheet, before "Bring to life"; PATCH memory copies it onto existing scenes, new scenes inherit it. Per-photo override at review unchanged.
- Outside my zone: `components/studio/{MemorySheetView,MotionPicker}.tsx`, `lib/copy.ts` (Alexandre) — `MotionPicker` now wraps a reusable `MotionFields`.
- Note: in `AI_MODE=mock` the clip is always the 3 s colour-bar fixture; real length only shows in live.
- `pnpm verify` green (434 tests).

### 2026-11-15 — Alexandre (main integration, B14)
- Done: rebased the local pregen commit onto origin/main; no conflicts occurred, all three assets preserved.
- Validation: AI_MODE=mock pnpm verify passed (48 files, 433 tests); task registry lint passed.
- In progress: push to main and remote CI verification.
- Blocked: nothing.
- Outside Studio zone: existing user-provided pregen/ assets; shared docs/tasks.json and this handoff. No contracts or application code changed.

### 2026-11-15 00:55 — Timoté (pipeline, F7)
- Done: Contracts v2 (see Contract changes). `pnpm verify` green (387 tests).
- Outside my zone: `scripts/check-env.mjs` (two optional rules, listed in F7's files).
- Not done: `.env.example` lines (agents can't edit `.env*`): Timoté adds `SOUND_MODE_DEFAULT=text` and `ENABLE_LAB=false` by hand.
- Next: autopilot P7 → P8 → P10.

- 2026-11-14 23:40 — Timoté — v2 round set up: 15 tasks in `docs/FEATURES-V2.md` (F7 contracts v2 first), overnight runner `pnpm autopilot <you>` (`docs/AUTOPILOT.md`). Autopilot handoffs and Human TODOs land in `docs/status/<you>.md`. Read your file every morning.

### 2026-11-14 23:55 — Yasir (studio navigation, B12)
- Done: one Studio header in `StudioPage` on every Studio page except sign-in (logo → home keeping `?house=`, Hear back / Create / Care and privacy with `aria-current`, Sign out = POST logout → `/studio/login`). Every inner screen has a "Back to …" link to its logical parent (pure map in `components/studio/studio-nav.ts`, Vitest), and bank → questions → sheet → review → place show "Step n of 5". Home lists Stories (→ place) and Memory rows link to the Memory; Place links each Memory. `pnpm verify` green (377), `pnpm test:e2e` 15/15 with a synthetic `STUDIO_PASSWORD`.
- In progress: nothing.
- Blocked: nothing. Note: the offline mock store returns `HouseDetail.stories: []` even after a Story is created, so in e2e home shows "No Stories yet." (the live DB fills it).
- Outside my zone (Alexandre, Studio): `components/studio/{StudioPage,StudioNav,HearBack,PlaceStory,CarePrivacy,MemoryQuestions,CreateStoryForm}.tsx`, new `components/studio/studio-nav{,.test}.ts`, `app/studio/{page,house/new/page,stories/new/page}.tsx` (now use `StudioPage`), `lib/copy.ts` (`studio.nav`; bank/questions/sheet eyebrows "Step x of 4" → "Create · …" so there's only one step counter), `e2e/studio-auth.spec.ts`, `docs/tasks.json` (B12). The old in-screen back links (Questions, Care, Create Story) were removed; the header row replaces them.
- Design deviation: Figma's 4-step stepper is not used; the header shows "Step n of 5" over the Memory flow as asked in B12. Contract changes: none.

### 2026-11-14 23:10 — Raphaël (design, demo readiness pass, B11)
- Done: full Studio → fal → House run **live** in the browser (House, photo Object via BiRefNet + Rodin, one scene restore + Kling + mmaudio, approve, place, publish, play). Then the same flow on the production build in mock mode: passes with no console or 5xx errors. Fixes: (1) pipeline: job lease 10 s → 120 s, live steps got stuck when a clip took over 10 s to upload/download (TECHNICAL §5.2, §10); (2) Studio: scene choice now sets the Memory `approved`; Place shows the Room picture; Object hint no longer says "sample" after a live job; login field `aria-invalid`; (3) House: GLB Objects sway gently (±17°) and float a little more; generated clips play their own ambience quietly when the Memory has no ambience track; (4) demo: Choose a room shows "Garden / Kitchen / Living room"; `pnpm demo` = build + `next start` with the offline demo House.
- In progress: nothing.
- Blocked: nothing. Not tested live: a Memory with several photos, song and voice together.
- Contract changes: none. Outside my zone (asked by Raphaël for the demo): `lib/jobs/config.ts`, `TECHNICAL.md` (Timoté); `app/api/scenes/[id]/choice/route.ts`, `components/studio/PlaceStory.tsx`, `app/studio/login/LoginForm.tsx`, `lib/copy.ts` (Alexandre/Yasir); `components/house/{room-canvas,memory-player}.tsx` (Yasir); `package.json` (`demo`).
- Next: two dev servers on the same `MONGODB_DB` (one mock, one live) both tick the same jobs: run one at a time. Re-run `seed:demo` + `export:demo` after pulling.

### 2026-11-14 22:35 — Yasir (house, Q2 + B10)
- Done: Q2 `e2e/create-publish-play.spec.ts`: Studio start Memory → photo → answers → sheet → approve → publish, then House Choose a room → Object → polaroid → Memory plays (still fallback). B10 `BundleScene.stillUrl`: bundle fills it, it's preloaded and tokenised, the player falls back stillUrl → polaroidUrl (`lib/house/scene-still.ts`). `pnpm verify`, `pnpm test:e2e` (13/13) and `pnpm demo:check` all green.
- In progress: nothing. Avatars stay `[]` until Timoté says where family members live.
- Blocked: Q2 seeds scenes and uses the fixture bundle (Request above). `demo:check` locally needs `DEMO_ASSETS_DIR=e2e/fixtures/demo-assets` (no demo-assets/ here) and a warm dev server: a cold `next dev` misses its 90 s Choose-a-room wait.
- Contract changes: `BundleScene.stillUrl` (above). Out-of-zone/shared: `playwright.config.ts` (webServer env: HOUSE_DEMO_MODE, DEMO_HOUSE_TOKEN=e2e-demo, DEMO_ASSETS_DIR), `docs/tasks.json` (B10), `scripts/demo/export.ts` (Raphaël: strip the token from `stillUrl` too, one line).
- Next: Raphaël's House findings (Room names on Choose a room, alone-mode fading). His Studio finding (1) about the choice route status is Studio zone now (left for Alexandre).

### 2026-11-14 22:00 — Raphaël (design, Q4)
- Done: Q4. 14 Figma frames captured through the MCP (`get_screenshot`) and 8 new Studio code captures, all in `docs/design-evidence/`; `docs/DESIGN.md` §6 (MCP usage), §7 (13 new rows with deviations), §8 (axe WCAG 2.2 AA: 0 violations on 9 Studio screens; House already 0 on 8).
- Out-of-zone (Studio, Yasir): `app/studio/{page.tsx,care/page.tsx,stories/[id]/place/page.tsx,memories/[id]/review/page.tsx}` now read params/searchParams inside `<Suspense>`, because `pnpm build` (and main's CI) failed on 62be5c5. Same pattern as B8.
- In progress: nothing. Blocked: nothing.
- Next: Yasir: Requests above (Memory status after choices, Place background, Room names).
### 2026-11-14 21:10 — Yasir (studio takeover, S6–S9, SH3, SH4)
- Done: S9 Hear back `/studio?house=` (+ GET/PATCH/DELETE `/api/houses/:id`, GET `feedback`, `link`). SH3+SH4 `/studio/care` (Don't show list on House, whole-word warning on Memory sheet and Place; OK-alone default; privacy text; delete with confirmation). S8 `/studio/stories/[id]/place` (Slot map, up/down order, OK alone, publish + confirmation; `PATCH /api/stories/:id`, `POST /api/stories/:id/publish` refuses until every scene has a choice). S6+S7 `/studio/memories/[id]/review` (progress with slow zoom + live step name, then before/after, colour, motion, Use / Try again / Keep original; `POST /api/scenes/:id/choice`).
- In progress: nothing. SH5 (voice recording) not started.
- Blocked: nothing. P4 landed meanwhile (#25); S6/S7 call its routes as specified. `GET /api/memories/:id` doesn't fill `jobs`; S6 polls each scene's `jobId` instead.
- Deviations (no contract change): S6 restore/motion options are Memory-wide (`answers.restore/motion`), as there is no per-photo field. Refused free-text requests aren't shown (no contract field). SH4's OK-alone default is stored in the browser (no House field); new Memories pick it up. → Timoté: add `House.okAloneDefault` / per-scene options / refusals if wanted.
- Out-of-zone edits (Studio): app/api/houses/{[id]/**,_house-ops.ts,_mock-store.ts}, app/api/scenes/[id]/choice, app/api/stories/[id]/{route.ts,publish}, app/studio/{page.tsx,care,stories/[id]/place,memories/[id]/review}, components/studio/{HearBack,CarePrivacy,PlaceStory,ReviewMemory,DontShowWarning}.tsx, components/studio/{dont-show,studio-house}.ts, MemorySheetView.tsx, NewMemoryForm.tsx, lib/copy.ts (studio.hearBack/care/approve/place/progress).
### 2026-11-14 20:55 — Raphaël for Timoté (pipeline, P5)
- Done: P5 object_3d job. Source photo via new `Job.assetId`; cutout (BiRefNet, `image_url`) → Rodin v2.5 fast with `image_urls: [url]` (verified on fal's API page; price $0.10 from Test 4) → compress in process with gltf-transform (WebP textures ≤ 1024 px; keeps the raw GLB if compress fails or is not lighter) → `settleJob` sets the Story's GLB; on failure the Story keeps its library object. Engine: `FalPlan.input.list` sends a one-URL array.
- In progress: nothing.
- Blocked: nothing.
- Contract changes: `Job.assetId` (see Contract changes). Done outside Raphaël's zone, for Timoté. Studio zone touched (Alexandre): `app/api/rooms/[id]/stories/route.ts` now inserts a real `object_3d` job (live allowed), `app/api/stories/[id]/object-job/route.ts` advances it with `advanceJob`. The S2 synthetic progress stays only for the offline file store (`STUDIO_MOCK_STORE=true`, label `studio-mock`), which has no engine. New deps: `@gltf-transform/core|extensions|functions` (GLB compress), `sharp` (WebP encoder for gltf-transform).
- Next: Alexandre: the Object step can poll `/api/stories/:id/object-job` unchanged. BiRefNet price still unverified in `models.ts`.

### 2026-11-14 20:35 — Raphaël for Timoté (pipeline, P4)
- Done: P4 routes. `POST /api/memories/:id/generate` makes one Scene per photo and one scene Job each (idempotent: scenes with a job keep it), `GET /api/jobs/:id` advances and returns `JobView`, `POST /api/scenes/:id/retry` starts a `bypassCache` job (reuses a running one; 429 `rate_limited` after 5 retries per House per 10 min, in-memory). Memory status is computed (`memoryStatusOf`, §5.2) on generate/retry and when a scene job settles. Logic in `lib/jobs/generation.ts` with unit tests.
- In progress: P5 next.
- Blocked: nothing.
- Contract changes: none. Done outside Raphaël's zone, for Timoté. Shared edit: `lib/copy.ts` (+`studio.generation` API messages). Studio zone (Yasir/Alexandre): `pnpm build` failed on main (S3–S5 pages read `params` outside `<Suspense>`), so the 4 pages `app/studio/memories/[id]/{,questions/,sheet/}page.tsx` and `app/studio/stories/[id]/memories/new/page.tsx` now read params inside `<Suspense>` like B8.
- Next: "Bring to life" (S5) now reaches a real route; S7 review can poll `/api/jobs/:id` and call retry. Routes read MongoDB (F4), not the offline `STUDIO_MOCK_STORE` file store.

### 2026-11-14 20:40 — Yasir (studio takeover, S3–S5)
- Done: S3 Memory bank (`/studio/stories/[id]/memories/new` → `/studio/memories/[id]`: photo/video grid with remove, 2048 px JPEG client resize, song + voice clip, continue needs a photo/video), S4 guided questions with debounced PATCH autosave (`/questions`), S5 Memory sheet with "Change" links and "Bring to life" (`/sheet`). Routes: `POST /api/stories/:id/memories`, `GET/PATCH /api/memories/:id`, `POST /api/memories/:id/assets`, `DELETE /api/assets/:id`.
- In progress: nothing. P4, S7, S8, S9, SH3, SH4 were **not done** (parallel agents stopped for token cost); they're still open for Alexandre/Timoté.
- Blocked: "Bring to life" calls `POST /api/memories/:id/generate` (P4, not built yet) and then goes to `/studio/memories/[id]/review` (S7, not built yet). Until P4 lands it shows the friendly retry message.
- Contract changes: none. Out-of-zone edits (Studio zone, Alexandre): app/api/stories/_store.ts (+memories/scenes collections, `listEntities`, `deleteEntity`), app/api/{memories,assets}/**, app/api/stories/[id]/memories/route.ts, app/studio/{memories,stories/[id]}/**, components/studio/{MemoryBank,MemoryQuestions,MemorySheetView,NewMemoryForm,StudioPage,StudioQuery}.tsx, components/studio/{memory-client,memory-bank,memory-answers,memory-sheet-rows}.ts (+tests), CreateStoryForm.tsx ("Add a Memory" link), lib/copy.ts (studio.memory/bank/questions/sheet).
- Next: Alexandre to check the S3–S5 screens against the Figma frames "Create · 2 Memories" / "2b Memory sheet" (built from DESIGN.md + existing Studio styling, not the Figma MCP).

### 2026-11-14 20:35 — Timoté (pipeline, P2)
- Done: P2 scene chain live. Live run (`AI_MODE=live pnpm scene:run mocks/media/photo.jpg --colourise`): compile (Claude) 6 s → restore (Topaz Recover 3) 30 s $0.08 → colourise (Bria, returns PNG) 18 s $0.04 → animate (Kling 2.5 Turbo Pro) 94 s $0.35 → ambience (mmaudio) 9 s $0.005. **Total 157 s, ≈ $0.48**, 5.04 s 1656×1248 H.264 + AAC clip, all outputs in storage/. Models checked on fal's API pages; Bria colour guard; outputs keep their real extension (flac/png); `pnpm scene:run <photo> [--colourise] [--still]` runs one scene without Studio or P4.
- In progress: nothing. Note: the run used the generated mock test photo (480×360), not a real old family photo; fidelity on real photos is Test 2 / P6.
- Blocked: nothing.
- Contract changes: none. Out-of-zone/shared edits: scripts/ts-resolve.mjs (Node resolve hook for `@/` + extensionless imports, no new dependency), scripts/run-scene.mts, package.json (`scene:run`), lib/house/preload.ts (+`flac: "audio"`).
- Next: P5 (Object 3D job). Set `FAL_KEY_LABEL=dev-timote` in .env.local (it still says `dev-yourname`).

### 2026-11-14 20:20 — Raphaël (design)
- Done: Slot review (Alexandre's request): kitchen and living Slots now rest Objects on drawn surfaces (counter top, floor); garden unchanged. SH2: the demo House has Garden, Kitchen and Living, and Choose a room shows all three. Q4: House evidence in `docs/DESIGN.md` §7/§8, 7 captures, axe WCAG 2.2 AA: 0 violations on 8 House screens.
- In progress: Q4 stays ongoing (Figma-vs-code captures once the Figma MCP is re-authenticated).
- Blocked: nothing.
- Contract changes: none. Outside my zone: `components/studio/room-styles.ts` (Slot x/y/scale only, ids unchanged) → Alexandre, please check the Studio Room preview.
- Next: re-run `MONGODB_DB=mh_demo pnpm seed:demo && MONGODB_DB=mh_demo pnpm export:demo` so the DB demo picks up the new Slots.
### 2026-11-14 — Alexandre (studio, S2 final review)
- Done: S2 library/photo creation, House-scoped upload, persisted object_3d mock progress, fallback and resumable drafts implemented. Provisional free Slot explicitly approved, never reserved or published by S2. Corrected and registered B9: auth E2E alert locator scoped to the sign-in form. Tablet/phone captures saved under docs/design-evidence/create-object-*.png; direct Figma MCP comparison remains unavailable and is documented.
- In progress: Final checks and PR merge explicitly requested by Alexandre. Final integrated tree: verify passed (338 tests), production build passed, all 12 browser tests passed in development, and all 3 S2 scenarios passed against production, including invalid replacement upload recovery. The full production suite has one expected dev-only gallery failure (/dev/ui intentionally returns 404); its development run passes.
- Blocked: No mock-flow blocker. P5 remains a soft dependency: the temporary Studio provider uses a labelled synthetic GLB, refuses non-mock photo generation, and preserves the library fallback. S3 navigation awaits S3.
- Contract changes: None. New routes reuse CreateStoryRequest, Room, Story, Asset/AssetView and Job/JobView. Out-of-zone/shared edits: lib/copy.ts, e2e/create-story.spec.ts, e2e/studio-auth.spec.ts, TECHNICAL.md, docs/DESIGN.md, docs/tasks.json, design captures and this handoff; no new dependency or pipeline implementation edit.
- Next: Merge S2/B9 after green CI. Timoté replaces the mock Object provider with P5; S8 selects/reserves the final Slot atomically. No live credits, family data or .env reads used for validation.

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

### 2026-11-14 20:07 — Yasir (house)
- Done: H1 (`GET /api/h/:token/bundle`, demo mode reads `DEMO_ASSETS_DIR/bundle.json`, alone filter via `okAlone` flags), H2–H8 (`/house/[token]`: preload → Choose a room → R3F Room with SVG Objects → polaroids → Memory player with Howler ducking + still-photo fallback → Heart + `POST /api/h/:token/events` → alone mode), Q3 (`pnpm demo:check`, network blocked), C3 (30 s refresh applied only when nothing plays), B8 (build fix).
- In progress: nothing.
- Blocked: Q2 waits on S8 (Alexandre).
- Contract changes: none. Shared files: `lib/copy.ts` (`house.*`), `package.json` (three, @react-three/fiber, @react-three/drei, howler + types; `demo:check` script), `docs/tasks.json` (B8).
- Next: Q2 once S8 lands. Everyone: `pnpm demo:check` needs `HOUSE_DEMO_MODE`-capable demo-assets; without them run `DEMO_ASSETS_DIR=e2e/fixtures/demo-assets pnpm demo:check` (a test bundle of public SVGs only). No Zustand: the flow is a pure reducer in `lib/house/flow.ts`. Slot `x,y` = Object centre, `scale` = width / 1194.

### 2026-11-14 20:15 — Timoté (pipeline)
- Done: P1 job engine in `lib/jobs/`. `advanceJob(id, defaultEngineDeps())` with DB lease (lease value doubles as write token), step plans (disabled steps kept as `skipped`), 2 retries with 5 s / 15 s backoff, then `fallback` (scene) or `failed` (object/room), concurrency cap `FAL_MAX_CONCURRENCY`, budget guard per `FAL_KEY_LABEL` (switches to mock, `step.error = "budget_exceeded"`), cache keyed on model + sorted params + input sha256 (live outputs only). Ticker started once from `instrumentation.ts` (5 s, 4 jobs). `settleJob` writes scene outputs/status, room background, story GLB. 24 unit tests.
- In progress: nothing.
- Blocked: nothing. Gap: `Job` has no asset id for `object_3d`, so its source photo cannot be found yet (P5 adds it, additive change).
- Contract changes: none. Outside lib/jobs: `lib/ai/fal.ts` (`getFal(mode)`, `isMockRequestId`), `instrumentation.ts`.
- Next: P4 routes (generate / job / retry), then P2 live. Note: Rodin price in `models.ts` is still $0.40, Test 4 measured $0.10 (fix in P5).

### 2026-11-14 20:10 — Raphaël (design)
- Done: B7 `pnpm export:demo`. Reads the demo House (token `DEMO_HOUSE_TOKEN`) from `MONGODB_DB`, builds it with H1's `buildBundle` and writes `DEMO_ASSETS_DIR/bundle.json` without tokens, with `okAlone: true` markers for alone mode. Test: seed plan → export → `loadDemoBundle` steps round trip.
- In progress: nothing.
- Blocked: not run against Atlas yet (needs demo-assets). Flow: `MONGODB_DB=mh_demo pnpm seed:demo`, then `MONGODB_DB=mh_demo pnpm export:demo`. Demo mode still reads files from STORAGE_DIR, so seed on the demo laptop.
- Contract changes: none. Outside my zone: `package.json` (export:demo script).
- Next: real demo content into demo-assets with the team.

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

### Template
```
### <YYYY-MM-DD HH:MM> — <name> (<zone>)
- Done:
- In progress:
- Blocked:
- Contract changes:
- Next:
```
