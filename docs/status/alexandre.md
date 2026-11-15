# Autopilot handoffs — alexandre

Newest on top. Written by the agent after each task (what was done, Human TODO, Requests). Read this in the morning.

- S10 (update): questions step now flushes unsaved typing on unmount (stepper/Back inside the 700 ms debounce), so no input is lost going back and forth. Still NOT done: "Change answers" confirm + regenerate (needs retry cache-bypass).
- S10 (partial): clickable stepper `components/studio/StepNav.tsx` (earlier steps link; `stepHref` in studio-nav.ts, tested) replaces "Step n of 5" in StudioNav. Routes per step + back links + browser Back already existed. Files outside zone: `lib/copy.ts` (step labels).
- Human TODO: check the stepper visually on the tablet; e2e smoke not run here.
- NOT done: autosave of step inputs, and "Change answers" confirm + regenerate after generation (needs retry route with cache bypass, Timoté zone). Request: Timoté — retry route cache-bypass flag.

