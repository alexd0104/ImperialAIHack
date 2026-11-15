# Zone: Design + platform — Raphaël

**Mission:** memorAI looks warm, consistent and accessible on both sides, matches the Figma v5 design, and we can prove our Figma process to win the Best-Designed AI Product prize. Also owns the demo content and the pitch deck.

**Paths:** Figma file, `app/globals.css`, `app/fonts.ts`, `components/ui/`, `public/brand/`, `public/rooms/`, `public/objects/`, `public/samples/`, `docs/DESIGN.md`, `docs/design-evidence/`, `scripts/seed-demo.ts`, `scripts/export-demo.ts`.

**Features:** F5, Q4, P6 (with Timoté), SH2, SH7 (+ pitch). See `FEATURES.md`.

**Order:**
1. Export from Figma v5 as SVG: memorAI logo, 3 room backgrounds (garden, kitchen, living), 9 objects → `public/`.
2. F5: tokens in `globals.css` (`TECHNICAL.md` §3.2), merge `#2B2420` into `ink`, drop DM Sans; shadcn mapping; fonts; base components (Button, Switch, Badge/Chip, Card, Polaroid, IconButton sizes 64/76/92/124, AvatarGroup, Stepper, SegmentedProgress, Heart button 230).
3. Optional but valuable for the prize: add the tokens as **Figma Variables** so design and code share one source.
4. SH7 missing frames, in this priority: free text + full question set → voice recording → Story end → loading/error/fallback states → ordering + publish confirmation → room photo upload → phone Studio.
5. Demo content (with consent), `seed-demo.ts`, `export-demo.ts`.
6. Pitch slides incl. one Figma slide (frame → code → accessibility principles).

**Rules:**
- Only Raphaël creates components in `components/ui/`; others request them in `docs/STATUS.md`.
- Contrast: text that must be read uses `ink` ≥ 0.7 opacity on cream (Figma secondary text at 0.45–0.55 fails AA).
- Figma AI placeholder photos never ship as real content; README/E2E use CC0 images in `public/samples/`.
- Keep v5 as the only source of truth; if you change direction, update `docs/DESIGN.md` mapping in the same hour.

**Definition of done (zone-specific):** every MUST screen has a row in the DESIGN.md evidence log; tokens used everywhere (no hex in components — the reviewer agent checks this).
