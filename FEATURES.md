# FEATURES.md — memorAI

Prioritised feature list. **Owner = the only person who edits that feature's files** (see `AGENTS.md` §9). Estimates are hours of focused work with an agent. IDs are referenced in branch names, commits and PRs (`feat/studio-S3-bank`).

Owners: **T** = Timoté (Pipeline + contracts, lead) · **A** = Alexandre (Studio, Codex) · **Y** = Yasir (House) · **R** = Raphaël (Design + platform).

Status is tracked automatically on the GitHub issue **"📋 memorAI task board"** (from merged PR titles). Machine-readable owners and dependencies: `docs/tasks.json` (hard deps block a task; soft deps only warn). Notes in `docs/STATUS.md`.

---

## MUST — the demo depends on these

### Foundation (first 90 minutes, unblocks everyone)

| ID | Feature | Owner | Est. | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| F1 | Scaffold | T | 0.5 | — | `pnpm create next-app` (App Router, TS, Tailwind v4, alias `@/*`), pnpm, Node ≥ 24, Biome, Vitest, Playwright, scripts from `AGENTS.md` §5 exist; `pnpm verify` and `pnpm build` pass; `.env.example`, `.gitignore` (`storage/`, `demo-assets/`, `.env*.local`) committed. |
| F2 | Contracts v1 | T | 1 | F1 | `lib/contracts/` has Zod schemas for all entities, MemorySheet, Job, HouseBundle, every route I/O in `TECHNICAL.md` §4, error envelope; exported types; unit test parses one valid fixture per schema. |
| F3 | Mock layer | T | 1 | F2 | `lib/ai/fal.ts` + `lib/ai/claude.ts` with `live`/`mock`; fixtures in `mocks/`; fake delay 2–5 s; `MOCK_FAIL_RATE`; same interface as live. |
| F4 | DB + storage | T | 1 | F2 | Mongo client singleton, typed collections, indexes script; `lib/storage` save/stream/sha256; `/api/files/[...path]` with HTTP Range (206) and path traversal guard; test for Range. |
| F5 | Tokens + fonts + base UI | R | 1.5 | F1 | `globals.css` `@theme` = `TECHNICAL.md` §3.2; shadcn initialised and mapped to tokens; Fraunces/Nunito/Caveat via `next/font`; components: Button (primary/secondary), Switch, Badge/Chip, Card, Polaroid, IconButton (round, 64/76/92/124), Avatar group, Stepper, Progress (segmented); logo, 3 room SVGs, 9 object SVGs exported to `public/`. |
| F6 | Studio auth | T | 0.5 | F1 | `/studio/login`, `POST /api/auth/login`, signed cookie, `proxy.ts` gate as in `TECHNICAL.md` §4.1. |

### Pipeline (Timoté)

| ID | Feature | Owner | Est. | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| P1 | Job engine | T | 2 | F2–F4 | `advanceJob` with lease, step plans, retries (2), fallback, concurrency cap, budget guard, cache; ticker in `instrumentation.ts` started once; unit tests: transitions, retry→fallback, lease prevents double advance, cache hit, budget switch. |
| P2 | Scene chain live | T | 2 | P1 | restore → colourise (optional) → animate → ambience with models from `lib/ai/models.ts`; inputs uploaded to fal CDN with 1 h lifecycle; every output downloaded to `storage/`; cost recorded per step. Works end to end on 1 real photo. |
| P3 | Prompt compiler | T | 1 | F3 | Claude forced-JSON output; rules from `TECHNICAL.md` §7.2; "add grandpa" in free text ends up in `refusedRequests` (unit test with mock + one manual live check); template fallback. |
| P4 | Generate / job / retry routes | T | 1 | P1 | `POST /api/memories/:id/generate`, `GET /api/jobs/:id`, `POST /api/scenes/:id/retry` (bypass cache, rate limited); Memory status computed as in §5.2. |
| P5 | Object 3D job | T | 1 | P1 | cutout → Rodin 2.5 Fast → gltf-transform compress (< 3 MB) → stored; on failure the Story falls back to a library object. |
| P6 | Demo content generation | T + R | 1 | P2, P5, S-all | Final demo Story generated with the demo key, approved in Studio, `pnpm export:demo` writes `demo-assets/bundle.json`. Done by Sunday 09:30. |

### Studio (Alexandre)

| ID | Feature | Owner | Est. | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| S1 | Create the House | A | 1 | F5, F6, F2 | Figma "Family · Create the House": first name, first Room = default style (garden/kitchen/living), consent checkbox required; creates House + Room. |
| S2 | Create · 1 Object | A | 1 | S1 | Figma "Create · 1 Object": take/upload a photo of an object **or** pick a library object; name the Story; starts `object_3d` job and shows its progress; slot chosen later (S8). |
| S3 | Create · 2 Memory bank | A | 1.5 | S2, F4 | Figma "Create · 2 Memories": upload photos (client resize 2048 px JPEG), videos, song, voice clip; grid with remove; at least one photo/video required to continue. |
| S4 | Guided questions + free text | A | 1 | S3 | All 7 guided questions (`TECHNICAL.md` §4.2) + optional free-text prompt; autosave via PATCH; no blank page (examples as placeholders). |
| S5 | Memory sheet | A | 0.5 | S4 | Figma "Create · 2b Memory sheet": plain-language rows with "Change" links back to the field; Generate button. |
| S6 | Bring to life (progress) | A | 1 | S5, P4 | Figma "Create · 3 Bring to life": per-photo options (restore, colour keep/bring back, gentle motion vs still); live step names; original photo with slow zoom while waiting; shows refused free-text requests gently. |
| S7 | Approve every scene | A | 1.5 | S6 | Figma "Create · 3b Approve every scene": per scene before/after slider, B&W vs colour, animated vs still; **Try again** and **Keep the original photo** on every scene (and on `fallback`); Memory cannot be published until each scene has a choice. |
| S8 | Place + order + publish | A | 1 | S7 | Figma "Create · 4 Place": choose a free Slot, order Memories (drag or up/down), per-Memory "OK alone" switch, "Send to [first name]'s house" publishes; confirmation state. |
| S9 | Hear back (home) | A | 0.5 | S8 | Figma "Family · Hear back": views, hearts, most-loved Memory, "Create a new Story", "Open [name]'s house" (opens House link), copy House link / alone link. |

### House (Yasir)

| ID | Feature | Owner | Est. | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| H1 | Bundle route + demo mode | Y | 1 | F2, F4 | `GET /api/h/:token/bundle` builds `HouseBundle` (published only, alone filter); `HOUSE_DEMO_MODE` serves `demo-assets/bundle.json` without DB; unit test of alone filter. |
| H2 | Preloader | Y | 0.5 | H1 | Loads every URL in `files[]` (images, GLB, audio, video) before showing anything; warm background only; tolerates a failed file (marks it, never blocks). |
| H3 | Choose a room | Y | 0.5 | H2, F5 | Figma "Choose a room": greeting with first name, avatars, arch room cards; one tap opens the Room. |
| H4 | Room scene | Y | 2 | H3 | Figma "Room · Garden": background, Objects on fixed Slots (GLB via R3F or library SVG plane), floor shadow, gentle float, empty Slots, Rooms button, together/alone pill; letterboxed at 1194 × 834; client-only; `prefers-reduced-motion` respected. |
| H5 | Object opens (polaroids) | Y | 1 | H4 | Figma "Flower opened": first tap unlocks audio; object scales, others fade, polaroids fly out (0.9 s `--ease-memorai`); tap polaroid → that Memory; no tap → first Memory after 3 s. |
| H6 | Memory player | Y | 2 | H5 | Figma "Story · Memory playing": clips cross-fade 0.6 s in order; song + ambience; voice once with music ducked to 30 %; optional caption; segmented progress; Pause (124), Back (92), Return to the room (76); any failed clip → still photo. |
| H7 | Heart + end of Story | Y | 0.5 | H6 | Figma "Story · Send love": Heart 230 px posts event; "Next memory"; auto-continue after 10 s; after last Memory gentle fade back to the Room. |
| H8 | Alone mode | Y | 0.5 | H4 | `?mode=alone`: only OK-alone Memories; unavailable Objects stay at 0.28 opacity and ignore taps; pill shows "On your own". |

### Quality (everyone)

| ID | Feature | Owner | Est. | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| Q1 | CI + pre-commit | T | 0.5 | F1 | GitHub Actions (mock): typecheck, Biome, Vitest, build; husky pre-commit secret scan. |
| Q2 | E2E smoke | Y | 1 | S8, H7 | Playwright (mock): create Memory → approve → publish → open House → Story plays first scene. |
| Q3 | `demo:check` | Y | 0.5 | H1–H7 | Script opens `/house/demo-token` with network blocked except localhost; asserts Choose a room, Room, Object open, first Memory playing. |
| Q4 | DESIGN.md evidence | R | ongoing | F5 | Figma vs code captures for every built screen; accessibility notes; MCP usage notes. |

---

## SHOULD — strong for judges, after MUST is green

| ID | Feature | Owner | Est. | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| SH1 | Room from family photo | T (job) + A (UI) | 1.5 | P1, S1 | Upload room photo → `room_edit` job (Nano Banana 2 edit) → background; default slots placed; fallback to default style. |
| SH2 | Second Room in demo | R | 0.5 | H3 | Demo House has Garden + Living room; Choose a room shows both. |
| SH3 | Don't show list | A | 1 | S1 | Figma "Family · Care & privacy": add names/topics; publishing warns if a MemorySheet mentions one (simple text match); stored on House. |
| SH4 | Care & privacy screen | A | 0.5 | SH3 | Figma "Care & privacy": OK-alone default, data deletion button (calls DELETE house with confirmation), privacy text. |
| SH5 | Voice recording screen | A | 1 | S3 | Record in browser (MediaRecorder), replay, re-record, save as `voice` asset. No Figma frame yet: R designs it first. |
| SH6 | ElevenLabs voice agent | T + A | 3 | S4, all MUST | Go/no-go Sunday 02:00. Agent asks the guided questions and fills the MemorySheet via tool call; same Memory sheet screen after. |
| SH7 | Missing Figma frames | R | 2 | F5 | Designs for: free text, full question set, voice recording, ordering, publish confirmation, Story end, loading/error states, room photo upload, phone Studio. |

## COULD — only if everything above is done

| ID | Feature | Owner | Est. | Acceptance criteria |
|---|---|---|---|---|
| C1 | Fidelity check | T | 1.5 | Claude vision compares original vs clip frame; flags "a face may have changed" on the approval screen. |
| C2 | Old video restoration | T | 1 | Optional "Restore this old video" (first 20 s) with Bytedance upscaler `old_film` preset. |
| C3 | Live update on publish | Y | 1 | House refreshes the bundle every 30 s and fades a newly published Object in. |
| C4 | Text agent | T | 2 | `/api/agent/messages` SSE agent that fills the MemorySheet (basis for SH6). |
| C5 | Public deployment | T | 1 | Vercel deploy with polling only (no ticker), cloud storage instead of disk. |

## Out of scope

Real accounts and invitations, multi-family roles, payments, native apps, voice cloning or avatars, any medical feature.
