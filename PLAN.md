# PLAN.md — memorAI

Hard deadlines (from the hacker guide): **Devpost submission closes Sunday 12:00** (nothing can change after). **Judging Sunday 13:00–16:30**, live presentation, Voice/Vision/Generative Media track in Huxley 308. Finals 17:00, prizes 17:30. Our internal submission target is **11:30**.

Presenter and demo driver: **to be decided** (decide by Sunday 10:00).

## Milestones

| ID | When | What must be true |
|---|---|---|
| M0 | Sat 18:00 | Scaffold + contracts v1 + mocks merged on `main`. Everyone runs `pnpm dev`. Tests 1, 2, 4 done (see `TESTING.md`). |
| M1 | Sat 21:00 | Each zone renders its main screen with mock data: Studio Create the House → Memory bank; House Choose a room → Room; job engine passes unit tests. |
| M2 | Sat 23:30 | **First real end-to-end**: one Memory generated live (real photo), approved, published, played in the House. Timings and cost written in `docs/STATUS.md`. |
| M3 | Sun 02:00 | All MUST features done in mock and live. **Go/no-go ElevenLabs** (SH6) and SHOULD list. |
| M4 | Sun 09:00 | **Feature freeze.** Only bug fixes, copy and visual polish after this. |
| M5 | Sun 09:30 | Final demo content generated with the demo key, approved, `pnpm export:demo`, `demo-assets/` copied to all 4 laptops. Content freeze. |
| M6 | Sun 10:30 | **Code freeze** except demo-breaking bugs. Every laptop runs `pnpm demo` + `pnpm demo:check`. `mongodump` of `mh_demo`. |
| M7 | Sun 11:30 | Devpost submitted (repo public, README, description, APIs/models list). |
| M8 | Sun 12:45 | Three timed rehearsals done; backup video recorded. |

## Hour by hour

| Time | Timoté (Pipeline, lead) | Alexandre (Studio, Codex) | Yasir (House) | Raphaël (Design + platform) |
|---|---|---|---|---|
| Sat 17:00–17:30 | F1 scaffold, push `main` | Codex setup: reads `AGENTS.md`, Figma MCP works | Test 1 in a sandbox (GLB on room SVG in R3F) | Export logo, 3 rooms, 9 objects as SVG; start F5 |
| 17:30–18:00 | F2 contracts v1 (PR, everyone skims) | Read contracts; Studio route skeleton | Test 1 result → decision GLB vs SVG | F5 tokens + fonts |
| 18:00–19:00 | F3 mocks, F4 DB/storage/files, F6 auth | S1 Create the House (mock) | H1 bundle + demo mode with a hand-written bundle | F5 base components; Test 4 (Rodin vs Trellis) in playground |
| 19:00–20:00 | Dinner + Test 2 (restore/colour/animate on 3 real photos, Kling vs Veo) | Dinner | Dinner | Dinner |
| 20:00–21:00 | P1 job engine + tests | S2 Object, S3 Memory bank | H2 preloader, H3 Choose a room | F5 finish; SH7 frames for free text + questions + voice |
| 21:00–22:00 | P3 prompt compiler, P4 routes | S4 questions + free text, S5 sheet | H4 Room scene | Q1 CI + pre-commit (with T); DESIGN.md captures |
| 22:00–23:30 | P2 scene chain live → **M2** | S6 Bring to life with real job polling | H5 object opens + polaroids | Demo content: collect photos with consent, record Sarah's voice, choose free song |
| 23:30–01:00 | P5 object 3D job | S7 Approve every scene | H6 Memory player | SH7 Story end + loading/error frames |
| 01:00–02:00 | Fix integration bugs | S8 Place + publish, S9 Hear back | H7 heart + end, H8 alone mode | Polish passes on Studio screens with A |
| 02:00 | **M3 review (all, 15 min)**: MUST status, go/no-go SH6 and SHOULD | | | |
| 02:15–05:00 | SH6 or SH1 (if go) or bugs | SH3/SH4 or bugs | Q2 E2E, Q3 demo:check | SH2 second Room; pitch slides draft |
| 05:00–08:00 | Sleep in two shifts: T + R sleep 05:00–07:30, A + Y sleep 06:00–08:30 (someone always awake) | | | |
| 08:00–09:00 | Bug fixes | Bug fixes | Bug fixes | Pitch slides + Figma slide |
| 09:00 | **M4 feature freeze** | | | |
| 09:00–09:30 | P6 generate demo content (demo key) | Approve + publish in Studio | Check House with real demo content | Check visuals of demo content |
| 09:30–10:30 | `export:demo`, copy to laptops, M5 | Bug fixes | Bug fixes, `demo:check` on all laptops | README screenshots, DESIGN.md final |
| 10:30–11:30 | M6 code freeze; `mongodump`; Devpost text | Devpost text review | Final demo check | Devpost images |
| 11:30 | **M7 Devpost submitted** | | | |
| 11:45–12:45 | **Rehearsals ×3** (timed, network off for House), backup video | | | |
| 13:00–16:30 | Judging (be at Huxley 308 early) | | | |

## Rules for the schedule

- If a MUST feature is more than 1 hour late at M3, cut its scope (e.g. S8 ordering → fixed order) rather than skip sleep for everyone.
- Nobody starts a SHOULD while a MUST in their zone is red.
- Anything not merged by 09:00 Sunday is not in the demo.
- Leave the building rules as communicated by organisers (team has confirmed overnight access); keep the 4 laptops charged before sleeping.

## Demo script (3 minutes, from the storyline)

| Time | Beat | Who drives |
|---|---|---|
| 0:00–0:20 | Hook ("we don't make a video, we make a memory") + problem | Presenter |
| 0:20–1:00 | Family creates: two photos + song, three questions, Memory sheet | Studio driver |
| 1:00–1:30 | Approve: before/after, colour vs B&W, one flagged face rejected → original kept | Studio driver |
| 1:30–2:20 | Judge plays the grandparent: Choose a room → Room → record player → polaroids → Memory plays → Heart | Judge, presenter guides |
| 2:20–2:35 | It grows: new Object in an empty slot, glimpse of second Room | Studio driver |
| 2:35–3:00 | Trust: real memories only, family approval, real voices, data under family control, no medical claim; close line; one line on fal chain + Figma design | Presenter |

Say once, plainly: the live generation was prepared earlier; real generation takes about 2 minutes.
