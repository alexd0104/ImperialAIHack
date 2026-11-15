# Autopilot handoffs — raphael

Newest on top. Written by the agent after each task (what was done, Human TODO, Requests). Read this in the morning.

- **S14 done (08:05, interactive):** live `objects:make` → `public/objects/glb/{armchair,record-player,teapot}.glb` (534–692 KB) + thumbs, committed. Library lists them first as `3d-<name>` (`components/studio/object-library.ts` + test); the stories route stores `{kind:"glb", path:"/objects/glb/<n>.glb"}`; the bundle serves that static path as-is; PlacementEditor shows the thumb; `pnpm objects:make` script added.
- Outside zone: `app/api/rooms/[id]/stories/route.ts`, `components/studio/{CreateStoryForm,PlacementEditor}.tsx` (Studio), `lib/house/bundle.ts` (House), `lib/copy.ts`, `package.json`.
- Human TODO: pick a 3D default in a new Story and check it floats in the House. P9 beds still need ffmpeg + `AI_MODE=live pnpm beds:make`.

- **Q5 done (code):** `lib/lab/` (4 approaches as functions → MemorySheet, mock model, 5 test photos, `runExperiment` → 20 runs through the prompt compiler, live Claude model) + `scripts/lab-experiment.mts` (`pnpm lab:experiment`; mock writes 20 `lab_runs` to MongoDB, or `storage/lab/runs.json` if no DB) + `docs/LAB-REPORT.md` template. No `/dev/lab` page (not worth it).
- Outside zone: `package.json` (script only).
- Human TODO: `AI_MODE=live pnpm lab:experiment --photos <dir>` (≈ $10; beach/fireplace/garden/wedding/kitchen .jpg), generate and review outputs, enter scores, fill the verdict in `docs/LAB-REPORT.md`. Live model code is untested.
- Request: none.

- **H11 done:** bundle now carries a content `version` (`lib/house/bundle.ts`); the existing 30 s poller compares it (`lib/house/refresh.ts` `bundleChanged`, `diffObjects` + test) and still applies only when calm. `room-scene.tsx` fades moved/removed Objects out then the new layout in (~1.2 s), new Objects fade in, new backgrounds cross-fade; `room-canvas.tsx` keys Objects by Story id.
- Outside zone: none beyond the brief's files.
- Human TODO: run `pnpm demo:check` (not run); manually move an Object in the Studio and watch the House update within 30 s with a fade, also while a Memory plays (must wait until closed).
- Request: none.

- **H9 done:** review clip plays with sound (`controls`, no `muted`/autoplay), stills show an `<audio controls>` for their separate ambience; "Play full memory" (`components/studio/MemoryPreview.tsx`) opens the House `MemoryPlayer` with a new `preview` prop (X close instead of Home) on a bundle built client-side by `lib/studio/preview-memory.ts` (+test).
- Outside zone: `components/house/memory-player.tsx` (preview prop, few lines), `lib/copy.ts` (`closePreview`, `playFull`).
- Human TODO: listen in the browser to an animated scene and a still in review; open "Play full memory", check song+voice+ambience mix and close; run `pnpm demo:check` (not run here).
- Request: none.

- **P9 re-checked (still wip):** `pnpm verify` green (431 tests). Code unchanged; nothing left that code alone can finish.
  Human TODO: `pnpm beds:make` (live, ≈ $0.05), listen, commit `public/beds/*.mp3` (≤ 300 KB each).
  Request (Yasir): the House player must mix `scene.bedUrl` at ≈ 25 % under ambience/song, ducked by the voice, and ignore it silently if the file fails to load.

- **P9-wip:** `lib/ai/beds.ts` (6 beds, `pickBed` from sound events, `bedUrl`), `lib/house/bundle.ts` sets `bedUrl` on bundle scenes (stored `bedId` wins, else pick; preloaded), `scripts/make-beds.mts` + `pnpm beds:make`; tests added. mp3 files NOT created (need live fal).
- Outside zone: `lib/house/bundle.ts`, `lib/house/bundle.test.ts`, package.json script.
- Human TODO: `AI_MODE=live pnpm beds:make` (≈ $0.05, needs ffmpeg), listen to the 6 loops in `public/beds/`, check ≤ 300 KB, commit them.
- Request (Yasir): `MemoryAudio` (lib/house/audio.ts) must play `scene.bedUrl` as a looping Howl at ≈ 0.25 volume under ambience/song, switching per scene, never ducked above the voice (duck it with the song while the voice plays); a missing file must stay silent.
- **S15-wip:** `lib/ai/room-photo.ts` (cleanRoomPhoto/fitRoomPhoto: mock = crop 1194×834 ≤400 KB, live = roomEdit), `pnpm rooms:make`, `public/rooms/living-room.jpg` generated (mock); `room-styles.ts` uses .jpg when listed in `photoRooms`, SVG otherwise; living Slots moved onto mantel/console/coffee table (also `scripts/demo/plan.ts`).
- Outside zone: `app/api/houses/route.test.ts` (living now .jpg), `scripts/demo/plan.ts`, `components/studio/room-styles.ts`, package.json script.
- Human TODO: only living-room.jpg was in `public/rooms/src/`; add garden.jpg and kitchen.jpg, run `pnpm rooms:make`, add them to `photoRooms` (room-styles.ts) and PRESET_BACKGROUNDS/slots (plan.ts); live run `AI_MODE=live pnpm rooms:make` (~$0.15) and check results; re-run `pnpm seed:demo` + `pnpm export:demo`; visually check Slot positions.

- **H10 done:** `components/ui/{shimmer-bar,moving-dots,step-progress}.tsx` (CSS-only, static under reduced motion, fixed heights), `lib/job-estimates.ts` (+test, average seconds per step) and applied in ReviewMemory (generation progress + "about N minutes"), CreateStoryForm (3D object wait), HouseApp preload (dots only).
- Outside zone: `components/studio/{ReviewMemory,CreateStoryForm}.tsx`, `components/house/house-app.tsx` (few lines each), `lib/copy.ts` (`aboutMinutes`), keyframes in `app/globals.css`.
- Human TODO: eyeball the three waits in the browser; re-measure `STEP_SECONDS` after a live run.
- Request: none.

