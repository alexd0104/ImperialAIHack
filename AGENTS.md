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
pnpm env:check        # validate .env.local (prints names only, never values)
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
- Never force-push. Direct pushes to `main` are allowed (hackathon speed): `git pull --rebase`, `pnpm verify`, then push.
- Never edit files outside your zone without saying so in the PR (see `docs/zones/`). Never change `lib/contracts/` without a PR reviewed by Timoté.
- Never remove a fallback path (still photo, mock mode, demo mode) to "simplify".
- Never add a dependency without a one-line reason in the PR.

## 8. Definition of done (for any feature)

1. Acceptance criteria in `FEATURES.md` met.
2. Works in `AI_MODE=mock`; no live credits needed to run it.
3. `pnpm verify` passes; new logic in `lib/` has a unit test.
4. House-side changes: `pnpm demo:check` passes.
5. UI matches the Figma frame (v5 page) or the deviation is noted in `docs/DESIGN.md`.
6. `docs/STATUS.md` updated (handoff), pushed to `main` with a commit subject ending in `(<ID>)`, CI green.

## 9. Zones and owners

| Zone | Owner | Paths |
|---|---|---|
| Pipeline + contracts (lead) | Timoté | `lib/ai/`, `lib/jobs/`, `lib/contracts/`, `lib/db/`, `lib/storage/`, `app/api/jobs/`, `app/api/memories/*/generate`, `app/api/files/`, `instrumentation.ts`, `mocks/` |
| Studio | Alexandre (Codex) | `app/studio/`, `components/studio/`, Studio API routes (houses, rooms, stories, memories, assets, scenes, publish, feedback) |
| House | Yasir | `app/house/`, `components/house/`, `lib/house/`, `app/api/h/` |
| Design + platform | Raphaël | Figma, `app/globals.css`, `app/fonts.ts`, `components/ui/`, `public/brand/`, `public/rooms/`, `public/objects/`, `public/samples/`, `docs/DESIGN.md`, `scripts/seed-demo.ts`, `scripts/export-demo.ts`, pitch |

Details: `docs/zones/*.md`. Shared files (`package.json`, `proxy.ts`, `lib/copy.ts`, configs): small focused PRs, mention it in the description.

## 10. Working without talking

**Task guardrail (mandatory):** before starting any task, run `node scripts/tasks.mjs check <ID>`. If it fails, do not start: the task's dependencies are not merged on `main`. Pick a ready task with `node scripts/tasks.mjs next <timote|alexandre|yasir|raphael>`. Commit on `main` directly; the commit subject must end with `(<ID>)` (use `(<ID>-wip)` for partial work) — that is how a task is marked done. The live board (who did what, what is ready) is the GitHub issue **"📋 memorAI task board"**, refreshed automatically; locally: `node scripts/tasks.mjs board`. Tasks, owners and dependencies live in `docs/tasks.json`.


- Before starting: `git pull`, read `docs/STATUS.md`.
- Before pushing or pausing: add 5 lines to `docs/STATUS.md` (done / in progress / blocked / contract changes / next). Claude Code: `/handoff`.
- Need something from another zone: write it under "Requests" in `docs/STATUS.md` with your name.

## 11. Agent operating manual

How to work well on this repo when nobody is there to answer.

### 11.1 Orient yourself first (every session, before any edit)

1. **Where am I?** `git branch --show-current`, `git status --short`, `git log --oneline -3`. Work on `main` (no PRs during the hackathon). Feature branches are optional.
2. **Who am I?** Your zone is the human's `OWNER_ZONE` (pipeline=Timoté, studio=Alexandre, house=Yasir, design=Raphaël). If unknown, ask once.
3. **What is the state?** `git pull --ff-only` (or `git fetch && git rebase origin/main` on a branch), read `docs/STATUS.md` (newest entries + Requests + Contract changes), run `node scripts/tasks.mjs board` or `next <person>`.
4. **Is my task allowed?** `node scripts/tasks.mjs check <ID>`. Blocked → do not start; pick a ready task.
5. **Is the environment sane?** `node -v` (≥ 24), `pnpm -v`, `test -f .env.local && echo ok` (never print it), `AI_MODE` should be `mock` unless the human said otherwise. Is a dev server already on port 3000? Reuse it instead of starting a second one.
6. **Read before writing:** the task row in `FEATURES.md`, your `docs/zones/<zone>.md`, the contracts you will use in `lib/contracts/`, and the relevant `TECHNICAL.md` section. Then propose a short plan.

### 11.2 While working

- Stay in your zone. A one-line fix elsewhere is acceptable if it unblocks you; list it in the PR. Anything bigger → a Request in `docs/STATUS.md`.
- Mock first: everything must work with `AI_MODE=mock`. Never spend live credits to debug UI.
- Small steps: make it work for one case, run it, then generalise. Commit often on your branch.
- Run what you build: `pnpm verify` after each meaningful change; open the page or call the route (`curl`) to see it really works; for House changes run `pnpm demo:check`.
- Check your own diff before committing (`git diff`): no secrets, no debug logs, no unrelated reformatting, no files from other zones by accident.
- Never weaken a guardrail to get unblocked (skip a hook, remove a fallback, hard-code a key, disable a test, edit `docs/tasks.json` deps to bypass a block).

### 11.3 When something goes wrong (troubleshooting)

1. Check `TECHNICAL.md` §10 Troubleshooting first; most expected failures are listed with their fix.
2. Reproduce with the smallest case, read the full error, form one hypothesis at a time.
3. **Two-strikes rule:** if the same approach fails twice, stop retrying it. Change approach, or report to the human what you tried and what you observed.
4. Do not "fix" by deleting tests, catching and ignoring errors, or switching to live mode.
5. If the cause is in another zone or a contract: write a Request in `docs/STATUS.md` with the exact error, file:line, and your proposed fix; work around it with a mock meanwhile.
6. Once fixed, if the problem could hit someone else, add a row to `TECHNICAL.md` §10 (symptom · cause · fix) in the same PR.

### 11.4 Adding tasks you discover (bugs, missing pieces, troubleshooting work)

You will find work that is not in `FEATURES.md`. Do not silently grow your current PR; register it:

```bash
node scripts/tasks.mjs add --title "Safari: audio does not start on first tap" --owner yasir --deps H6 --note "Howler ctx suspended; see STATUS 23:10"
node scripts/tasks.mjs lint
```

- IDs are assigned automatically as `B1`, `B2`, … (priority `FIX`). Owner = the zone that owns the files to change, not necessarily you.
- If you fix it yourself now (small, in your zone): add the task, include `docs/tasks.json` in your PR, and put the ID in the PR title, e.g. `fix(house): unlock audio on first tap (B1)`.
- If someone else must do it: open a tiny PR `chore(tasks): add B1` with only `docs/tasks.json`, and add a line under "Requests" in `docs/STATUS.md` mentioning the owner.
- Duplicate ID after a rebase (two people added B5): keep the other one, rerun `add` for yours, `lint`, push.
- New tasks never block MUST work unless the human decides so; set `deps` only to what is truly required.

### 11.5 Finishing

- Acceptance criteria met, `pnpm verify` green, reviewer agent (Claude Code) or self-review (Codex) done.
- `docs/STATUS.md` handoff written (`/handoff`), including anything you learned that others need.
- Commit subject ends with `(<ID>)` so the board marks it done; note files outside your zone and contract changes in `docs/STATUS.md`.
- If you stop mid-task: push with a `(<ID>-wip)` commit subject (keep `main` runnable), and say in STATUS exactly where you stopped and what is next.

## 12. Next.js notes

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
