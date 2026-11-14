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

**Icons (Figma custom → lucide-react):** home → Home · back → ChevronLeft · next → ChevronRight · pause → Pause · heart → Heart · close → X · rooms → LayoutGrid · camera → Camera · generate → Sparkles · gear → Settings · play → Play · warning → AlertCircle · check → Check.

## 5. Gaps (frames still to design — SH7)

Free-text prompt · full set of guided questions · voice recording screen · animated vs still side-by-side · ordering Memories · publish confirmation · per-Memory OK-alone tick · Story end / return to Room · Stories for Kitchen and Living room Objects · room photo upload flow · Studio desktop and phone layouts · loading, error and "clip can't play" states · (sign-in / invites: out of scope).

Accessibility gap: secondary text at 0.45–0.55 opacity on cream likely fails WCAG AA → code uses ≥ 0.7 for readable text.

## 6. How we used the Figma MCP server

_Fill in as you go (for the presentation):_ which frames were read through MCP, what it produced (layout, values, screenshots), what we changed by hand, time saved.

## 7. Evidence log

| Date/time | Frame | Route | Figma image | Code image | MCP used? | Deviations |
|---|---|---|---|---|---|---|
| | | | `docs/design-evidence/...-figma.png` | `docs/design-evidence/...-code.png` | | |
