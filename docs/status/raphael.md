# Autopilot handoffs — raphael

Newest on top. Written by the agent after each task (what was done, Human TODO, Requests). Read this in the morning.

- **H10 done:** `components/ui/{shimmer-bar,moving-dots,step-progress}.tsx` (CSS-only, static under reduced motion, fixed heights), `lib/job-estimates.ts` (+test, average seconds per step) and applied in ReviewMemory (generation progress + "about N minutes"), CreateStoryForm (3D object wait), HouseApp preload (dots only).
- Outside zone: `components/studio/{ReviewMemory,CreateStoryForm}.tsx`, `components/house/house-app.tsx` (few lines each), `lib/copy.ts` (`aboutMinutes`), keyframes in `app/globals.css`.
- Human TODO: eyeball the three waits in the browser; re-measure `STEP_SECONDS` after a live run.
- Request: none.

