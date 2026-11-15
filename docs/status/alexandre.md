# Autopilot handoffs — alexandre

Newest on top. Written by the agent after each task (what was done, Human TODO, Requests). Read this in the morning.

- S10 (done): back navigation. Clickable stepper `StepNav.tsx` (earlier steps link, in `StudioNav`), browser Back works (each step is its own route), questions autosave flushes on leaving the step. New: once scenes exist, the sheet's button reads "Change answers and bring to life again", asks `window.confirm`, then calls generate and `POST /api/scenes/:id/retry` per scene (cache bypass). Files outside zone: `components/studio/MemorySheetView.tsx` (button only), `lib/copy.ts` (2 strings).
- Human TODO: click through all 5 steps back and forth on the tablet; try "Change answers" on a Memory with approved scenes (it regenerates them, approved choices are replaced). Not done: no Playwright test for the stepper. Request: none.

- S12: Free placement. `components/studio/PlacementEditor.tsx` (drag to move, corner handle to resize, pointer events so touch works, faint old Slots snap on tap) replaces the slot picker in `PlaceStory.tsx`; `placement.ts` holds the normalisation (tested). `PATCH /api/stories/:id` now saves `position` (`null` clears it). The bundle builder uses it. Files outside zone: `lib/house/bundle.ts` (few lines: `story.position` in the bundle Story and used as the slot's x/y/scale so the House shows it there), `lib/copy.ts`.
- Human TODO: try dragging/resizing on the tablet; check the House shows the Object at the saved spot. glb Objects show a plain placeholder box in the editor (no 2D picture). Not done: no test for the bundle position and no Playwright test. Request: Yasir — House could read `story.position` directly if it prefers.

- S11: Room management. `PATCH/DELETE /api/rooms/:id`, photo rooms in `POST /api/houses/:id/rooms`, logic in `app/api/houses/_room-ops.ts` (reuses `lib/ai/room-photo.ts`), `components/studio/RoomManager.tsx` on the Studio home (with a house). Delete cascades Stories, Memories, Scenes, Assets and files (tested). Deviation: the photo cleanup runs inside the request (not a `room_edit` job); the old background stays until the new file is saved, then it is swapped. Copy added in `lib/copy.ts` (`studio.rooms`).
- Human TODO: try the RoomManager in the browser (mock and live fal cleanup, which can take ~30 s); check House shows the new background after refresh. Not done: dedicated H10 loader (used MovingDots), no Playwright test.

- S10 (update): questions step now flushes unsaved typing on unmount (stepper/Back inside the 700 ms debounce), so no input is lost going back and forth. Still NOT done: "Change answers" confirm + regenerate (needs retry cache-bypass).
- S10 (partial): clickable stepper `components/studio/StepNav.tsx` (earlier steps link; `stepHref` in studio-nav.ts, tested) replaces "Step n of 5" in StudioNav. Routes per step + back links + browser Back already existed. Files outside zone: `lib/copy.ts` (step labels).
- Human TODO: check the stepper visually on the tablet; e2e smoke not run here.
- NOT done: autosave of step inputs, and "Change answers" confirm + regenerate after generation (needs retry route with cache bypass, Timoté zone). Request: Timoté — retry route cache-bypass flag.

