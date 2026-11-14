---
name: add-fal-step
description: Add or swap a fal.ai model in the memorAI generation chain (models.ts, step handler, mock fixture, cache key, cost). Use when touching lib/ai or lib/jobs/steps.
---

Follow `docs/playbooks/add-fal-step.md` exactly. It is the single source shared with Codex; read it now before writing code.

Summary: verify the model ID and input schema on fal (`https://fal.ai/models/<id>/api`) → add it to `lib/ai/models.ts` with price → step handler in `lib/jobs/steps/` using queue submit/status/result → download output to storage → mock fixture in `mocks/fal/` → cache key includes model + params → unit test → update `TECHNICAL.md` §7.1.
