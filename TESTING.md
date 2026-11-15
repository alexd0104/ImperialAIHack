# TESTING.md — memorAI

Goal: protect what the demo shows, nothing more. No coverage target, no component snapshot tests. Everything runs in `AI_MODE=mock` unless stated.

## 1. Decision tests (run once, Saturday afternoon/evening)

These decide architecture choices. Record results in `docs/STATUS.md` and update `TECHNICAL.md` §11.

| # | Test | Owner | Pass if | If it fails |
|---|---|---|---|---|
| 1 | Visual match: a Rodin GLB placed on a Figma room SVG in R3F (shadow, warm light, scale) | Yasir | Looks part of the room, not pasted | Library SVG objects are the demo default; GLB shown only in Studio Object step |
| 2 | Memory chain fidelity on 3 real old photos: Topaz restore → colourise → Kling 2.5 Turbo Pro 5 s → MMAudio | Timoté | Faces stay recognisable, no new people/objects; note time + cost per step | Try Veo 3.1 (then Seedance); lighten restore; default to still photo |
| 3 | Room from real photo with Nano Banana 2 edit | Timoté | Usable warm background with free floor/shelf space | Default styles only (SH1 dropped) |
| 4 | 3D from a real object photo on a table: Rodin 2.5 Fast vs Trellis 2 | Raphaël | Recognisable object, < 3 MB after compression | Library SVG objects |
| 5 | Generation time and cost per Memory (live) | Timoté | Numbers written in STATUS | — |
| 6 | Guided questions with someone who has 2 photos and no idea | Alexandre | Finishes a usable Memory sheet without help | Rewrite question copy |
| 7 | Voice ducking + playback on the demo laptop and a phone | Yasir | Voice clear over music; no silent start | Adjust duck level, check unlock |
| 8 | Performance: 6 objects in a Room on a mid-range device | Yasir | Smooth (no visible stutter), loads < 5 s from cache | Fewer objects, smaller textures |
| 9 | Non-technical walkthrough: someone outside the team creates and watches a Memory | Raphaël | No help needed; hesitations noted and fixed | Fix copy/flow |

## 2. Automated tests

**Unit (Vitest, `*.test.ts` next to the code)**

| Area | Must cover | Owner |
|---|---|---|
| `lib/contracts` | Each schema parses a valid fixture and rejects an invalid one | T |
| `lib/jobs/engine` | Step plan per job type; transitions; 2 retries then `fallback`; lease prevents double advance (simulate two calls); concurrency cap; budget guard switches to mock; cache hit skips fal; retry bypasses cache | T |
| `lib/ai/prompt-compiler` | "add grandpa" goes to `refusedRequests`; negative prompt always present; template fallback when Claude throws | T |
| Memory status | draft → generating → ready_for_review → approved → published | T |
| `/api/files` | Range request returns 206 with correct bytes; `..` rejected | T |
| Bundle builder | Only published Stories; alone mode filters; empty slots are `null`; every media URL listed in `files[]` | Y |
| Player logic | Next/back/pause state machine; failed clip → still photo; auto-continue after heart | Y |
| Studio forms | MemorySheet built from answers; publish blocked until every scene has a choice | A |

**End-to-end (Playwright, `e2e/`)**

- `studio-to-house.spec.ts` (Q2): login → create House (garden style) → library Object → upload 2 CC0 photos → answer questions → generate (mock) → approve both scenes → place + publish → open House link → Choose a room → tap Object → first Memory playing.
- axe accessibility check on Create the House, Memory bank, Approve, Place (no serious violations).

**Demo check (`pnpm demo:check`, Q3)**

Starts the production build with `HOUSE_DEMO_MODE=true`, opens `/house/demo-token` in Playwright with every non-localhost request blocked, asserts: Choose a room visible → Room visible with all Objects → tap demo Object → polaroids → first Memory video playing (currentTime advances) → audio element playing.

## 3. CI

`.github/workflows/ci.yml` on every PR and push to `main`: install (frozen lockfile) → typecheck → Biome → Vitest → build, with `AI_MODE=mock` and dummy env. E2E runs locally (and in CI once stable). A failing CI blocks merge.

## 4. Demo data

- **In the repo:** `public/samples/` (CC0 photos for README and E2E), `mocks/media/` (CC0 clip/audio outputs).
- **Outside the repo (`demo-assets/`):** real old family photos of a team member's family (consent from everyone visible; parents for children), the real object photo, Sarah's voice recorded by a team member, a royalty-free or public-domain vintage-style song, all generated outputs, `bundle.json`.
- Seed: `pnpm seed:demo` → `mh_demo`. Export: `pnpm export:demo` after every change. Backup: `mongodump` of `mh_demo` + `demo-assets/` on all 4 laptops + USB stick.
- Persona names in the demo: Frank (grandparent) and Sarah (daughter) unless the real family agrees to their own names.

## 5. Manual House checklist (before every rehearsal)

- [ ] No text needed anywhere on the House side; nothing reads as an error.
- [ ] Touch targets: Pause 124, Back 92, Return 76, Heart 230, Rooms 64, Objects ≥ 200.
- [ ] Objects never change place between visits.
- [ ] Sound starts on first tap; voice is clear over the song.
- [ ] Unplug network: House still loads in demo mode.
- [ ] Reduced-motion setting on: only fades.
- [ ] Alone link shows only OK-alone Memories.

## 6. Rehearsal checklist (Sunday 11:45–12:45, three runs)

- [ ] Demo laptop on charger, notifications off, browser zoom 100 %, bookmarks bar hidden.
- [ ] `pnpm demo` running in production mode; `/studio` and `/house/demo-token` open in two windows (House at 1194 × 834).
- [ ] Logged into Studio; demo Story and a second Room present.
- [ ] The live-creation photo is already in the cache (instant result); phrase ready: "we generated this one earlier; it takes about 2 minutes".
- [ ] Sound output = laptop speakers or room audio, volume tested in the room.
- [ ] Backup: second laptop with the same build, `demo-assets/`, logged in; backup video on desktop.
- [ ] Phone hotspot ready.
- [ ] Timing under 3:00; who says what is fixed; judge handover moment rehearsed.
- [ ] Figma slide + "how we used fal" slide ready.
