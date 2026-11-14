# Zone: Studio (family side) — Alexandre (Codex)

**Mission:** let a non-technical family member create a Memory in about five minutes, approve every scene, and publish a Story into the House.

**Paths:** `app/studio/`, `components/studio/`, `app/api/houses/`, `app/api/rooms/`, `app/api/stories/`, `app/api/memories/` (not `generate`), `app/api/assets/`, `app/api/scenes/[id]/choice/`.

**Features:** S1–S9 (+ SH3, SH4, SH5). See `FEATURES.md`. Figma frames and routes: `docs/DESIGN.md`.

**Order:** S1 → S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9. Work on mocks (`AI_MODE=mock`) from the start; you never wait for the live pipeline.

**Rules specific to Studio:**
- Plain language everywhere, no technical words ("job", "model", "prompt" never shown). Strings in `lib/copy.ts` under `studio.*`.
- Autosave every step; Back never loses input.
- Photos resized in the browser to 2048 px JPEG before upload.
- Free text goes to the server as `freeText`; show `refusedRequests` gently ("We only bring to life what is in the photo").
- Every scene: before/after, B&W vs colour, animated vs still, **Try again** and **Keep the original photo**. Publish is blocked until every scene has a choice.
- Studio is designed at 1194 × 834 (tablet); centre it on desktop, stack on phone.

**Codex notes:** you have no Claude Code hooks. Before every push run `pnpm verify`; never open `.env*`; check `docs/zones/` before touching a file outside your paths; follow `docs/playbooks/*.md` (same content as the Claude skills). Update `docs/STATUS.md` by hand with the handoff format.

**Definition of done (zone-specific):** the E2E flow (`TESTING.md` Q2) passes through your screens in mock mode; axe shows no serious violations on Create the House, Memory bank, Approve, Place.
