# Lab report — which non-technical approach gives the best prompts? (Q5)

Status: **template**. The mock run (20 runs) works; the live run and scores are for a human.

## Approaches

| Key | Approach | Family effort |
|---|---|---|
| `questions` | (a) Current Studio questions (title, people, place, when, sound, message) | 6 fields |
| `free_text` | (b) One free text box, Claude extracts place / when / sound / message | 1 box |
| `photo_questions` | (c) 3 questions adapted to the photo by Claude vision | 3 answers |
| `agent` | (d) Short written conversation (≤ 4 turns) | ≤ 4 replies |

Photos: beach, fireplace, garden, wedding, kitchen (`lib/lab/photos.ts`, scripted answers so runs are reproducible).

## How to run

1. Mock (free): `pnpm lab:experiment` → 20 `lab_runs` (MongoDB if configured, else `storage/lab/runs.json`).
2. Live (≈ $10, human only): put `beach.jpg fireplace.jpg garden.jpg wedding.jpg kitchen.jpg` in a folder, then
   `AI_MODE=live pnpm lab:experiment --photos <dir>`.
3. Generate the Scenes from the stored prompts (fal), review the outputs, and fill the scores below (1–5).
   Scores are stored in `lab_runs.scores` (`fidelity`, `motion`, `sound`, `liked`).

## Scores (mean over 5 photos)

| Approach | Fidelity | Motion | Sound | Family would like it | Total |
|---|---|---|---|---|---|
| (a) questions | | | | | |
| (b) free text | | | | | |
| (c) photo questions | | | | | |
| (d) agent | | | | | |

## Verdict

_Winner:_ …  
_Why:_ … (fidelity first: no false memories outweighs everything else.)  
_Surprises / notes:_ …

## Rules check

- Every prompt went through `lib/ai/prompt-compiler.ts`.
- No approach added people, objects or events absent from the photo (list any that did).
