# CLAUDE.md

@AGENTS.md

The rules above are shared with Codex. This file only adds what is specific to Claude Code.

## Start of every session

1. `git pull` and read `docs/STATUS.md`.
2. Read `docs/zones/<OWNER_ZONE>.md` (your zone is set in `.env.local` as `OWNER_ZONE`; the hooks use it).
3. Work on a branch `feat/<zone>-<topic>` (see `GIT.md`).

## Tools in `.claude/`

| Kind | Name | Use it when |
|---|---|---|
| Agent | `reviewer` | Before opening a PR: "use the reviewer agent on this branch". Read-only. |
| Agent | `tester` | To write Vitest/Playwright tests for the code you just changed. |
| Skill | `add-api-route` | Adding or changing an API route (contract → route → mock → test). |
| Skill | `add-fal-step` | Adding or swapping a fal model in the generation chain. |
| Skill | `figma-to-component` | Turning a Figma frame into code (uses the Figma MCP server). |
| Command | `/verify` | Typecheck + lint + tests, with fixes for what fails. |
| Command | `/demo-check` | Checks the House demo mode works offline. |
| Command | `/handoff` | Writes your status lines into `docs/STATUS.md` before pushing or pausing. |

Hooks (automatic): Biome formats every file you edit · reading/editing `.env*` is blocked · editing outside your zone triggers a warning you must acknowledge in the PR · `git push --force` and pushes to `main` are blocked.

## Figma

The Figma MCP server is configured in `.mcp.json` (remote server). Run `/mcp` once to authenticate. Source of truth: page **"v5 · Full flow · memorAI"** of `https://www.figma.com/design/ngUmuGo6WeD8jCCSbWsRDc`. Pages v1–v4 are superseded: never build from them. Frame-to-route mapping: `docs/DESIGN.md`.

## Behaviour

- Prefer small PRs (< 400 lines) that keep `main` runnable.
- When a decision is not covered by `TECHNICAL.md`, choose the simplest option that keeps the demo reliable, and note it in the PR and in `docs/STATUS.md`.
- If you must touch another zone, keep the change minimal and list the files in the PR description.
