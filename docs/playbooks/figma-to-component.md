# Playbook: Figma frame → code

Shared by Claude Code (skill `figma-to-component`) and Codex. Source of truth: Figma file `https://www.figma.com/design/ngUmuGo6WeD8jCCSbWsRDc`, page **v5 · Full flow · memorAI** only.

1. **Find the frame** in the mapping table of `docs/DESIGN.md` (frame name, node id, route, owner). Node link pattern: `https://www.figma.com/design/ngUmuGo6WeD8jCCSbWsRDc?node-id=<id with - instead of :>`.
2. **Read it with the Figma MCP server** (configured in `.mcp.json`; authenticate once with `/mcp` in Claude Code, or per the Figma guide for Codex): ask for the design context and a screenshot of that node.
3. **Map, don't copy.** Figma has no variables: every value is raw. Translate:
   - colours → tokens in `app/globals.css` (`bg-background`, `text-ink`, `bg-primary`, …). If a colour has no token, ask Raphaël (STATUS → Requests); never hard-code hex.
   - fonts → `font-display` (Fraunces), `font-body` (Nunito), `font-hand` (Caveat). DM Sans in Figma is a leftover: ignore.
   - radius/shadows → `rounded-card`, `shadow-card`, etc.
   - components → `components/ui/` (Button, Switch, Badge, Card, Polaroid, IconButton, AvatarGroup, Stepper, SegmentedProgress). Missing component? Build it locally in your zone and ask Raphaël to promote it.
   - icons → `lucide-react` equivalents listed in `docs/DESIGN.md`.
   - SVG illustrations (logo, rooms, objects) → use files in `public/`, never redraw.
4. **Layout**: frames are 1194 × 834. Build with flex/grid and the 72 px side margin, not absolute pixel positions (except House Slots, which use normalised coordinates).
5. **Copy**: put strings in `lib/copy.ts`. UI labels may use Figma wording; code identifiers use the AGENTS.md vocabulary.
6. **Accessibility**: text that must be read uses `ink` at ≥ 0.7 opacity; House targets ≥ 64 px; respect `prefers-reduced-motion`.
7. **Evidence (Figma prize)**: screenshot the built screen at 1194 × 834, save Figma + code images to `docs/design-evidence/<frame-slug>-{figma,code}.png`, and add a row to the evidence log in `docs/DESIGN.md` (frame, route, what MCP gave, deviations).
