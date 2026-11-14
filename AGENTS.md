# AGENTS.md — memorAI

Single source of rules for every coding agent (Claude Code reads it via `CLAUDE.md`; Codex reads it directly). Then read `docs/zones/<your-zone>.md`. Read other docs **by section only** (see §11).

## 1. Product

**memorAI** lets a family restore and gently animate its real old photos into **Memories** (with the person's real song and the family's real voice) and share them with a relative living with early-stage Alzheimer's, who opens one link on a tablet, chooses a familiar room, touches an object and watches a Story with family beside them. Nothing is invented, the family approves everything, no clinical claim. Docs: `docs/product/storyline.md`, `TECHNICAL.md`, `FEATURES.md`, `PLAN.md`.

## 2. Vocabulary (exact words in code, types, routes, docs)

House (one person's private space, one token link, holds Rooms) · Room (2D background + fixed Slots) · Slot (fixed place; its Object never moves) · Object = Story (tap → plays its Memories) · Memory (restored/animated scenes, real videos, real song, ambience, family voice) · Scene (one photo in the generation chain) · Memory bank (raw uploads) · MemorySheet (the one contract every creation method fills: form now, agents later) · Heart (reaction sent to family) · OK alone (per-Memory flag) · Don't show (people/topics kept out) · Studio (family side `/studio`; UI may use Figma wording "Create", "Bring to life", "Send love").

## 3. Product rules (non-negotiable)

1. **No false memories:** animate only real photos; never add people, objects, places or events; subtle motion; every model prompt goes through `lib/ai/prompt-compiler.ts`.
2. **Family approves everything** before it reaches a House (approved scene or "keep original photo").
3. **Real voices only:** no cloning, no synthetic narration, no avatar.
4. **House never looks broken:** no error text, no spinner after preload; failed clip → original photo with its sound.
5. **House needs no reading:** no menus, single tap, targets ≥ 64 px, gentle motion.
6. **Objects never move;** a new Story fills an empty Slot.
7. **House flow (Figma v5):** "Choose a room" → Room → tap Object → polaroids fly out (0.9 s, `cubic-bezier(0.22,1,0.36,1)`) → tap one, or the first Memory starts after 3 s → full-screen Memory → Heart → next → gentle return to the Room.
8. Respectful language ("a person living with Alzheimer's"; never "old", "demented", "patient"). No medical claims.

## 4. Stack (change only via `TECHNICAL.md`)

Next.js 16 App Router, TS strict · Tailwind v4 + shadcn/ui · react-three-fiber + drei · TanStack Query + Zustand · Howler.js · React Hook Form + Zod · MongoDB Atlas (`mongodb` driver) · local disk storage · `@fal-ai/client` · `@anthropic-ai/sdk` · Biome · Vitest · Playwright · pnpm · Node ≥ 24.

## 5. Commands

`pnpm install` · `pnpm env:check` (names only) · `pnpm dev` · `pnpm verify` (typecheck + lint + tests, before every push) · `pnpm build` · `pnpm test:e2e` · `pnpm demo` · `pnpm demo:check` · `pnpm seed:demo` · `pnpm export:demo` · `node scripts/tasks.mjs next|check|board|add|lint` · `node scripts/doc.mjs <file> <section>` (print one doc section).

## 6. Code conventions

- TS strict, no `any` (use `unknown` + Zod). Named exports. Files `kebab-case.ts`, components `PascalCase.tsx`.
- **Contracts first:** every API I/O, DB document and the MemorySheet is a Zod schema in `lib/contracts/`; types via `z.infer`; never redefine a shape locally.
- Routes validate input and return `{ data }` or `{ error: { code, message, retryable } }`.
- `lib/ai`, `lib/db`, `lib/jobs`, `lib/storage` start with `import "server-only"`.
- fal/Claude only through `lib/ai/*` (switches on `AI_MODE` mock|live); model IDs only in `lib/ai/models.ts`.
- UI: `components/ui/` + tokens from `app/globals.css`; no hard-coded hex or font sizes. User strings in `lib/copy.ts`.
- 3D components client-only (`"use client"` + `dynamic(..., { ssr: false })`). Comments explain *why*.

## 7. Never

- Read, print, edit or commit `.env*` or secrets; put a key in `NEXT_PUBLIC_*`; call fal/Claude from the browser; use `AI_MODE=live` in tests/CI.
- Write generated files to `public/` (use `storage/` via `/api/files/...`); commit `storage/`, `demo-assets/`, real photos, voices or copyrighted songs (public repo).
- Force-push. (Direct pushes to `main` are allowed: `git pull --rebase` → `pnpm verify` → push.)
- Edit outside your zone without noting it in `docs/STATUS.md`; change `lib/contracts/` without Timoté's review.
- Remove a fallback (still photo, mock mode, demo mode); add a dependency without a one-line reason in the commit.

## 8. Definition of done

Acceptance criteria in `FEATURES.md` met · works in `AI_MODE=mock` · `pnpm verify` green, new `lib/` logic has a test · House changes pass `pnpm demo:check` · UI matches Figma v5 or the deviation is in `docs/DESIGN.md` · `docs/STATUS.md` handoff · pushed to `main` with a commit subject ending in `(<ID>)` · CI green.

## 9. Zones and owners

| Zone | Owner | Main paths |
|---|---|---|
| Pipeline + contracts (lead) | Timoté | `lib/{ai,jobs,contracts,db,storage}/`, `app/api/{jobs,files,auth}/`, generate/retry routes, `instrumentation.ts`, `proxy.ts`, `mocks/` |
| Studio | Alexandre (Codex) | `app/studio/`, `components/studio/`, Studio API routes |
| House | Yasir | `app/house/`, `components/house/`, `lib/house/`, `app/api/h/` |
| Design + platform | Raphaël | `app/globals.css`, `app/fonts.ts`, `components/ui/`, `public/{brand,rooms,objects,samples}/`, `docs/DESIGN.md`, demo seed/export scripts, pitch |

Full paths: `docs/zones/*.md`. Shared files (`package.json`, `proxy.ts`, `lib/copy.ts`, configs): small focused commits.

## 10. Tasks and coordination (no talking needed)

- Before a task: `node scripts/tasks.mjs check <ID>`; if it fails, don't start — `node scripts/tasks.mjs next <timote|alexandre|yasir|raphael>`.
- Work on `main`; commit subject ends with `(<ID>)` (partial: `(<ID>-wip)`) — that marks it done on the GitHub issue "📋 memorAI task board".
- Before pushing or pausing: 5-line handoff at the top of the Log in `docs/STATUS.md` (Claude Code: `/handoff`). Needs from another zone → "Requests" in `docs/STATUS.md`.
- **Round v2 (night 14→15 Nov):** briefs in `docs/FEATURES-V2.md`; overnight runs with `pnpm autopilot <you>` (`docs/AUTOPILOT.md`); autopilot handoffs go to `docs/status/<you>.md`, not STATUS.md.
- Found extra work (bug, missing piece)? `node scripts/tasks.mjs add --title "..." --owner <person> [--deps X]` then `lint`; fix it with `(B<n>)` in the commit if it's yours.

## 11. Working well (full manual: `docs/playbooks/agent-manual.md`)

- **Orient first:** branch + `git status`, `git pull --rebase`, top of `docs/STATUS.md` (contract changes, requests, 3 newest entries), `tasks.mjs next`, env sane (`node -v` ≥ 24, `.env.local` present — never print it, `AI_MODE=mock`, reuse a running dev server). Claude Code: `/orient`.
- **Read by section:** `node scripts/doc.mjs TECHNICAL.md 4.3` (or a heading word), `grep -n "| <ID> |" FEATURES.md`, grep the frame name in `docs/DESIGN.md`. Never read `docs/status-archive.md`, `pnpm-lock.yaml`, `node_modules/` listings or media. For Next.js docs (§12): grep for one guide and read only that file.
- **Work small, run what you build** (`pnpm verify`, open the page / curl the route), keep output short (`| tail -40`, `git diff --stat`), review your diff before committing.
- **Troubleshooting:** check `TECHNICAL.md` §10 first; one hypothesis at a time; **two-strikes rule** — same approach fails twice → change approach or report; never "fix" by deleting tests, swallowing errors or going live; if the cause is elsewhere, write a Request and mock around it; add new fixes to §10.
- **Never weaken a guardrail** (hooks, fallbacks, tests, task deps) to get unblocked.
- **Tokens:** `/clear` between tasks, `/compact` past ~60 %; lighter model for routine work; no subagents unless asked; pipeline sessions disable the Figma MCP.
- **Stopping mid-task:** push a runnable `(<ID>-wip)` commit and say in STATUS exactly where you stopped.

## 12. Next.js notes

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
