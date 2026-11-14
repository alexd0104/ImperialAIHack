# CLAUDE.md

@AGENTS.md

The rules above are shared with Codex. This file only adds what is specific to Claude Code.

## Start of every session

1. Run `/orient` (or follow `AGENTS.md` §11): branch, repo state, STATUS, board, environment.
2. Read `docs/zones/<OWNER_ZONE>.md` (your zone is set in `.env.local` as `OWNER_ZONE`; the hooks use it).
3. Work on `main` directly: `git pull --rebase`, commit with `(<ID>)` at the end of the subject, `pnpm verify`, push.

## Tools in `.claude/`

| Kind | Name | Use it when |
|---|---|---|
| Agent | `reviewer` | Before opening a PR: "use the reviewer agent on this branch". Read-only. |
| Agent | `tester` | To write Vitest/Playwright tests for the code you just changed. |
| Skill | `add-api-route` | Adding or changing an API route (contract → route → mock → test). |
| Skill | `add-fal-step` | Adding or swapping a fal model in the generation chain. |
| Skill | `figma-to-component` | Turning a Figma frame into code (uses the Figma MCP server). |
| Command | `/orient` | First thing in every session: where am I, what is ready, is the env sane. |
| Command | `/start <ID>` | Starting any task: checks dependencies, creates the branch, plans. |
| Command | `/verify` | Typecheck + lint + tests, with fixes for what fails. |
| Command | `/demo-check` | Checks the House demo mode works offline. |
| Command | `/handoff` | Writes your status lines into `docs/STATUS.md` before pushing or pausing. |

Hooks (automatic): Biome formats every file you edit · reading/editing `.env*` is blocked · editing outside your zone triggers a warning you must acknowledge in the PR · `git push --force` is blocked · creating a task branch whose dependencies are not merged is blocked.

## Figma

The Figma MCP server is configured in `.mcp.json` (remote server). Run `/mcp` once to authenticate. Source of truth: page **"v5 · Full flow · memorAI"** of `https://www.figma.com/design/ngUmuGo6WeD8jCCSbWsRDc`. Pages v1–v4 are superseded: never build from them. Frame-to-route mapping: `docs/DESIGN.md`.

## Behaviour

- Speed first: push small commits straight to `main`, keep it runnable, keep token use low (no subagents unless asked).
- When a decision is not covered by `TECHNICAL.md`, choose the simplest option that keeps the demo reliable, and note it in the PR and in `docs/STATUS.md`.
- If you must touch another zone, keep the change minimal and list the files in the PR description.
