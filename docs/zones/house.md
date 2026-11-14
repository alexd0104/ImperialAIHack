# Zone: House (viewer side) — Yasir

**Mission:** a calm, familiar room where a person living with Alzheimer's taps an object and lives a Memory, with nothing to read and nothing that can look broken.

**Paths:** `app/house/`, `components/house/`, `lib/house/`, `app/api/h/`, `e2e/`, `scripts/demo-check.ts`.

**Features:** H1–H8, Q2, Q3 (+ C3). See `FEATURES.md`. Behaviour table: `TECHNICAL.md` §3.4. Figma frames: `docs/DESIGN.md`.

**Order:** Test 1 (GLB vs SVG) → H1 with a hand-written `bundle.json` → H2 → H3 → H4 → H5 → H6 → H7 → H8 → Q3 → Q2.

**Rules specific to House:**
- Single tap only; targets ≥ 64 px (Pause 124, Back 92, Return 76, Heart 230, Rooms 64).
- No error text, no spinner after preload; failed clip → original photo with slow zoom and the same sound.
- Objects never move; Slot positions are normalised on a 1194 × 834 canvas and letterboxed.
- First tap unlocks audio (Howler inside the tap handler). Voice ducks music to 30 %.
- R3F scene is client-only (`dynamic(..., { ssr: false })`); GLBs ≤ 3 MB; ≤ 6 objects per Room.
- `prefers-reduced-motion`: fades only.
- Alone mode: unavailable Objects stay in place at 0.28 opacity and ignore taps.
- Strings (very few) in `lib/copy.ts` under `house.*`.

**Demo mode:** `HOUSE_DEMO_MODE=true` → `/house/demo-token` reads `demo-assets/bundle.json`, no DB. This is what runs on stage; `pnpm demo:check` must pass on every laptop on Sunday morning.

**Definition of done (zone-specific):** `pnpm demo:check` green; manual House checklist (`TESTING.md` §5) all ticked.
