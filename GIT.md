# GIT.md — memorAI

Goal: four people (three on Claude Code, one on Codex) ship in parallel without talking and without breaking `main`.

## 1. Branches

- `main` is always runnable (`pnpm dev` and `pnpm build` work). Protected: no direct push, no force-push.
- Work branches from the latest `main`: `feat/<zone>-<ID>-<topic>`, `fix/<zone>-<topic>`, `docs/<topic>`, `chore/<topic>`.
  - zones: `pipeline`, `studio`, `house`, `design`, `contracts`, `shared`
  - example: `feat/studio-S3-memory-bank`, `feat/pipeline-P1-job-engine`, `feat/contracts-memory-sheet-v2`
- **Max ~2 hours of work per branch.** Merge small and often. Rebase on `main` before opening the PR: `git fetch origin && git rebase origin/main`.

## 2. Commits

Conventional Commits, imperative, English, ≤ 72 chars subject:

```
feat(studio): add memory bank upload grid (S3)
fix(house): fall back to still photo when clip fails (H6)
feat(contracts): add okAlone to MemorySheet
chore: add biome config
docs: update STATUS handoff
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`. Scope = zone. Put the feature ID at the end when there is one.

## 3. Pull requests

- Open a PR for every branch (use the template). Title = main commit subject.
- **CI must be green** (typecheck, Biome, Vitest, build in mock mode).
- Run the `reviewer` agent (Claude Code) or `pnpm verify` + self-review (Codex) before opening.
- **Self-merge allowed** (squash) when CI is green, **except**:
  - changes to `lib/contracts/`, `lib/db/` → Timoté reviews (CODEOWNERS requests him);
  - changes to shared config (`package.json` deps, `proxy.ts`, `biome.json`, `tsconfig.json`, `next.config.ts`, `.github/`, `.claude/`, `AGENTS.md`, `CLAUDE.md`) → any one teammate reviews;
  - changes to `components/ui/` or `app/globals.css` by someone other than Raphaël → Raphaël reviews.
- Description lists: feature ID, what changed, how to test, files touched **outside your zone** (if any), screenshots for UI, contract changes.
- After merge: delete the branch, update `docs/STATUS.md` on your next PR.

## 4. Ownership (who edits what)

| Owner | Paths |
|---|---|
| Timoté | `lib/ai/`, `lib/jobs/`, `lib/contracts/`, `lib/db/`, `lib/storage/`, `lib/session.ts`, `app/api/jobs/`, `app/api/memories/[id]/generate/`, `app/api/scenes/[id]/retry/`, `app/api/files/`, `app/api/auth/`, `instrumentation.ts`, `proxy.ts`, `mocks/`, `.github/`, `.claude/`, root configs |
| Alexandre | `app/studio/`, `components/studio/`, `app/api/houses/`, `app/api/rooms/`, `app/api/stories/`, `app/api/memories/` (except generate), `app/api/assets/`, `app/api/scenes/[id]/choice/` |
| Yasir | `app/house/`, `components/house/`, `lib/house/`, `app/api/h/`, `e2e/`, `scripts/demo-check.ts` |
| Raphaël | `app/globals.css`, `app/fonts.ts`, `components/ui/`, `public/brand/`, `public/rooms/`, `public/objects/`, `public/samples/`, `docs/DESIGN.md`, `scripts/seed-demo.ts`, `scripts/export-demo.ts` |
| Shared (small PRs, say it in the description) | `lib/copy.ts`, `package.json`, `README.md`, `docs/STATUS.md` (everyone appends) |

Need a change in someone else's zone? Write it under "Requests" in `docs/STATUS.md`, or make the minimal change and list it in the PR.

## 5. Contract changes (the main source of conflicts)

1. Open a `feat/contracts-*` PR that changes only `lib/contracts/` (+ mocks/fixtures).
2. Prefer **additive** changes (new optional fields). Renames/removals: announce in `docs/STATUS.md` → "Contract changes" before merging.
3. Timoté merges; consumers rebase.

## 6. Conflicts

- Rebase, don't merge `main` into your branch.
- `docs/STATUS.md`: always append, never rewrite others' lines → conflicts resolve by keeping both.
- `package.json` / `pnpm-lock.yaml`: take `main`'s version, then re-run `pnpm add <your-dep>` and commit the lockfile.
- `lib/copy.ts`: keep both sides; keys are namespaced (`studio.*`, `house.*`).
- In doubt, ask the file's owner in `docs/STATUS.md` → Requests, and work on something else meanwhile.

## 7. Never

- `git push --force` on shared branches, push to `main`, commit `.env*`, `storage/`, `demo-assets/`, real photos/voices/songs, or generated media.
- Merge with red CI.
- Large reformat-only commits touching other zones.

## 8. Freeze rules

- After **Sunday 09:00**: only `fix/*` and `docs/*` branches.
- After **Sunday 10:30**: only demo-breaking fixes, reviewed by a second person.
- Devpost points to `main` at the commit tagged `submission` (Timoté tags it at 11:30: `git tag submission && git push origin submission`).
