# FEATURES-V2.md — memorAI, night of 14→15 Nov

Second round of features from the team's feedback, decided on 14 Nov 23:30. Each task below is self-contained so an agent can run it **unattended** (see `docs/AUTOPILOT.md`). Read only your task's section: `node scripts/doc.mjs docs/FEATURES-V2.md P7`.

Order = the team's priority. Owners and dependencies are machine-readable in `docs/tasks.json` (tasks with `"release": "v2"`). Everything works in `AI_MODE=mock`; nobody spends live credits unattended.

## Rules for every v2 task

- Work on `main`: `git pull --rebase`, small commits, `pnpm verify`, push. Commit subject ends with `(<ID>)`; partial work `(<ID>-wip)`.
- **Stay inside the files listed in your task.** If you must touch another file, keep it to a few lines and say so in `docs/STATUS.md`.
- **The UI redesign (SH8, Raphaël) is coming.** Build with existing `components/ui` and tokens; put any new reusable visual element in `components/ui/` so it can be restyled in one place. Do not invent new visual styles.
- Product rules in `AGENTS.md` §3 still apply (no false memories, House never looks broken, real voices only).
- Blocked or failing twice? Write a Request in `docs/STATUS.md`, add a `B<n>` task if needed, push a runnable `(<ID>-wip)` and move to your next task.

## Contracts v2 (what F7 adds — reference for everyone)

| Where | Field / route | Shape |
|---|---|---|
| Scene | `motion` | `{ preset: "gentle" \| "custom", text?: string (≤ 200), durationSec: 5 \| 10 }`, default `{ preset: "gentle", durationSec: 5 }` |
| Scene | `soundMode` | `"clip" \| "text"` (default from env `SOUND_MODE_DEFAULT`, `text` for families) |
| Scene outputs | `bedId?`, `soundEvents?` | ambience bed chosen (P9), sound events used (P8) |
| Compiler output | `soundEvents: string[]`, `ambienceNegativePrompt: string`, `motionRefused?: string` | per scene |
| Story | `position?` | `{ x: 0..1, y: 0..1, scale: 0.05..1 }` on the 1194×834 canvas; absent → use its Slot |
| Room | `background` | `{ kind: "style", style: "garden"\|"kitchen"\|"living" } \| { kind: "photo", assetId, path? }`; `pendingBackground?` (same shape + `jobId`) kept until the job finishes |
| HouseBundle | `version` | string that changes whenever the House content changes (for live refresh) |
| HouseBundle scene | `bedUrl?` | quiet ambience loop under the scene sound (P9) |
| HouseBundle story | `position` | always resolved `{ x, y, scale }` (from Story.position or Slot) |
| Job type | `scene_sound` | sound-only job (P10) |
| Collection | `lab_runs` | `{ id, approach: "questions"\|"free_text"\|"photo_questions"\|"agent", photoAssetId, inputs, sheet, prompts, outputs, scores?: { fidelity, motion, sound, liked } (1–5), createdAt }` |
| API | `PATCH /api/scenes/:id` | `{ motion?, soundMode? }` before generation |
| API | `PATCH /api/rooms/:id`, `DELETE /api/rooms/:id`, `POST /api/houses/:id/rooms` | name, background (style or photo → `room_edit` job), cascade delete |
| API | `PATCH /api/stories/:id` | adds `position?` |
| Env | `SOUND_MODE_DEFAULT`, `ENABLE_LAB` | added to `.env.example` and `pnpm env:check` |

---

### F7 — Contracts v2
- **Owner:** Timoté · **Order:** 0 (first, interactive, ~30 min) · **Deps:** none
- **Files:** `lib/contracts/**`, `lib/db/**` (types/mapping only), `.env.example`, `scripts/check-env.mjs`, fixtures, `docs/STATUS.md`.
- **Do:** add every field/route shape in the table above as Zod schemas (additive, optional where possible, defaults as stated), DB mapping for new fields, fixtures + tests, env vars. Route *handlers* are NOT part of F7 (each feature task owns its handlers).
- **Done when:** `pnpm verify` green, fixtures parse, "Contracts v2 published (F7)" with a 5-line summary under Contract changes in `docs/STATUS.md`.

### P7 — Movement type and length per photo
- **Owner:** Timoté · **Order:** 1 · **Deps:** F7
- **Files:** `lib/ai/prompt-compiler.ts`, `lib/ai/prompt-templates.ts`, `lib/jobs/plans.ts`, `lib/jobs/steps.ts` (animate params), `app/api/scenes/[id]/route.ts` (PATCH), new `components/studio/MotionPicker.tsx`, and **at most a few lines** in the Studio page that shows per-photo options to mount it.
- **Do:** per photo, a "Gentle" chip (pre-selected) + free text ("running on the beach") + length 5 s / 10 s; saved via `PATCH /api/scenes/:id`. Compiler runs per scene: motion text allowed only for people/objects already in the photo; anything absent is dropped and `motionRefused` is shown gently ("We only bring to life what is in the photo"). Animate step uses `durationSec`; cost estimate follows (10 s ≈ 2×).
- **Done when:** unit tests (custom text → motionPrompt; "add a dog" refused; 10 s sets duration "10"); works in mock; sheet/review still show the right data.

### H9 — Hear the sound in review + "Play full memory"
- **Owner:** Yasir · **Order:** 2 · **Deps:** none
- **Files:** `components/studio/ReviewMemory.tsx` (media part only), `components/house/memory-player.tsx` (add a `preview` mode), small wrapper `components/studio/MemoryPreview.tsx`.
- **Do:** the review clip plays **with its sound** (it contains the muxed ambience; remove `muted`, start on user click, volume control). Add "Play full memory" that opens the House `MemoryPlayer` in preview mode with song + voice + ambience exactly as Frank hears it (no Heart, close button instead).
- **Done when:** sound audible in review for an animated scene and for a still (separate ambience file); preview plays the mix; House behaviour unchanged (`pnpm demo:check` green).

### P8 — Better sound prompts
- **Owner:** Timoté · **Order:** 3 · **Deps:** F7
- **Files:** `lib/ai/prompt-compiler.ts`, `lib/ai/prompt-templates.ts`, `lib/ai/models.ts` (MMAudio params), `lib/jobs/steps.ts` (ambience params).
- **Do:** compiler outputs explicit **sound events** from answers + photo ("people laughing", "waves breaking", "wind") and an `ambienceNegativePrompt` ("static, hiss, noise, hum, distortion, music, speech"). MMAudio gets prompt = events, `negative_prompt`, duration = clip length, tuned steps/strength (check the model page on fal for exact parameter names). Keep "no music" (the real song plays on top).
- **Done when:** unit tests for events extraction (beach + laughing answers → laughter + waves); one manual live run on the beach photo with the result noted in `docs/STATUS.md` (human, not autopilot).

### P9 — Ambience bed library (safety net)
- **Owner:** Raphaël (autopilot) · **Order:** 4 · **Deps:** F7
- **Files:** `public/beds/*.mp3` (≤ 300 KB each), `lib/ai/beds.ts`, `lib/house/` bundle field mapping (add `bedUrl` to the bundle scene; note it for Yasir in your handoff), `scripts/make-beds.mts`.
- **Do:** 6 short loops (beach, crowd laughter, fireplace, garden birds, kitchen, rain), generated **once** with fal text-to-audio by a human (`pnpm beds:make`, live, ≈ $0.05) and committed — generated audio, no copyright issue. Compiler/tagger picks one bed per scene from the sound events; the House plays it quietly (≈ 25 %) under the scene sound.
- **Done when:** beds committed, mapping tested, House mixes bed + ambience + song + voice with the voice still ducking everything.

### H10 — Loading feedback everywhere
- **Owner:** Raphaël (autopilot; `components/ui` is his zone) · **Order:** 5 · **Deps:** none
- **Files:** new `components/ui/shimmer-bar.tsx`, `components/ui/moving-dots.tsx`, `components/ui/step-progress.tsx`; apply in the **generation progress** screen, the **3D object** wait, and the **House preload** (dots only, no text). Other Studio forms adopt them in their own tasks.
- **Do:** CSS-only animations (respect `prefers-reduced-motion`), step progress with real step names from job status + estimated time from measured durations (keep a small table of averages in `lib/copy.ts` or job config).
- **Done when:** every long wait in those three places shows movement; no layout shift; reduced-motion shows a static bar.

### S10 — Back navigation in the new-Story steps
- **Owner:** Alexandre · **Order:** 6 · **Deps:** none
- **Files:** `app/studio/stories/**`, `app/studio/memories/[id]/**` layout/routing, new `components/studio/StepNav.tsx`.
- **Do:** each step is a route under a shared layout with a clickable stepper and a Back button; browser Back works; autosave keeps every input. After generation started, "Change answers" asks for confirmation and regenerates (retry route with cache bypass).
- **Already there (B12, Yasir):** `components/studio/StudioNav.tsx`, `studio-nav.ts` (header, back links to parent, "Step n of 5"). Build on them, don't duplicate: what's missing is the clickable stepper, browser-Back between steps and autosave.
- **Boundaries:** do not rewrite the step contents (P7 mounts MotionPicker in the per-photo options; H9 edits ReviewMemory's media). Move components, don't fork them.
- **Done when:** you can go back and forth through all steps without losing input; e2e smoke still green.

### S11 — Room management
- **Owner:** Alexandre · **Order:** 7 · **Deps:** F7
- **Files:** `app/api/rooms/**`, `app/api/houses/[id]/rooms/**`, new `components/studio/RoomManager.tsx`, Studio dashboard entry point.
- **Do:** reuse `lib/ai/room-photo.ts` for the photo cleanup (S15 creates it; if it does not exist yet, create it there). Create a room (style or photo), rename, change background (style or photo → `room_edit` job with Nano Banana cleanup; **keep the old background until the new one is ready**, then swap), delete with confirmation (cascade Stories, Memories, scenes, files). Use H10 loaders for the room photo wait.
- **Done when:** all four actions work in mock; House shows the new background after refresh; delete cascades (test).

### S12 — Place objects freely (editor)
- **Owner:** Alexandre · **Order:** 8 · **Deps:** F7
- **Files:** new `components/studio/PlacementEditor.tsx`, `app/studio/stories/[id]/place/**` (replace slot picker), `app/api/stories/[id]/route.ts` (position).
- **Do:** 2D editor: room image at 1194×834 (letterboxed), object thumbnails on top; drag to move, corner handle to resize, works with touch; saves `Story.position` (normalised). Suggested spots (old Slots) shown faintly.
- **Done when:** positions persist and appear at the same place in the House bundle; unit test for normalisation.

### H11 — House live refresh + gentle move
- **Owner:** Yasir · **Order:** 9 · **Deps:** F7
- **Files:** `lib/house/**`, `components/house/house-app.tsx`, `components/house/room-scene.tsx`, `app/api/h/**` (bundle `version` + resolved `position`).
- **Already there (C3):** a 30 s refresh applied only when nothing plays. Add the `version` check, preload and fades on top of it; don't write a second poller.
- **Do:** refetch the bundle every 30 s (skip while a Memory is playing); if `version` changed, preload new files, then objects that moved fade out and fade in at the new place (~1.2 s), new objects fade in, removed ones fade out. Rooms with a new background cross-fade. Never interrupt playback.
- **Done when:** demo:check green; manual test: move an object in the Studio → House updates within 30 s with a fade.

### S15 — Demo room backgrounds from team photos
- **Owner:** Raphaël (autopilot, tonight) · **Order:** 6 · **Deps:** none · **Requires files:** `public/rooms/src/{garden,kitchen,living-room}.jpg` (the team's own room photos; other names become extra styles)
- **Files:** `lib/ai/room-photo.ts` (shared cleanup function; S11 reuses it — if it already exists, reuse it), `scripts/make-rooms.mts` (`pnpm rooms:make`), `public/rooms/*.jpg`, `components/studio/room-styles.ts`, demo seed Slot positions if they no longer fit.
- **Do:** the script sends each photo through the room cleanup (fal image edit via `lib/ai`, prompt: tidy and light the room as it is, remove people and clutter, **add nothing**), crops/resizes to 1194×834, writes `public/rooms/<name>.jpg` (≤ 400 KB). In mock mode it just crops/resizes the source so everything is testable. `room-styles.ts` uses the `.jpg` when present, the `.svg` otherwise (fallback kept). Suggested Slots: adjust so objects sit on surfaces (table, shelf, floor) of the new pictures.
- **Human:** live run `AI_MODE=live pnpm rooms:make` (≈ $0.15), look at the 3 results, commit; re-run `pnpm seed:demo` + `pnpm export:demo` for the demo House.
- **Done when:** mock run writes the files, Studio and House show the photo backgrounds, SVG fallback still works.

### S14 — Default 3D objects from 3 images
- **Owner:** Raphaël (autopilot, tonight) · **Order:** 10 · **Deps:** none · **Requires files:** `public/objects/src/*.{png,jpg}` (the team adds 3 photos of objects)
- **Files:** new `scripts/make-objects.mts` (`pnpm objects:make`), `public/objects/glb/`, `public/objects/thumbs/`, `components/studio/object-library.ts`, House object renderer (GLB path only).
- **Do:** the script runs each source image through the existing 3D chain (`lib/ai`: cutout → Rodin → GLB compress, same as P5), writes `public/objects/glb/<name>.glb` (≤ 3 MB) and a PNG thumbnail. In mock mode it writes the mock GLB so everything is testable. List the defaults first in the object library (available in every room); the House renders them with the existing shadow/float; SVG objects stay as fallback.
- **Human:** the live run (`AI_MODE=live pnpm objects:make`, ≈ $1.50, ~5 min), then commit the 3 GLBs + thumbs.
- **Done when:** mock run produces 3 files, library lists them, House renders them; test for the script's file naming.

### S13 — Studio logout button (done by B12)
- **Owner:** Alexandre · **Order:** 11 · **Deps:** none
- **Files:** Studio header component, `lib/copy.ts` (one string).
- **Do:** keep the existing studio password login (`STUDIO_PASSWORD`, no new account). Add a "Log out" button in the Studio header calling the existing `POST /api/auth/logout`, then go to `/studio/login`.
- **Done when:** logout works and protected Studio pages redirect to login afterwards (test).

### Q5 — Prompting experiment (which non-technical approach gives the best prompts?)
- **Owner:** Yasir · **Order:** 12 · **Deps:** F7, P7
- **Files:** `scripts/lab-experiment.mts`, `lib/lab/**`, optional `app/dev/lab/**` (only if `ENABLE_LAB=true`), `docs/LAB-REPORT.md`.
- **Do:** implement the 4 approaches as functions producing a MemorySheet: (a) current questions, (b) one free text, (c) 3 questions adapted to the photo by Claude vision, (d) a short written agent conversation (scripted answers for reproducibility). The script runs them on 5 test photos (beach, fireplace, garden + 2 more) and stores runs in `lab_runs`. **Mock by default**; live run only when a human launches it (`AI_MODE=live pnpm lab:experiment --photos <dir>`, ≈ $10). Results reviewed on fal / in the lab; scores 1–5 on fidelity, motion, sound, "would the family like it"; `docs/LAB-REPORT.md` says which approach wins and why. The implementer chooses whether a minimal `/dev/lab` page is worth it.
- **Done when:** mock run produces 20 `lab_runs`; report template ready; live run + scores done by a human.

### SH8 — UI redesign v2
- **Owner:** Raphaël · **When:** Sunday morning, interactive · **Deps:** none
- **Files:** `app/globals.css`, `components/ui/**`, styling of Studio/House screens (classes and layout only, not logic), `docs/DESIGN.md`.
- **Do:** apply the new design from Figma. Restyle; do not change data flow or props unless needed. Split into `B<n>` sub-tasks with `node scripts/tasks.mjs add` if large. Pull often: features are landing in the same screens.

### P10 — Sound and video in parallel (least important)
- **Owner:** Timoté · **Order:** 14 · **Deps:** F7, P8
- **Files:** `lib/jobs/**` (new `scene_sound` job type and plan), generation route.
- **Do:** when `soundMode === "text"`, create a `scene_sound` job alongside the scene job (sound from photo + text, no clip); scene job skips its ambience step; scene outputs merge both. `clip` mode unchanged. No change to the engine core.
- **Done when:** unit tests for both modes; mock generation shows sound and video finishing independently.
