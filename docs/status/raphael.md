# Autopilot handoffs — raphael

Newest on top. Written by the agent after each task (what was done, Human TODO, Requests). Read this in the morning.

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

