# STATUS archive — memorAI

Older handoff entries moved out of `docs/STATUS.md` to keep agent context small. Newest first.

### 2026-11-14 19:04 — Alexandre (studio)
- Done: Merged #13 and #12 as requested; #11 was already merged with the contrast fix. #12 is merged at 5177df5 after resolving copy/status conflicts and preserving a concurrent remote handoff resolution. GitHub reports no open PRs. CI is green on the final PR head; mock verify passes with 143 tests, production build passes, and all 5 browser tests pass, including axe.
- In progress: None for the PR-merging request; completed.
- Blocked: No merge blocker remains. Figma access is still unverified for the earlier S1 design-reading request.
- Contract changes: None by the integration. Shared `lib/copy.ts` and handoffs preserved; Studio sign-in adapted to the merged UI primitives and typography tokens. No force-push or direct push to main.
- Next: `node scripts/tasks.mjs check S1 --no-fetch` now passes against main. Resume the requested Figma-to-component mapping before S1 implementation; B1 remains the separately registered login-throttling follow-up.

### 2026-11-14 19:03 — Alexandre (studio)
- Done: Reconciled the concurrent push on #12: remote 06fdc5c includes the same main integration and application code already validated locally (143 unit tests, production build and 5 browser tests). Its only difference from the local resolution is the chronological order of handoff entries; retained the remote version.
- In progress: Final GitHub verification and merge of #12 at the latest remote head, per the user's explicit request.
- Blocked: No remaining code or merge conflict. Required checks need to report on the new resolved head.
- Contract changes: None; this finalization changes only this shared handoff.
- Next: Merge #12 once required checks report success, then confirm the open PR list is empty. No force-push or direct push to main.

### 2026-11-14 18:58 — Alexandre (studio)
- Done: F6 integration validated after resolving `lib/copy.ts` and `docs/STATUS.md` conflicts with main. Mock `pnpm verify` passes (143 tests), production build passes, and all 5 Playwright tests pass including the shared UI axe check. B3/B4 regressions pass; sign-in uses F5 primitives and readable type tokens.
- In progress: Push the tested merge commit to the existing PR #12 branch, approve and merge at that exact commit. #13 has been merged; #11 was already merged.
- Blocked: None locally; awaiting the final GitHub checks and merge result.
- Contract changes: None. Shared files touched for integration: `lib/copy.ts` and `docs/STATUS.md`; application adjustments are within `app/studio/login/`. Existing main changes were preserved without force-push.
- Next: Confirm #12 merged and the open PR list is empty. S1 can be rechecked once F6 is on main; B1 remains a separate tracked follow-up.

### 2026-11-14 18:55 — Alexandre (studio)
- Done: User requested accepting all remaining PRs and resolving conflicts. #11 was already merged with its B2 contrast fix; merged #13 (task registry). Integrated main into #12, preserving both `copy.ui` and `copy.auth`/`copy.studio`, and all design/pipeline handoff entries. Studio sign-in now uses the merged Button/Input/Label primitives and current type tokens.
- In progress: Verify/build/browser checks of the combined F5 + F6 tree, then approve and merge #12 (F6, B3, B4). Reviewed the author's fixes: shared API errors, 422 validation responses, minimum signing-secret length enforced during both issuance and verification, and proxy regression coverage.
- Blocked: None after conflict resolution; integration validation pending.
- Contract changes: None. Outside Studio: conflict resolution in shared `lib/copy.ts` and this handoff; upstream main changes retained, including AGENTS.md. No pipeline behavior or shared component source changed by this integration; no `.env*` file read.
- Next: Complete checks, push the merge commit to the existing #12 branch without force-push, approve the tested commit and merge it. Confirm no PR remains open and recheck S1 readiness.

### 2026-11-14 18:42 — Alexandre (studio)
- CI follow-up: #13 at da5a67c has a successful verify/build run (43628141766). Its replacement Tasks run (43628143748) is pending after the prior task-board job was cancelled during the PR update; the PR remains open for review. The three requested PR reviews are complete.
- Done: Follow-up review of F6 ba1cbcd (updated during the review). Contract-error reproduction now passes after ac1ae03; mock verify passes with 93 tests and all 3 Playwright tests pass again. The short-secret cookie still passes the proxy, reproduced directly with synthetic credentials. Posted a follow-up review acknowledging the corrected part; changes requested remains appropriate for B4.
- In progress: #13, documentation-only task registration (B1 preserved, B2–B4 registered); B3's note updated to reflect the correction already present in F6. No bug is marked merged by this registration PR.
- Blocked: #11 needs B2 (contrast); #12 needs B4 (minimum secret length at verification), plus the noted API-playbook alignment. Both remain unmerged. #10 is merged at 17082e2. S1 therefore still waits for F6.
- Contract changes: None by this review; the updated F6 reuses merged F2. No `.env*` read and no `env:check` execution.
- Next: Owners address the remaining review findings, then rerun CI and request review. Keep #13 open for task-registry review. The Studio working tree retains only the requested handoff changes in this file.

### 2026-11-14 18:38 — Alexandre (studio)
- Done: Reviewed PRs #10 (F2, 3e3d77e), #11 (F5, 3aeb65e), #12 (F6, 8a17b59) in isolated worktrees; task checks pass. Approved and squash-merged #10 at 17082e2. Submitted changes-requested reviews with inline findings on #11/#12. Local mock `pnpm verify` passes on all three (45/39/53 tests); Playwright passes on F5 (2) and F6 (3) with synthetic credentials. Chromium confirms F5 primary-button colours and type size. No `.env*` file opened.
- In progress: Documentation-only task-registration PR from `chore/tasks-review-findings`: B2 (primary text contrast), B3 (login API contract), B4 (minimum signing-secret length); B1 copied unchanged from #12 via `tasks.mjs add` to preserve its allocated ID. The PR contains only `docs/tasks.json`; this handoff stays on the existing Studio branch.
- Blocked: #11 and #12 are not compliant yet and remain unmerged; S1 still waits for F6 and verified Figma access. Existing green checks do not cover the reproduced contrast, error-envelope and short-secret cases.
- Contract changes: None made by this review. F2 contracts are now merged; F6 must reuse them. No application source edited, no push to main, no force-push, no fallback removed.
- Next: Raphaël fixes B2 in #11; Timoté fixes B3/B4 and rebases #12 onto merged F2. Rerun checks and review those commits before approval. The task-registration PR is a handoff, not completion of B1–B4. Recheck S1 only after F6 merges.

### 2026-11-14 18:30 — Raphaël (design)
- Done: F5. Tokens in `app/globals.css` (TECHNICAL.md §3.2 + shadcn mapping), fonts in `app/fonts.ts`, 14 components in `components/ui/` (Button, Switch, Badge, Card, Input/Textarea/Label, Checkbox, Tabs, ToggleGroup, Polaroid, IconButton 64/76/92/124, HeartButton, AvatarGroup, Stepper, SegmentedProgress). Gallery at `/dev/ui` (dev only, 404 in prod). Evidence `docs/design-evidence/f5-dev-ui.png`, deviations in `docs/DESIGN.md` §4.3.
- In progress: PR "feat(design): tokens, fonts and base components (F5)".
- Blocked: nothing. Figma MCP needs re-auth (`/mcp`) for new captures.
- Contract changes: none. New tokens: `switch-on #3F8A55`, `avatar-ring`, `shadow-house-control`, `shadow-knob`, `spacing-page`.
- Next: Test 4 (Rodin vs Trellis). Everyone: Tailwind's default palette, `text-sm/lg…` and `shadow-sm…` are gone; use our tokens (`text-16`, `text-ink/70`, `shadow-card`, `rounded-card`). Import components from `@/components/ui/*`; `cn` is in `@/lib/utils`. House screens: IconButton 76+ and HeartButton only (Switch/Checkbox/Button sm are Studio-only).

### 2026-11-14 18:26 — Timoté (pipeline)
- Done: F6 Studio auth on `feat/pipeline-F6-studio-auth`: `POST /api/auth/login` (signed `mh_session`, 7 days, Secure only on https), `POST /api/auth/logout`, `proxy.ts` guard (pages → `/studio/login?next=`, APIs → 401 envelope, `/api/h` + `/api/files` + login/logout open, `X-Robots-Tag: noindex` everywhere), minimal `/studio/login`, `pnpm env:check`. 97 unit tests + 3 e2e, `pnpm build` green.
- In progress: PR #12 (F6, B3, B4), rebased on main after #10. Fixed Alexandre's review: sessions signed with a SESSION_SECRET under 32 chars are now rejected by `verifySessionToken` (so by the proxy) and refused by `createSessionToken`; invalid login body returns 422; every error parses with `ApiErrorResponse`; API messages live in `copy.auth.*`.
- Blocked: #12 needs Alexandre's re-review. B1 moved to #13 (it registers B1–B4), so #12 no longer touches `docs/tasks.json`.
- Contract changes: none.
- Next: F4 (DB + storage), then P1. Known gaps: login has no throttle (registered as B1); logout does not revoke a copied cookie (stateless HMAC token, fine for the hackathon).
- Notes for everyone: run **`pnpm env:check`** after pulling: it validates `.env.local` (names only, never values). You need `STUDIO_PASSWORD` and a `SESSION_SECRET` of **32+ characters**, otherwise sign-in returns 500 "not configured". Studio routes call `/api/**` with the cookie automatically; `/api/files` stays open in the proxy, so its F4 handler must check session-or-House-token itself. `biome.json` now ignores `public/**/*.svg` (the exported SVGs broke `pnpm lint` on main). Raphaël/Alexandre: `/studio/login` is unstyled until F5; restyle freely, keep the label "Password" and the `role="alert"` (e2e uses them).

### 2026-11-14 18:25 — Timoté (pipeline)
- Done: F2 contracts v1 on `feat/pipeline-F2-contracts`: `lib/contracts/` (entities, memory-sheet, jobs, house-bundle, api, errors, index), `lib/http.ts` (`ok`/`fail`/`parseJson`), fixtures + 45 tests. Added `zod@4`. `biome.json` now skips `public/**/*.svg` (Figma exports failed the a11y lint, so `main` CI was red).
- In progress: PR "feat(contracts): contracts v1 (F2)".
- Blocked: nothing.
- Contract changes: Contracts v1 published, see "Contract changes" above.
- Next: F3 mock layer, then F4 DB + storage. Alexandre can start S1, Yasir H1 (with F4). Raphaël: your `(ID-wip)` Request is resolved by #9.

### 2026-11-14 17:55 — Raphaël (design)
- Done: SH7, 8 missing frames on Figma v5 row 4 (Questions + free text, Record a voice, Story end, loading/error/clip fallback, Order memories, Room from a photo, Sent confirmation, Studio phone). Mapped in `docs/DESIGN.md` §2, captures in `docs/design-evidence/sh7-*`.
- In progress: Q4 evidence (branch `feat/design-Q4-figma-specs`, also holds the exported SVGs).
- Blocked: F5 waits for F1. No Node/pnpm on my machine yet.
- Contract changes: none.
- Next: F5 when F1 merges. Alexandre: S4/SH5/S8 can build from frames 57-624, 58-638, 61-734, 61-982. Yasir: Story end 58-812 and clip fallback in 60-709.
### 2026-11-14 17:48 — Timoté (pipeline)
- Done: F1 scaffold on `feat/pipeline-F1-scaffold`. Next.js 16.4.6 (App Router, TS strict, Tailwind v4, alias `@/*`), Biome, Vitest, Playwright, husky pre-commit secret scan, every script from `AGENTS.md` §5. `pnpm verify`, `pnpm build` and `pnpm test:e2e` pass locally.
- In progress: PR "feat(pipeline): scaffold Next.js app (F1)".
- Blocked: nothing.
- Contract changes: none.
- Next: F2 contracts v1.
- Notes for everyone: run `pnpm install` once after pulling (it installs the pre-commit hook). `pnpm typecheck` runs `next typegen` first because Next 16 generates the `LayoutProps`/`PageProps` types. Biome skips Markdown and `scripts/tasks.mjs`. `pnpm demo`, `demo:check`, `seed:demo` and `export:demo` are stubs that print a TODO and exit 0. `lib/copy.ts` exists with an `app.*` namespace: add `studio.*` / `house.*` next to it. Read `AGENTS.md` §12 before writing Next.js code: this version differs from older ones, the guides are in `node_modules/next/dist/docs/`. For `pnpm test:e2e`, run `pnpm exec playwright install chromium` once.
### 2026-11-14 17:45 — Raphaël (design)
- Done: exported logo, 3 room backgrounds, 9 Objects from Figma v5 as SVG via the MCP server → `public/brand`, `public/rooms`, `public/objects` (cleaned of exporter frame rects). Component specs for F5 read via MCP and logged in `docs/DESIGN.md` §4.1; first 3 Figma captures in `docs/design-evidence/`.
- In progress: Q4 (evidence log, ongoing).
- Blocked: F5 waits for F1 (scaffold). Local machine has no Node/pnpm yet.
- Contract changes: none. Token additions planned in F5: `--shadow-house-control`, `--color-avatar-ring` (`#FFF8EE`).
- Next: F5 as soon as F1 merges; test 4 (Rodin vs Trellis) by hand in the fal playground.

### 2026-11-14 17:37 — Alexandre (studio)
- Done: Completed AGENTS.md §11.1 orientation and read the Studio zone, TECHNICAL.md §§3.5/4, FEATURES.md S1–S9, DESIGN.md and both requested playbooks. Clean main was already up to date; created `feat/studio-S1-create-house` for this documentation-only handoff. Node 24.21.0 / pnpm 12.4.1; no `.env*` file opened; `.env.local` absent, shell AI_MODE unset, no listener on port 3000.
- In progress: Step 1 access verification for Figma v5 “Family · Create the House” (22-546). Figma plugin discovery reports not installed; setup offered. No Figma MCP tool is available, so design context/screenshot and the element-by-element mapping remain unverified. Documentation maps the canvas to `bg-background`, headings/body to `font-display`/`font-body` and `text-ink`, name to Input, room choices to Cards with `public/rooms/{garden,kitchen,living}.svg`, consent to Checkbox, and the primary action to Button; these are planned mappings, not observations of the frame.
- Blocked: `node scripts/tasks.mjs check S1` exits 1 for F2 and F6; F5 is only a soft warning. `node scripts/tasks.mjs next alexandre` reports nothing ready. Application scaffold, `lib/contracts/`, `components/ui/` and `package.json` are absent, so implementation and `pnpm verify` have not started. No push or PR; only this local handoff changed.
- Contract changes: None. Reuse merged Zod API/entity schemas; any required contract change needs Timoté review. No application code, task dependencies or design evidence changed.
- Next: Enable Figma access, read node 22-546 design context + screenshot, and finish the verified mapping. After F2/F6 merge, update from main and rerun `check S1`; show the concrete implementation plan, then build `/studio/house/new`, `POST /api/houses` and style-only `POST /api/houses/:id/rooms` with required consent. Validate in mock mode, capture 1194 × 834 evidence, run `pnpm verify` before any push, and open `feat(studio): create the House (S1)` with all shared/out-of-zone files listed.

