# AGENTS.md — memorAI

This is the single source of rules for every coding agent on this repo (Claude Code reads it through `CLAUDE.md`, Codex reads it directly). Read it fully before writing code. Then read `docs/zones/<your-zone>.md` and `docs/STATUS.md`.

## 1. Product in one paragraph

**memorAI** (product name, logo and brand) lets a family restore and gently animate its real old photos into **Memories**, with the person's real song and the family's real voice, and share them with a relative living with early-stage Alzheimer's. The relative opens one link on a tablet, sees a familiar room, touches an object, and watches a Story, ideally with a relative beside them. Nothing is invented, the family approves everything, and we make no clinical claim.

Product docs: `docs/product/` (storyline). Technical reference: `TECHNICAL.md`. Features and owners: `FEATURES.md`. Schedule: `PLAN.md`.

## 2. Vocabulary (use these exact words in code, types, routes and docs)

| Term | Meaning |
|---|---|
| House | The private space of one person living with Alzheimer's. One private link (token). Holds Rooms. |
| Room | A familiar room: 2D background (default illustrated style, or the family's photo) with fixed Slots. |
| Slot | A fixed place in a Room. An Object sits on it and never moves. |
| Object = Story | A clickable 3D object on a Slot. Touching it plays its Story: Memories in order. |
| Memory | One real memory: restored/animated photo scenes, real videos, real song, ambient sound, family voice. |
| Scene | One photo inside a Memory, processed by the generation chain. |
| Memory bank | Raw media uploaded for a Memory. |
| MemorySheet | Structured summary of a Memory (who, where, song, ambience, message, colour choice). The single contract every creation method fills (form today, text agent later, ElevenLabs agent later). |
| Heart | One reaction after each Memory, sent to the family. |
| OK alone | Per-Memory flag allowing it when the person watches without a relative. |
| Don't show | People or topics the family keeps out of the House. |
| Studio | Family side (`/studio`). UI labels may use Figma wording ("Create", "Bring to life", "Send love"); code uses the vocabulary above. |

## 3. Non-negotiable product rules

1. **No false memories.** Only animate real photos. Never add people, objects, places or events. Motion is subtle. Every prompt sent to a model goes through `lib/ai/prompt-compiler.ts`.
2. **Family approves everything.** Nothing appears in a House unless its scene was approved or set to "keep original photo".
3. **Real voices only.** No voice cloning, no synthetic narration, no avatar.
4. **Nothing ever looks broken on the House side.** No error text, no spinner after the initial preload. If a clip fails, play the original photo with its sound.
5. **House side needs no reading.** No menus, no text required, single tap only, large targets (≥ 64 px), gentle motion only.
6. **Objects never move.** A new Story fills an empty Slot.
6b. **House flow (matches Figma v5):** the link opens **"Choose a room"** (big room cards, no reading needed) → Room → touching an Object makes its Memory polaroids fly out around it (Smart Animate 0.9 s, `cubic-bezier(0.22,1,0.36,1)`) → the person taps a polaroid to start that Memory, **or the first Memory starts by itself after 3 s** so no choice is ever required → full-screen Memory → Heart → next Memory → gentle return to the Room.
7. **Respectful language** in UI and copy: "a person living with Alzheimer's"; never "old", "demented", "patient".
8. **No medical claims** anywhere in the UI or README.

## 4. Stack (decided — do not change without a PR to `TECHNICAL.md`)

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS v4 + shadcn/ui · react-three-fiber + drei · TanStack Query + Zustand · Howler.js · React Hook Form + Zod · MongoDB Atlas (official `mongodb` driver, no Mongoose) · local disk storage · `@fal-ai/client` · `@anthropic-ai/sdk` · Biome · Vitest · Playwright · pnpm · Node ≥ 24.

## 5. Commands

```bash
pnpm install          # install
pnpm dev              # dev server (AI_MODE=mock by default)
pnpm verify           # typecheck + lint + unit tests — run before every push
pnpm typecheck        # tsc --noEmit
pnpm lint             # biome check .
pnpm format           # biome format --write .
pnpm test             # vitest run
pnpm test:e2e         # playwright (mock mode)
pnpm build            # next build
pnpm demo             # build + seed demo + start in production mode
pnpm demo:check       # House in demo mode with network blocked
pnpm seed:demo        # create the demo House in MONGODB_DB from demo-assets/
pnpm export:demo      # regenerate demo-assets/bundle.json from the demo DB
```

## 6. Code conventions

- TypeScript strict, no `any` (use `unknown` + Zod parse). Named exports. Files `kebab-case.ts`, components `PascalCase.tsx`.
- **Contracts first.** Every API request/response, DB document and the MemorySheet are Zod schemas in `lib/contracts/`. Types are `z.infer`. Never redefine a shape locally.
- Route handlers validate input with the contract, return `{ data }` or `{ error: { code, message, retryable } }`.
- Server-only code (`lib/ai`, `lib/db`, `lib/jobs`, `lib/storage`) starts with `import "server-only"`.
- External calls (fal, Claude) only through `lib/ai/*`, which switches on `AI_MODE` (`mock` | `live`). Model IDs live only in `lib/ai/models.ts`.
- UI: shadcn components from `components/ui/`, tokens from `app/globals.css` (`@theme`). No hard-coded hex colours or font sizes in components.
- Strings shown to users live in `lib/copy.ts` (English).
- 3D scene components are client-only (`"use client"` + `dynamic(..., { ssr: false })`).
- Comments explain *why*, not *what*.

## 7. Never do

- Never read, print, edit or commit `.env*` files or secrets. Never put a key in `NEXT_PUBLIC_*`.
- Never call fal or Claude from the browser.
- Never use `AI_MODE=live` in tests or CI.
- Never write generated files into `public/` (use `storage/` via `/api/files/...`).
- Never commit `storage/`, `demo-assets/`, real family photos, voices or copyrighted songs. The repo is public.
- Never push to `main` directly or force-push.
- Never edit files outside your zone without saying so in the PR (see `docs/zones/`). Never change `lib/contracts/` without a PR reviewed by Timoté.
- Never remove a fallback path (still photo, mock mode, demo mode) to "simplify".
- Never add a dependency without a one-line reason in the PR.

## 8. Definition of done (for any feature)

1. Acceptance criteria in `FEATURES.md` met.
2. Works in `AI_MODE=mock`; no live credits needed to run it.
3. `pnpm verify` passes; new logic in `lib/` has a unit test.
4. House-side changes: `pnpm demo:check` passes.
5. UI matches the Figma frame (v5 page) or the deviation is noted in `docs/DESIGN.md`.
6. `docs/STATUS.md` updated (handoff), PR opened with the template, CI green.

## 9. Zones and owners

| Zone | Owner | Paths |
|---|---|---|
| Pipeline + contracts (lead) | Timoté | `lib/ai/`, `lib/jobs/`, `lib/contracts/`, `lib/db/`, `lib/storage/`, `app/api/jobs/`, `app/api/memories/*/generate`, `app/api/files/`, `instrumentation.ts`, `mocks/` |
| Studio | Alexandre (Codex) | `app/studio/`, `components/studio/`, Studio API routes (houses, rooms, stories, memories, assets, scenes, publish, feedback) |
| House | Yasir | `app/house/`, `components/house/`, `lib/house/`, `app/api/h/` |
| Design + platform | Raphaël | Figma, `app/globals.css`, `app/fonts.ts`, `components/ui/`, `public/brand/`, `public/rooms/`, `public/objects/`, `public/samples/`, `docs/DESIGN.md`, `scripts/seed-demo.ts`, `scripts/export-demo.ts`, pitch |

Details: `docs/zones/*.md`. Shared files (`package.json`, `proxy.ts`, `lib/copy.ts`, configs): small focused PRs, mention it in the description.

## 10. Working without talking

- Before starting: `git pull`, read `docs/STATUS.md`.
- Before pushing or pausing: add 5 lines to `docs/STATUS.md` (done / in progress / blocked / contract changes / next). Claude Code: `/handoff`.
- Need something from another zone: write it under "Requests" in `docs/STATUS.md` with your name.
