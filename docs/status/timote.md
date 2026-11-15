# Autopilot handoffs — timote

Newest on top. Written by the agent after each task (what was done, Human TODO, Requests). Read this in the morning.

**P8 — Better sound prompts (done in code, mock).** `extractSoundEvents` (keyword rules over answers, free text and photo description) feeds `soundEvents` + `ambienceNegativePrompt` on every compile (Claude, mock or template); ambience step now sends `prompt`, `negative_prompt`, `duration` = clip length, `num_steps` 25, `cfg_strength` 5.5 via `ambienceParams` (`lib/jobs/plans.ts`). "no music" kept. Old template test updated to the new event wording.
Files outside my zone: none. `lib/ai/models.ts` unchanged (params live in `ambienceParams`).
Human TODO: one live run on the beach photo, listen, note result in docs/STATUS.md; check on fal that `num_steps`/`cfg_strength`/`negative_prompt` names match mmaudio-v2 and tune cfg_strength by ear.
Request: none.

**P7 — Movement type and length per photo (done in code, mock).** Compiler takes `motion` (custom text is added only if `detectRefusedRequests` finds no add/change request, else dropped with `motionRefused`); compile and animate steps read the Scene's motion; animate sends `duration` "5"|"10" and the cost estimate follows (`FalPlan.seconds`). New `PATCH /api/scenes/:id`, `MotionPicker` mounted in `SceneApproval` (applies on "Try again").
Files outside my zone: `app/api/scenes/[id]/route.ts`, `components/studio/MotionPicker.tsx`, `components/studio/ReviewMemory.tsx` (1 line + import), `lib/copy.ts` (`studio.motion`).
Human TODO: check MotionPicker visually in the Studio; one live run with a 10 s clip. The refusal of absent things is a keyword check plus a rule in the live compiler prompt: not tested live.
Request: Alexandre/Raphaël, restyle MotionPicker if the Studio review screen changes (SH8).

