# Zone: Pipeline + contracts — Timoté (lead)

**Mission:** turn a MemorySheet and real photos into restored, animated, sound-dressed scenes, reliably and cheaply; own the contracts every other zone builds on.

**Paths:** `lib/contracts/`, `lib/db/`, `lib/storage/`, `lib/ai/`, `lib/jobs/`, `lib/http.ts`, `lib/session.ts`, `app/api/jobs/`, `app/api/files/`, `app/api/auth/`, `app/api/memories/[id]/generate/`, `app/api/scenes/[id]/retry/`, `instrumentation.ts`, `proxy.ts`, `mocks/`, `.github/`, `.claude/`, root configs.

**Features:** F1, F2, F3, F4, F6, P1–P6, Q1 (+ SH1 job, SH6, C1, C2, C4, C5). See `FEATURES.md`.

**Order:** F1 → F2 (publish within the first hour: others depend on it) → F3 mocks → F4 → F6 → P1 → P3 → P4 → P2 (live) → P5 → P6.

**Contracts you publish (v1, first hour):** entities (House, Room+Slot, Story, Memory, Asset, Scene, Job, Event), `MemorySheet`, `HouseBundle`, all route I/O of `TECHNICAL.md` §4.3, error envelope, `lib/http.ts` helpers (`ok`, `fail`, `parseJson`).

**Interfaces others rely on:**
- Studio: generate/job/retry routes, job status shape with `steps[].name/status` and preview URLs, Memory status values.
- House: `HouseBundle` schema and stable file URLs (`/api/files/...`).
- Everyone: `AI_MODE=mock` behaves like live.

**Definition of done (zone-specific):** unit tests for engine, compiler, cache, budget; one real end-to-end scene logged with time + cost in `docs/STATUS.md`; no model ID outside `lib/ai/models.ts`.

**Watch list:** Kling quality (Test 2) → Veo 3.1 swap is a one-line change in `models.ts`.
