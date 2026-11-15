---
name: figma-to-component
description: Turn a memorAI Figma frame (page v5) into code with the Figma MCP server, using our tokens and shadcn components, and log Figma-vs-code evidence for the Figma prize. Use when building or restyling any screen.
---

Follow `docs/playbooks/figma-to-component.md` exactly. It is the single source shared with Codex; read it now before writing code.

Summary: get the frame node link from `docs/DESIGN.md` → read it via the Figma MCP server (design context + screenshot) → map values to tokens in `app/globals.css` and components in `components/ui/` (never hard-code hex or sizes) → build the screen in your zone → screenshot code vs Figma → add a row to the evidence log in `docs/DESIGN.md`.
