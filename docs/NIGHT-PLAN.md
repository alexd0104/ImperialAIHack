# NIGHT-PLAN.md — night of 14→15 Nov (read only your section)

Your Claude reads this with `node scripts/doc.mjs docs/NIGHT-PLAN.md <Name>` and does every **Claude does** step. Steps marked **You do** are the only ones a person must do (secrets, Figma, listening, live credits). Feature freeze: Sunday 09:00.

## What is automatic and what is not

**Automatic (the autopilot, all night, on your laptop):** picks your next task in order, waits for dependencies (e.g. F7) without blocking, codes in mock mode, tests, `pnpm verify`, rebases, pushes green commits to `main`, writes a handoff at the top of `docs/status/<you>.md`, moves to the next task. Stops at $20, after 2 agent errors, or when your list is finished.

**Only humans:** typing the API key and copying `.env.local` (agents are blocked from `.env*`) · keeping the laptop on (plugged in, lid open) · Figma design decisions · adding the 3 object photos · everything that spends live fal credits or needs ears/eyes (listed per person under "Morning").

## Everyone — start (5 min)

**You do**, in a terminal in your repo folder:
```bash
git pull
git worktree add -b autopilot-$USER ../mh-autopilot origin/main
cp .env.local ../mh-autopilot/
export ANTHROPIC_API_KEY=sk-ant-...      # typed here only, never in a file or in chat
claude
```
Then paste: `Do my part of tonight's plan: node scripts/doc.mjs docs/NIGHT-PLAN.md <Name>` (Name = Timoté, Yasir, Alexandre or Raphaël). Approve the commands it asks for.

**Claude does** "Start the autopilot" (same for everyone, `<name>` in lowercase):
1. `cd ../mh-autopilot && pnpm install`
2. `pnpm autopilot <name> --check` → must print ✅. If ❌: stop and tell the human to `export ANTHROPIC_API_KEY=...` in this terminal and restart `claude`.
3. `cd ../mh-autopilot && nohup pnpm autopilot <name> <options> > autopilot.out 2>&1 &` (options in your section).
4. Wait 2 min, show the last 15 lines of `../mh-autopilot/autopilot.out`, say which task started (or that it is waiting for a dependency, which is normal).
5. Never edit code in `../mh-autopilot` yourself.

**Check during the night (optional):** `tail -20 ../mh-autopilot/autopilot.out`. **If it stopped** (laptop slept, error): Claude runs step 3 again with `--keep-skips`.

## Timoté

Tasks: F7 (by hand, now) → autopilot P7 movement · P8 sound prompts · P10 sound in parallel.

1. **Claude does F7 now, interactively:** `/start F7`; brief `node scripts/doc.mjs docs/FEATURES-V2.md F7`; every shape of the "Contracts v2" table as Zod schemas + DB mapping + fixtures + tests + env vars (`.env.example`, `check-env`); no route handlers; additive. `pnpm verify`, commit `feat(contracts): contracts v2 (F7)`, push, 5-line "Contract changes" note in `docs/STATUS.md`. This unblocks 7 tasks of the team: do it first, fast.
2. **Claude does** "Start the autopilot" after `cd ../mh-autopilot && git pull --rebase origin main`, options `--total-usd 20`.
3. **You do:** tell the team in the chat "F7 is pushed".
4. **Morning (you do, with Claude):** live beach test of the new sound prompts (P8, `AI_MODE=live` on one photo, ≈ $0.50) and note the result in STATUS; listen in the House.

## Yasir

Tasks (autopilot): H9 sound in review · H11 House live refresh (after F7) · Q5 prompt experiment (after F7 + P7).

1. **Claude does** "Start the autopilot", options `--total-usd 20`. H9 starts now; H11/Q5 start by themselves when F7/P7 land.
2. **Morning (you do, with Claude):** listen to a review clip and "Play full memory" (H9); move an object in the Studio and watch the House update within 30 s (H11); run the live experiment `AI_MODE=live pnpm lab:experiment --photos <dir>` with 5 test photos (≈ $10), look at results on fal, score 1–5, have Claude fill `docs/LAB-REPORT.md`.

## Alexandre

Tasks (autopilot): S10 back navigation · S11 room management (after F7) · S12 free placement editor (after F7) · S13 Studio logout button (keeps the existing studio password).

1. **Claude does** "Start the autopilot", options `--total-usd 20`. S10 starts now; the rest after F7.
2. **Morning (you do, with Claude):** click through: new Story back/forth, create/rename/change background/delete a room, drag and resize objects, log out and back in. Each problem → `node scripts/tasks.mjs add --title "..." --owner alexandre` (the next autopilot run fixes B-tasks).

## Raphaël

Tonight (autopilot): H10 loading animations in `components/ui` (now) · P9 ambience sound library (after F7) · S14 3D objects (when the team's photos land). **Figma and the UI redesign (SH8) are tomorrow morning**, interactive.

1. **Claude does** "Start the autopilot", options `--only H10,P9,S14 --wait-hours 10 --total-usd 20` (`--only` keeps SH8 for tomorrow).
2. **Morning (you do, with Claude), from 08:00:** `AI_MODE=live pnpm objects:make` (S14, ≈ $1.50) and `AI_MODE=live pnpm beds:make` (P9, ≈ $0.05), commit the GLBs, thumbs and 6 sounds, check them in the House. Then **SH8, interactive:** `/start SH8`; brief `node scripts/doc.mjs docs/FEATURES-V2.md SH8`; Figma is the source; restyle with `app/globals.css` and `components/ui` only (no logic/props changes), including every screen added overnight; small commits `(SH8-wip)`, last one `(SH8)`; `pnpm verify`; push; update Figma-vs-code evidence in `docs/DESIGN.md`.

## Team — the 3 object images

Anyone: put 3 photos of objects (one object each, plain background, your own photos) in `public/objects/src/` as `name.jpg`, commit `chore: default object images`, push. Raphaël's autopilot then builds S14 automatically.

## Everyone — morning (paste into Claude)

`Morning check: git pull, show ../mh-autopilot/.autopilot/summary-<name>.md and the top of docs/status/<name>.md, list my Human TODOs and Requests for me, then help me do them one by one.`

Sunday: 08:00–09:00 Human TODOs and fixes · **09:00 feature freeze** (no new features; UI restyle SH8 and bug fixes only) · **11:00 code freeze** · 11:00–12:00 demo rehearsal (`pnpm demo:check`) and Devpost (closes 12:00).
