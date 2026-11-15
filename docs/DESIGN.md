# DESIGN.md — memorAI

Owner: Raphaël. This file is both the **Figma → code map** for developers and the **evidence log** for the Figma Best-Designed AI Product prize (we must show in the presentation how we qualify).

- Figma file: **memorAI — Room & Story** · https://www.figma.com/design/ngUmuGo6WeD8jCCSbWsRDc
- Source of truth: page **v5 · Full flow · memorAI** (17 frames, all 1194 × 834, iPad Pro 11" landscape). Pages v1–v4 are superseded. A v6 restyle was explored and removed.
- Node link: `https://www.figma.com/design/ngUmuGo6WeD8jCCSbWsRDc?node-id=<id>`

## 1. Design principles (for the pitch)

1. **Nothing to read on the House side.** Choosing a room, opening a Story and sending love need no text.
2. **Big, forgiving targets.** Pause 124 px, Back 92, Return 76, Heart 230, Rooms 64, Objects 200–290, room cards 320 × 480.
3. **Constancy.** Objects never move; unavailable ones fade in place (0.28) instead of disappearing.
4. **Gentle motion only.** Dissolve 0.6 s; one Smart Animate 0.9 s `cubic-bezier(0.22,1,0.36,1)` when an Object opens; reduced-motion respected.
5. **Warmth and trust.** Cream and terracotta palette, Fraunces + Nunito + Caveat (handwritten polaroid captions), family avatars, before/after comparisons on every scene.

## 2. Frame → route map (v5)

| Frame | Node | Route / component | Owner | Notes |
|---|---|---|---|---|
| Choose a room | 20-67 | `/house/[token]` → `ChooseRoom` | Yasir | Entry screen of the House. **Deviation (B30):** each Room is a door left ajar over its picture, like the Studio Room doors; one tap swings it open (0.8 s, `ease-memorai`, none under reduced motion), then the Room appears |
| Room · Garden | 20-176 | `RoomScene` | Yasir | 3 Objects, empty slot, together pill |
| Room · Garden — Flower opened | 20-219 | `ObjectOpen` (polaroids) | Yasir | Tap a polaroid, or first Memory auto-starts after 3 s |
| Story · Memory playing | 20-624 | `MemoryPlayer` | Yasir | Chips: song / ambience / voice; caption Fraunces Italic 32 |
| Story · Send love | 20-668 | `HeartScreen` | Yasir | Auto-continue after 10 s |
| Room · Kitchen | 20-256 | `RoomScene` (kitchen) | Yasir | Teapot, Mug, Apple |
| Room · Living room | 20-307 | `RoomScene` (living) | Yasir | Record, Radio, Camera |
| Room · Garden — watching alone | 20-701 | `RoomScene` alone mode | Yasir | Unavailable at 0.28 |
| Family · Create the House | 22-546 | `/studio/house/new` | Alexandre | Name, first Room, consent |
| Create · 1 Object | 20-331 | `/studio/stories/new` | Alexandre | Photo → 3D Object, or library |
| Create · 2 Memories | 20-377 | `/studio/memories/[id]/bank` | Alexandre | Figma shows 1 question: build all 7 (SH7 frame) |
| Create · 2b Memory sheet | 22-736 | `/studio/memories/[id]/sheet` | Alexandre | 7 rows with "Change" |
| Create · 3 Bring to life | 20-451 | `/studio/memories/[id]/life` | Alexandre | Before/after, Enhance, Repair, Colour, motion |
| Create · 3b Approve every scene | 23-580 | `/studio/memories/[id]/approve` | Alexandre | Flagged face change, Keep original / Approve anyway |
| Create · 4 Place | 20-536 | `/studio/stories/[id]/place` | Alexandre | Slot + OK alone (make it per Memory) + publish |
| Family · Hear back | 23-737 | `/studio` | Alexandre | Stats, hearts, most-loved |
| Family · Care & privacy | 23-937 | `/studio/care` | Alexandre | Don't show, alone, data, roles |

**Row 4 · Missing frames (SH7, added 2026-11-14).** Each frame has a "Dev note" text under it on the canvas with behaviour details.

| Frame | Node | Route / component | Owner | Notes |
|---|---|---|---|---|
| Create · 2c Questions | 57-624 | `/studio/memories/[id]/sheet` (form) | Alexandre (S4) | All 7 guided questions + optional free text; placeholders are examples, never pre-filled; colour = single choice; OK alone toggle |
| Create · 2d Record a voice | 58-638 | voice recorder (SH5) | Alexandre | States Ready (mic 64) → Recording (Stop 124, timer, waveform) → Listen back; Record again / Use this recording |
| Story · End — back to the Room | 58-812 | `StoryEnd` transition | Yasir (H7) | Polaroids fly back into the Object (reverse Smart Animate 0.9 s), warm glow, Room interactive again; no text |
| States · loading, error, clip fallback | 60-709 | Studio job states + House fallback | Alexandre / Yasir | Studio: per-scene progress, safe to close; error = Try again + Keep original photo. House: still photo + slow zoom + sound, never an error |
| Create · 4b Order memories | 61-734 | `/studio/stories/[id]/place` (order step) | Alexandre (S8) | Drag handle + up/down arrows, per-Memory OK alone, story summary |
| Family · Room from a photo | 60-756 | room photo upload | Alexandre / Timoté | Upload → straighten (nothing added) → tap to place up to 5 Slots; fallback to illustrated room |
| Create · 4c Sent to the House | 61-982 | publish confirmation (S8) | Alexandre | Object + glow, "Sent to Mum's house", family avatars, next actions |
| Studio · Phone · Gather the memories | 61-1155 | Studio at 390 px | Alexandre | One column, compact stepper, 2 polaroids per row, bottom actions |

**Vocabulary note:** Figma labels ("Create", "Choose a room", "Send love", "Bring to life", "Polaroid") stay as UI copy; code uses `House / Room / Slot / Story / Memory / Scene / Heart`.

## 3. Tokens

Defined in `app/globals.css` (see `TECHNICAL.md` §3.2). Since 2026-11-14 Figma mirrors them as **Variables**: collection **memorAI tokens** (mode `Value`) with 26 `color/*` and 9 `radius/*` variables, same names as the CSS (`color/primary-strong` ↔ `--color-primary-strong`), WEB code syntax `var(--…)`, scoped (no `ALL_SCOPES`), and contrast notes in the descriptions. Code is the source of truth: change `globals.css` first, then the Variable. Values were originally read from layers. Cleanup done in code: `#2B2420` merged into `ink #3B2A20`; DM Sans leftovers replaced by Nunito.

## 4. Components

| Figma component | Code | Notes |
|---|---|---|
| Button (Style=Primary/Secondary) | `components/ui/button.tsx` | Figma component now matches code: Nunito Bold 18, Primary bound to `color/primary-strong`, Secondary to `surface` + `ink` 14% border |
| Toggle (State=On/Off) | `switch.tsx` | on `switch-on #3F8A55` (Figma On variant), off `#DCD5CB`, knob 26 |
| Close Button / Rooms Button | `icon-button.tsx` (64) | round, `shadow-round-button` |
| Polaroid (Video, Caption) | `polaroid.tsx` | Caveat caption, `shadow-polaroid`, radius 6/2, 200×250 or 150×188 |
| Family avatars | `avatar-group.tsx` | rings `#FFF8EE` 3 px, overlap −10 |
| Empty Spot | `components/house/empty-slot.tsx` | House only |
| Objects (9) | `public/objects/*.svg` | library Objects |
| memorAI logo | `public/brand/memorai-logo.svg` | |
| Story progress, Stepper, chips, inputs, checkboxes, segmented, tabs, cards | `segmented-progress.tsx`, `stepper.tsx`, `badge.tsx`, `input.tsx`, `checkbox.tsx`, `toggle-group.tsx`, `tabs.tsx`, `card.tsx` | Built as plain frames in Figma; componentised in code |
| House controls | `components/house/controls.tsx` built from `icon-button.tsx` (76/92/124) and `heart-button.tsx` (230) | Back 92, Pause 124, Return 76, Heart 230 |

### 4.1 Component specs (read through the Figma MCP server, 2026-11-14)

Values taken from `get_design_context` on frames 20-624 (Memory playing), 20-668 (Send love) and 23-580 (Approve every scene). F5 builds from this table. "→ token" is the token from `TECHNICAL.md` §3.2 the value maps to; **bold** marks a value with no token yet.

| Component | Figma values | Code mapping / deviation |
|---|---|---|
| Button primary | pill (999), px 30 · py 18, Nunito Bold 18, bg `#D9734E`, white text | `bg-primary`, `rounded-full` |
| Button secondary | pill, px 30 · py 18, bg `#FFFCF6`, border 1.5 `ink/0.14`, text `#2B2420` | `bg-surface`, text `ink` (`#2B2420` merged into `ink`) |
| Pill link "Next memory" | pill, pl 24 · pr 16 · py 14, Bold 18, bg surface, chevron 34, shadow `0 12 32 -4 rgba(58,32,16,0.10)` | Button secondary variant `with-icon`, no border |
| IconButton (Studio Close) | 64, radius 32, bg `#FFFCF6`, icon 24, drop-shadow `0 8 12 rgba(58,44,30,0.12)` | `shadow-round-button` (token blur 24 vs Figma 12: keep token, softer) |
| IconButton (House) | Return 76 (icon 34), Back 92 (icon 34), Pause 124 (icon 40, bg primary), bg `rgba(255,252,246,0.92)`, shadow `0 12 32 -4 rgba(58,32,16,0.18)` | **new token `--shadow-house-control`**; bg `surface/92` |
| HeartButton | 230, gradient `#EE9475 → #D2603D` (top→bottom), border 6 `surface/0.8`, heart icon 96, shadow `0 18 50 rgba(217,115,78,0.45)`, glow 440 behind | `heart-from/to`, `shadow-heart`; glow = radial gradient in CSS, not an image |
| Badge · status | pill, px 10 · py 4, Nunito Bold 12; approved bg `#E3ECD9` text `#4F7A44`; check bg primary text white | `success-surface` / `success-text`; "check" variant = `primary` |
| Chip (House, over photo) | pill, pl 14 · pr 16 · py 9, gap 8, dot 10, Nunito SemiBold 17, bg `overlay/0.45` + blur 7, border 1.5 `surface/0.3`, text `#FFFCF6` | Badge variant `on-media` |
| Card | radius 24, bg surface, shadow `0 12 32 -4 rgba(122,74,42,0.07)`, padding 14 (list) / 24 (panel) | `rounded-card shadow-card bg-surface` |
| List row (selected) | radius 14, px 10 · py 8, thumb 52 radius 10, Bold 15; selected bg `#FBE6D8` | `warning-surface`, `rounded-lg`, thumb `rounded-md` |
| Warning banner | radius 14, px 16 · py 12, bg `#FBE6D8`, icon 22, Bold 15 | `warning-surface`; icon AlertCircle in `danger` |
| Stepper | gap 28 between steps, dot 30 radius 15, gap 10 to label; done = `success` + ✓, current = `primary` + number, todo = border 1.5 `ink/0.2`; labels SemiBold 16 | Figma labels at `ink/0.75` (done) and `ink/0.45` (todo) → **todo raised to 0.7** for AA; ✓ glyph was DM Sans → lucide Check |
| SegmentedProgress | 7 × (73 × 6, radius 3), gap 8; on photo: current `surface/0.6`, rest `surface/0.25`; on cream: done `ink/0.95`, current `ink/0.6`, rest `ink/0.25` | variants `on-media` / `on-cream`, `rounded-xs` |
| AvatarGroup | 40 (Studio) or 30 (House pill); border 3 (2.25) `#FFF8EE`; overlap −10 (−7.5); Nunito Bold 16 (12) white; colours honey / sage / rose | **`#FFF8EE` has no token** → add `--color-avatar-ring` |
| "Watching together" pill | pill, pl 8 · pr 16 · py 6, gap 10, bg `surface/0.9`, Bold 15 ink | House zone (uses AvatarGroup size 30) |
| Logo | mark 36 + gap 10 + Fraunces SemiBold 26, tracking −0.16, "AI" in primary | `public/brand/memorai-logo.svg` (text outlined, no font needed) |
| Headings | Fraunces SemiBold 40 (screen title), Italic 32 lh 1.25 (Memory caption), Caveat 28 (signature `surface/0.85`) | `font-display`, `font-hand` |
| Body secondary | Nunito Regular 18 at `ink/0.6` (subtitle), SemiBold 18 at `ink/0.65` (Send love) | **raised to `ink/0.7`** (AA rule) |

Fraunces is used with variation settings `"SOFT" 0, "WONK" 1` in every Figma text layer: set them once on `.font-display`.

Not in these frames, still to read for F5: Toggle (State=On/Off), Polaroid (20-219), Input, Checkbox, Tabs, ToggleGroup (Create frames 20-331 / 20-377 / 20-451).

### 4.2 Exported assets

Exported through the MCP server (`download_assets`, SVG) from the v5 instances, then cleaned: the exporter wraps each node in its parent frame (grey `#F5F5F5` rect + the room background), so those two rects were removed; room backgrounds also lost the 28 px frame corner radius so they can fill the screen.

| File | Node | Size |
|---|---|---|
| `public/brand/memorai-logo.svg` | 20:172 | 164 × 36 |
| `public/rooms/garden.svg` · `kitchen.svg` · `living-room.svg` | 20:177 · 20:257 · 20:308 | 1194 × 834 |
| `public/objects/watering-can.svg` · `flower.svg` · `sun-hat.svg` | 20:201 · 20:252 · 20:211 | room scale |
| `public/objects/teapot.svg` · `mug.svg` · `apple.svg` | 20:299 · 20:300 · 20:301 | room scale |
| `public/objects/record.svg` · `radio.svg` · `camera.svg` | 20:323 · 20:324 · 20:325 | room scale |

Objects keep their soft ground shadow and their in-room tilt (radio, camera) because Objects never move: the SVG is exactly what sits on the Slot.

**Icons (Figma custom → lucide-react):** home → Home · back → ChevronLeft · next → ChevronRight · pause → Pause · heart → Heart · close → X · rooms → LayoutGrid · camera → Camera · generate → Sparkles · gear → Settings · play → Play · warning → AlertCircle · check → Check.

### 4.3 F5 implementation notes (2026-11-14)

Every component is visible on the dev-only page `/dev/ui` (404 in production); full capture `docs/design-evidence/f5-dev-ui.png` (1194 px wide, tablet).

Deviations from Figma, on purpose:
- **Button Primary**: Figma component is dark `#2B2420` in DM Sans; code is terracotta in Nunito Bold 18, as used on every v5 screen.
- **Accessible terracotta (PR #11 review, B2)**: white on `primary #D9734E` is 3.2:1, below AA for 16–18 px text. Filled controls with text (Button primary, Badge attention/photoPrimary, ToggleGroup primary, Stepper current) use `primary-strong #B4552F` (4.9:1), hover `primary-strong-hover #A44B2C` (5.8:1). `primary` stays for icons, accents and the 124 px play button (≥ 3:1 is enough for non-text).
- **Greens**: Badge approved text uses `success-strong #426B38` (5.1:1 on success-surface; `success-text` was 4.1:1). Stepper done and Checkbox checked fill with `success-text` so the white check is 5:1.
- **Avatar initials** are ink, not Figma's white (white on the pastels is about 2:1).
- **Switch on**: `#3F8A55` (new token `switch-on`), the Figma Toggle On colour, not `success #7FA36F`: the white knob needs the contrast.
- **Stepper**: done/todo labels `ink/0.7` (Figma 0.75 / 0.45); ✓ is a lucide vector.
- **Checkbox radius 8** is not on the radius scale; kept as an explicit value to match Figma.
- **Added tokens** beyond `TECHNICAL.md` §3.2: `primary-strong`, `primary-strong-hover`, `success-strong`, `switch-on`, `avatar-ring #FFF8EE`, `shadow-house-control`, `shadow-knob`, `spacing-page 72px`.
- Regression: `app/tokens.test.ts` checks the contrast of every colour pair used (incl. hover); `e2e/dev-ui-a11y.spec.ts` runs axe (WCAG 2.2 AA) on `/dev/ui`.
- Studio-only sizes: Switch (56×32), Checkbox (26), Button `sm` (48) are below the 64 px House minimum; House screens use Button `md`, IconButton 76+ and HeartButton only.
- SVGs in `public/` now carry a `<title>` (Biome a11y lint).

## 5. Gaps (frames still to design — SH7)

Designed on 2026-11-14 (row 4, see §2): free-text prompt · full set of guided questions · voice recording · ordering Memories · per-Memory OK-alone · publish confirmation · Story end / return to Room · loading, error and "clip can't play" states · room photo upload · Studio phone layout.

Still open: animated vs still side-by-side (S7 can reuse the 3b before/after layout) · Stories for Kitchen and Living room Objects (same frames, other content) · Studio desktop (> 1194 px: centre the iPad layout) · (sign-in / invites: out of scope).

New frames follow the code rules, not the old Figma leftovers: readable text at `ink` ≥ 0.7, Stepper ✓ is a vector check (no DM Sans), primary buttons bound to `color/primary-strong` (the Button component itself was fixed on 2026-11-14).

Accessibility gap: secondary text at 0.45–0.55 opacity on cream likely fails WCAG AA → code uses ≥ 0.7 for readable text.

## 6. How we used the Figma MCP server

_Fill in as you go (for the presentation):_ which frames were read through MCP, what it produced (layout, values, screenshots), what we changed by hand, time saved.

- **2026-11-14 — spec extraction.** `get_metadata` on page 20:66 listed every frame and instance (no manual node hunting). `get_design_context` on 20-624, 20-668, 23-580 returned exact paddings, radii, shadows, opacities and font weights → §4.1 table in minutes instead of inspecting layers one by one. It also surfaced the Figma gaps we fix in code: leftover `#2B2420` and DM Sans in the Stepper, secondary text at 0.45–0.65 opacity (fails AA), avatar ring colour with no token.
- **2026-11-14 — asset export.** `download_assets` exported the logo, 3 rooms and 9 Objects as SVG (13 files). By hand: removed the parent-frame rects the exporter adds, squared the room corners. Checked every file renders on its own.
- **2026-11-14 — SH7, designing with the MCP server.** The 8 missing frames were built directly in the Figma file with `use_figma`: the Studio header was cloned from existing v5 frames so it stays identical, and every frame reuses the file's own components (Button, Toggle, Close, Polaroid, Family avatars, Empty Spot, logo, Object/Flower). Fixed in the new frames while building: DM Sans ✓ → vector check, low-opacity text → 0.7, dark Primary button → terracotta. One visual check per frame caught 3 layout bugs (clipped chips, polaroid captions squashed by `resize` instead of `rescale`, phone actions cut off), each fixed with a targeted edit.
- **2026-11-14 — F5, code from exact values.** Two read-only `use_figma` calls returned the Toggle, Polaroid, Button, Close/Rooms, avatar, input, checkbox, segmented and stepper values in one pass (sizes, radii, paddings, shadows, opacities), so the 14 `components/ui` pieces were written straight from numbers instead of eyeballing. By hand: tokens deduplicated (`#2B2420` → `ink`), and accessibility fixes applied on top of Figma (§4.3, §8).
- **2026-11-14 — Q4, Figma vs code evidence.** `get_metadata` gave the node ids of every v5 frame, then `get_screenshot` exported 14 frames (House: 20-67, 20-176, 20-256, 20-307, 20-219, 20-701; Studio: 22-546, 20-331, 20-377, 22-736, 20-451, 20-536, 23-737, 23-937) as PNGs in one pass, each downloaded straight into `docs/design-evidence/`. Code captures came from the built app (`next start`, mock mode, seeded House) at the same 1194×834 size, so each pair compares 1:1; deviations were listed from side-by-side montages (§7). Without MCP the 14 frames would have needed manual export from the Figma UI and a lookup of each node id. Limits: screenshots expire after a few minutes (download at once); it reads layout, not behaviour, so House motion was checked live.
- **2026-11-14 — tokens as Figma Variables.** One `use_figma` script created the **memorAI tokens** collection from `app/globals.css` (35 variables with scopes and code syntax). A second reconciled the Button component with the code (DM Sans + `#2B2420` → Nunito Bold + `color/primary-strong`) and re-bound the 16 Primary instances on v5 that carried a hard-coded `#D9734E` override (3.2:1) to the token (4.9:1). Design and code now share names and values.

## 7. Evidence log

S2 (2026-11-14): `Create · 1 Object`, node 20-331 → `/studio/stories/new?roomId=…`. Direct Figma MCP access is unavailable in this session; implementation uses the repository specifications, F5 components and the nine exported Object SVGs. No direct frame comparison is claimed. Code captures: `docs/design-evidence/create-object-code.png` and `create-object-phone-code.png`.

S2 mapping: canvas `bg-background` / centred 1194 px / `sm:px-page`; heading `font-display text-40` (`text-32` phone); copy `text-ink/70`; choices = native radio controls in shared `Card` with `border-primary-strong`, keyboard focus and existing `/objects/*.svg`; title = shared `Label`/`Input`; actions = shared `Button` and lucide `ArrowRight`/`ChevronLeft`; completion = lucide `Check` and `success-strong`; errors = `warning-surface`. Phone stacks controls and uses a three-column library. Photo capture/upload, draft recovery, progress and completion are functional states added from S2 requirements. The sample 3D result is explicitly labelled in mock mode. Alexandre approved assigning a provisional free Slot without reserving it; S8 chooses and reserves the final Slot. S3 navigation awaits S3 rather than pointing to an absent page.

| Date/time | Frame | Route | Figma image | Code image | MCP used? | Deviations |
|---|---|---|---|---|---|---|
| 2026-11-14 | Create · 1 Object (20-331) | `/studio/stories/new` | `docs/design-evidence/20-331-create-object-figma.png` (Q4) | `docs/design-evidence/create-object-code.png`, `create-object-phone-code.png` | S2 built without MCP; Q4 capture via `get_screenshot` | Q4: Figma opens on photo → 3D side by side; code opens on the library with a "Use your own photo" toggle. axe 0. Repository specs/F5 assets; provisional Slot approved by Alexandre; progress uses a labelled sample Object until P5. |
| 2026-11-14 | Family · Create the House (22-546) | `/studio/house/new` | `docs/design-evidence/22-546-create-house-figma.png` (Q4) | `docs/design-evidence/create-house-code.png`, `create-house-phone-code.png` | S1 built without MCP; Q4 capture via `get_screenshot` | Q4: Figma has "Your name", invite family, "Photograph her real room" and 2 consent checkboxes; code has first name, 3 styles, 1 permission checkbox. See §9. axe 0. Existing exported logo/rooms and F5 components reused. |
| 2026-11-14 | Story · Memory playing (20-624) | `MemoryPlayer` | `docs/design-evidence/20-624-memory-playing-figma.png` | _after H-tasks_ | yes (get_design_context) | — |
| 2026-11-14 | Story · Send love (20-668) | `HeartScreen` | `docs/design-evidence/20-668-send-love-figma.png` | _after H-tasks_ | yes | subtitle opacity 0.65 → 0.7 |
| 2026-11-14 | Create · 3b Approve every scene (23-580) | `/studio/memories/[id]/approve` | `docs/design-evidence/23-580-approve-scenes-figma.png` | _after S-tasks_ | yes | stepper todo label 0.45 → 0.7, subtitle 0.6 → 0.7 |
| 2026-11-14 | SH7 · 8 new frames (57-624 … 61-1155) | see §2 row 4 | `docs/design-evidence/sh7-*-figma.png` | _when built_ | yes (`use_figma` built them from local components; captures via `get_screenshot`) | — |
| 2026-11-14 | Button, Toggle, Polaroid, Family avatars, controls (20-624, 20-668, 23-580) | `/dev/ui` | `docs/design-evidence/20-624-*`, `20-668-*`, `23-580-*` | `docs/design-evidence/f5-dev-ui.png` | yes (`use_figma` read-only for exact sizes, radii, shadows) | see §4.3 |
| 2026-11-14 | Button + every v5 Primary instance, e.g. 23-580 | `components/ui/button.tsx` | `docs/design-evidence/23-580-approve-scenes-figma-tokens.png` | `docs/design-evidence/f5-dev-ui.png` | yes (`use_figma` write: Variables + bindings) | none left on Button |
| 2026-11-14 | — (no Figma frame: sign-in out of scope) | `/studio/login` (F6) | — | `docs/design-evidence/q4-studio-login-code.png`, `q4-studio-login-error-code.png` | no (code-only check) | tokens + `components/ui` only; axe WCAG 2.2 AA: 0 violations (empty and error states); targets 64 / 56 px. Gap: field not marked `aria-invalid` / linked to the error (`aria-describedby`) → request to Timoté |
| 2026-11-14 20:15 | Choose a room, Room (×3), Object open, Memory playing (20-624), Send love (20-668) | `/house/[token]` in offline demo mode (`HOUSE_DEMO_MODE=true`), 1194×834 | 20-624 / 20-668 above; Q4: `20-67-choose-room`, `20-176-room-garden`, `20-256-room-kitchen`, `20-307-room-living`, `20-219-object-open`, `20-701-alone-figma.png` | `docs/design-evidence/q4-house-{choose-room,room-kitchen,room-garden,room-living,heart,heart-sent,alone-living}-code.png` | yes (Q4, `get_screenshot`) | axe WCAG 2.2 AA: **0 violations on 8 screens** (choose room, 3 Rooms, polaroids, player, Heart, alone mode). Player and polaroid captures were taken but not committed because they show demo photos of unverified origin (public repo). Slot review: see §8 "Slots". |
| 2026-11-14 20:15 | SH2 · second Room | `/house/demo-token` | — | `docs/design-evidence/q4-house-choose-room-code.png` | no | The demo House has Garden, Kitchen and Living; Choose a room shows all three (`demo-assets/demo.json` via `pnpm seed:demo`, served offline by `pnpm export:demo`). |
| 2026-11-14 22:00 | Choose a room (20-67) — Q4 comparison | `/house/[token]` | `20-67-choose-room-figma.png` | `q4-house-choose-room-code.png` | yes (`get_screenshot`) | Code: arch cards, no logo, "Hello, Rose" (Figma: rounded cards with Objects, time-of-day greeting, family avatars + "added N memories", "3 stories", "New from" badge). Room labels show style ids ("garden", "living") instead of names. Avatars have no data source (Yasir's request). |
| 2026-11-14 22:00 | Rooms 20-176 / 20-256 / 20-307 — Q4 comparison | `/house/[token]` | `20-176-…`, `20-256-…`, `20-307-…-figma.png` | `q4-house-room-{garden,kitchen,living}-code.png` | yes | No room title; "Watching together" pill top-right without avatars (Figma: bottom-centre, avatars, "with Sarah"); empty Slot is a soft glow (Figma: dashed circle); demo has 1 Object per room. |
| 2026-11-14 22:00 | On your own (20-701) | `/house/[token]` alone | `20-701-alone-figma.png` | `q4-house-alone-living-code.png` | yes | Figma fades Stories not OK alone (0.28) with "Faded stories wait until someone is with you" and pill "On your own · stories marked OK alone"; code shows only an "On your own" pill. |
| 2026-11-14 22:00 | Object open (20-219) | `/house/[token]` polaroids | `20-219-object-open-figma.png` | not committed (demo photos of unverified origin) | yes | Flight and timing per §3 rule 7; compared live only. |
| 2026-11-14 22:00 | All Studio frames (header) | `/studio/**` | every Studio Figma capture | every `q4-studio-*-code.png` | yes | Code has a "Step N of 4" eyebrow and "Family Studio" label; Figma has a 4-step stepper (Object / Memories / Bring to life / Place), family avatars and close (×). |
| 2026-11-14 22:00 | Memories (20-377), S3 | `/studio/memories/[id]` | `20-377-memories-figma.png` | `q4-studio-bank-code.png` | yes | Figma: polaroid grid with handwritten captions, song chip, voice waveform, question at the side. Code: plain photo grid, add-song / add-voice buttons, questions on their own step. axe 0. |
| 2026-11-14 22:00 | Questions (SH7 57-624), S4 | `/studio/memories/[id]/questions` | `sh7-57-624-questions-figma.png` | `q4-studio-questions-code.png` | yes | Figma: 7 numbered questions in 2 columns with colour toggle and OK alone switch; code: one-column form. axe 0. |
| 2026-11-14 22:00 | Memory sheet (22-736), S5 | `/studio/memories/[id]/sheet` | `22-736-memory-sheet-figma.png` | `q4-studio-sheet-code.png` | yes | Figma has a polaroid preview beside the rows; code has rows only (adds Photos and Name rows). axe 0. |
| 2026-11-14 22:00 | Bring to life (20-451), S6 | `/studio/memories/[id]/review` (running) | `20-451-bring-to-life-figma.png` | `q4-studio-bring-to-life-code.png` | yes | Figma: before/after slider with Enhance / Repair / Colour / Video toggles; code: per-scene progress (bar in green and grey) then the review. Verified end to end with P4 in mock. axe 0. |
| 2026-11-14 22:00 | Approve every scene (23-580), S7 | `/studio/memories/[id]/review` | `23-580-approve-scenes-figma.png` | `q4-studio-approve-code.png` | yes | Figma: scene list with Approved badges, face-change warning, Keep original / Approve anyway; code: one scene at a time, Movement radios, "Use this version", "Try again", "Keep the original photo". Choosing every scene leaves the Memory at `ready_for_review` (request to Yasir). axe 0. |
| 2026-11-14 22:00 | Place (20-536), S8 | `/studio/stories/[id]/place` | `20-536-place-figma.png` | `q4-studio-place-code.png` | yes | Figma: Room background with Objects, room tabs, Story card with OK alone, "Send to Mum's house"; code draws Slots on a plain box with no Room SVG and no Objects (`components/studio/PlaceStory.tsx:133`, request to Yasir). axe 0. |
| 2026-11-14 22:00 | Hear back (23-737), S9 | `/studio?house=…` | `23-737-hear-back-figma.png` | `q4-studio-hear-back-code.png` | yes | Figma: 3 stats, recent moments, most-loved polaroid; code: 2 stats, most-loved card, a row per Memory, link buttons. axe 0. |
| 2026-11-14 22:00 | Care & privacy (23-937), SH3/SH4 | `/studio/care?house=…` | `23-937-care-figma.png` | `q4-studio-care-code.png` | yes | Figma: Don't show chips, privacy and data (download / delete), family roles list; code: Don't show input, OK alone default switch, privacy text, Delete all data, no family list. axe 0. |

## 8. Accessibility notes

Target: WCAG 2.2 AA everywhere; House rules from `AGENTS.md` §3 (no reading, single tap, ≥ 64 px, gentle motion). Checked automatically: `app/tokens.test.ts` (contrast of every colour pair the components use, incl. hover) and `e2e/dev-ui-a11y.spec.ts` (axe, WCAG 2.2 AA, 0 violations on `/dev/ui`).

| Pair | Ratio | Used by | Verdict |
|---|---|---|---|
| white on `primary` `#D9734E` | 3.2:1 | Figma filled buttons | fails AA text → replaced |
| white on `primary-strong` `#B4552F` | 4.9:1 | Button primary, Badge attention/photoPrimary, ToggleGroup primary, Stepper current | AA |
| white on `primary-strong-hover` `#A44B2C` | 5.8:1 | Button primary hover | AA |
| white on `primary` | 3.2:1 | IconButton primary (icon only), Polaroid play icon | OK, non-text ≥ 3:1 |
| `success-text` on `success-surface` | 4.1:1 | Figma Approved badge | fails AA → `success-strong` 5.1:1 |
| white on `success-text` | 5.0:1 | Checkbox checked, Stepper done | AA |
| white on avatar pastels | ~2:1 | Figma avatar initials | fails → ink, 5.7–7.5:1 |
| `ink` at 0.7 on `background` | ≥ 4.5:1 | secondary text, labels, placeholders | AA (Figma used 0.45–0.65) |

Other choices:
- **Targets:** House controls 76 / 92 / 124 px and Heart 230 px; Studio-only controls (Switch 56×32, Checkbox 26, Button `sm` 48) never go on House screens.
- **Focus:** global 3 px `primary` outline with 3 px offset on `:focus-visible`.
- **Motion:** all transitions use `--ease-memorai`; `prefers-reduced-motion` cuts animations and transitions to near zero.
- **Names:** icon-only buttons require a `label` (from `lib/copy.ts`); avatars expose the full name; decorative icons are `aria-hidden`; the stepper announces "done" / "current step".
- **Slots (2026-11-14 review):** the room SVGs draw no furniture, so Objects floated (radio on the living-room wall, kitchen Objects over the cupboard doors). Kitchen and living Slots now rest Objects on a drawn surface: kitchen counter top (y 560–586 of 834), living floor (from y 614); garden unchanged. Values live in `components/studio/room-styles.ts` and `scripts/demo/plan.ts` `PRESET_SLOTS` (ids unchanged, so saved Rooms keep working).
- **House screens (Q4):** every House control has an accessible name (`Open: <story>`, `Play: <memory>`, Back to the room, Next memory); Heart 230 px, round controls ≥ 76 px; no text needed to use the House.
- **Studio screens (Q4, 2026-11-14):** axe WCAG 2.2 AA (`@axe-core/playwright`, tags wcag2a/aa, 21a/aa, 22aa) at 1194×834 in mock mode with seeded data: **0 violations on 9 Studio screens** — Create the House, Create an Object, Memories, Questions, Memory sheet, Review (Bring to life + Approve), Place, Hear back, Care & privacy. Not covered by axe: the Place Slot map has no Room picture, so a sighted family member cannot see where a Slot is in the real room (design gap, not an a11y failure); the progress bar's green/grey pair should be checked against `app/tokens.test.ts` if it stays.
- **Language:** "a person living with Alzheimer's"; no clinical claims (`AGENTS.md` §3).

## 9. S1 mapping from repository specifications (2026-11-14)

Figma MCP tools were unavailable in this Codex session. Alexandre explicitly approved proceeding from the existing repository specifications and exports. This inventory describes the implementation; it is **not** a claim to have read node 22-546 or captured its screenshot. Raphaël: please compare with the frame when MCP access returns.

| Element | Token / component mapping |
|---|---|
| Canvas and layout | `bg-background`, centred `max-w-[1194px]`, `sm:px-page` (72 px), one column on phone |
| Brand | Existing `/brand/memorai-logo.svg`, rendered with `next/image`; no redraw |
| Heading / introduction | `font-display text-40` (phone `text-32`), body `font-body text-18 text-ink/70` |
| First name | Shared `Label` and `Input size="lg"`; no prefilled example; name limit from `CreateHouseRequest` |
| First Room | Shared `Card`, `rounded-card shadow-card bg-surface`; native radio inputs for keyboard operation, selected `border-primary-strong`; lucide `Check` |
| Room illustrations | Existing `/rooms/garden.svg`, `/rooms/kitchen.svg`, `/rooms/living-room.svg` (`living` is the API enum) |
| Consent | Shared `Checkbox`, unchecked initially, associated `Label`, required on client and API |
| Privacy reminder | `text-ink/70`, lucide `LockKeyhole`; no fabricated avatars or family media |
| Primary action | Shared `Button`, `primary-strong` fill / white text, lucide `ArrowRight`; disabled until consent |
| Error / completion | `warning-surface` with an announced error; `Card`, `success-surface` / `success-strong` and confirmation; these states are implementation additions |

Validation: axe WCAG 2.2 AA on tablet and 390 px phone, keyboard Room selection, readable copy, reduced motion inherited from F5. `primary-strong` is a filled-button token: small text in that colour on cream measures 4.45:1; S1 secondary text uses `ink/70` instead.

Integration notes: F4 landed during S1 finalization; creation now uses `lib/db` MongoDB helpers by default, including when `AI_MODE=mock`. An explicit `STUDIO_MOCK_STORE=true` enables the offline test adapter under `app/api/houses/`, persisting only to gitignored `STORAGE_DIR/studio-mock/`; this option refuses non-mock modes. DB failures never silently switch stores. The completion screen stays on S1 until S2 exists, rather than linking to an unimplemented route. Garden Slots reuse the F2 fixture; Kitchen/Living Slot positions are provisional presets for Yasir to review before House integration. Neither their exact positions nor the overall layout has been compared directly to frame 22-546.
