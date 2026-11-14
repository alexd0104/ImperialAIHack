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
| Choose a room | 20-67 | `/house/[token]` → `ChooseRoom` | Yasir | Entry screen of the House (kept as in Figma) |
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

Defined in `app/globals.css` (see `TECHNICAL.md` §3.2). Figma currently has **no Variables or Styles**: all values were read from layers. Cleanup done in code: `#2B2420` merged into `ink #3B2A20`; DM Sans leftovers replaced by Nunito.

## 4. Components

| Figma component | Code | Notes |
|---|---|---|
| Button (Style=Primary/Secondary) | `components/ui/button.tsx` | shadcn, tokens |
| Toggle (State=On/Off) | `switch.tsx` | success `#7FA36F`, off `#DCD5CB` |
| Close Button / Rooms Button | `icon-button.tsx` (64) | round, `shadow-round-button` |
| Polaroid (Video, Caption) | `polaroid.tsx` | Caveat caption, `shadow-polaroid`, radius 3/2 |
| Family avatars | `avatar-group.tsx` | rings `#FFF8EE` 3 px, overlap −10 |
| Empty Spot | `components/house/empty-slot.tsx` | House only |
| Objects (9) | `public/objects/*.svg` | library Objects |
| memorAI logo | `public/brand/memorai-logo.svg` | |
| Story progress, Stepper, chips, inputs, checkboxes, segmented, tabs, cards | `segmented-progress.tsx`, `stepper.tsx`, `badge.tsx`, `input.tsx`, `checkbox.tsx`, `toggle-group.tsx`, `tabs.tsx`, `card.tsx` | Built as plain frames in Figma; componentised in code |
| House controls | `components/house/controls.tsx` | Back 92, Pause 124, Return 76, Heart 230 |

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

## 5. Gaps (frames still to design — SH7)

Designed on 2026-11-14 (row 4, see §2): free-text prompt · full set of guided questions · voice recording · ordering Memories · per-Memory OK-alone · publish confirmation · Story end / return to Room · loading, error and "clip can't play" states · room photo upload · Studio phone layout.

Still open: animated vs still side-by-side (S7 can reuse the 3b before/after layout) · Stories for Kitchen and Living room Objects (same frames, other content) · Studio desktop (> 1194 px: centre the iPad layout) · (sign-in / invites: out of scope).

New frames follow the code rules, not the old Figma leftovers: readable text at `ink` ≥ 0.7, Stepper ✓ is a vector check (no DM Sans), primary buttons in `primary` `#D9734E` (the local Button component's Primary variant is dark and is overridden on every instance).

Accessibility gap: secondary text at 0.45–0.55 opacity on cream likely fails WCAG AA → code uses ≥ 0.7 for readable text.

## 6. How we used the Figma MCP server

_Fill in as you go (for the presentation):_ which frames were read through MCP, what it produced (layout, values, screenshots), what we changed by hand, time saved.

- **2026-11-14 — spec extraction.** `get_metadata` on page 20:66 listed every frame and instance (no manual node hunting). `get_design_context` on 20-624, 20-668, 23-580 returned exact paddings, radii, shadows, opacities and font weights → §4.1 table in minutes instead of inspecting layers one by one. It also surfaced the Figma gaps we fix in code: leftover `#2B2420` and DM Sans in the Stepper, secondary text at 0.45–0.65 opacity (fails AA), avatar ring colour with no token.
- **2026-11-14 — asset export.** `download_assets` exported the logo, 3 rooms and 9 Objects as SVG (13 files). By hand: removed the parent-frame rects the exporter adds, squared the room corners. Checked every file renders on its own.
- **2026-11-14 — SH7, designing with the MCP server.** The 8 missing frames were built directly in the Figma file with `use_figma`: the Studio header was cloned from existing v5 frames so it stays identical, and every frame reuses the file's own components (Button, Toggle, Close, Polaroid, Family avatars, Empty Spot, logo, Object/Flower). Fixed in the new frames while building: DM Sans ✓ → vector check, low-opacity text → 0.7, dark Primary button → terracotta. One visual check per frame caught 3 layout bugs (clipped chips, polaroid captions squashed by `resize` instead of `rescale`, phone actions cut off), each fixed with a targeted edit.

## 7. Evidence log

| Date/time | Frame | Route | Figma image | Code image | MCP used? | Deviations |
|---|---|---|---|---|---|---|
| 2026-11-14 | Story · Memory playing (20-624) | `MemoryPlayer` | `docs/design-evidence/20-624-memory-playing-figma.png` | _after H-tasks_ | yes (get_design_context) | — |
| 2026-11-14 | Story · Send love (20-668) | `HeartScreen` | `docs/design-evidence/20-668-send-love-figma.png` | _after H-tasks_ | yes | subtitle opacity 0.65 → 0.7 |
| 2026-11-14 | Create · 3b Approve every scene (23-580) | `/studio/memories/[id]/approve` | `docs/design-evidence/23-580-approve-scenes-figma.png` | _after S-tasks_ | yes | stepper todo label 0.45 → 0.7, subtitle 0.6 → 0.7 |
| 2026-11-14 | SH7 · 8 new frames (57-624 … 61-1155) | see §2 row 4 | `docs/design-evidence/sh7-*-figma.png` | _when built_ | yes (`use_figma` built them from local components; captures via `get_screenshot`) | — |
