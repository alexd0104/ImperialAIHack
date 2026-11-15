# Devpost fields — memorAI

Paste each section into the matching Devpost field. Word count (without Built with): 538 of 600.

Track: **Voice, Vision & Generative Media** (bounty: **Best use of fal**). Extra prize: **Figma Best-Designed AI Product**.

## Inspiration

When a parent lives with Alzheimer's, the family wants to share moments with them, but their memories sit in damaged, black-and-white photos. Making something from them takes skills and time families don't have, and generic AI video tools invent things easily. An invented memory is the last thing a family wants to show someone whose memory is fragile.

## What it does

In the **Studio**, a family member creates a private House, photographs a meaningful object (it becomes a 3D Object in a familiar Room), uploads photos, the person's real song and a recorded voice message, and answers a few plain questions. memorAI restores, optionally colourises and gently animates each photo and adds ambient sound. The family approves every scene, or keeps the original photo, before anything is sent.

In the **House**, the person living with Alzheimer's opens one link on a tablet: choose a room, tap an Object, polaroids fly out, a Memory plays with the song and the family's voice, and a large Heart sends love back. No login, no menus, nothing to read.

## How we built it

- **fal is the generation engine:** 11 endpoints for 9 tasks, all server-side through `@fal-ai/client`. Per photo: Topaz restore → Bria colourise → Kling 2.5 Turbo Pro image-to-video → MMAudio ambience from the clip. Per Object: BiRefNet cutout → Hyper3D Rodin 3D model. Per Room: Nano Banana 2 from a photo or a description. Each photo is a resumable job (queue submit/status/result, retries, fallbacks, 2-request cap, cache, budget guard).
- **Figma, both ways through the Figma MCP server:** the 17-frame v5 page is the source of truth. We read exact specs into code, exported 13 SVG assets, built 8 missing frames from the file's own components, pushed our 35 code tokens back as Figma Variables, and logged 14 Figma-vs-code pairs.
- **Anthropic Claude** (`claude-haiku-5-5`) compiles family answers into motion, negative and ambience prompts as Zod-validated structured output, refusing anything not in the photo.
- **MongoDB Atlas** stores Houses, Stories, Memories, Hearts and the job queue.
- Next.js 16, react-three-fiber for the House, and a mock mode with the live interface.

We did not use ElevenLabs or Anam on purpose: real voices only, no cloning, no avatar.

## Challenges we ran into

- Keeping AI faithful: requests to add something absent go to a "refused" list the family sees.
- A House that never looks broken: everything preloads, and a failed clip falls back to the still photo.
- Slow models: one live scene took 157 s, so generation runs as jobs. Our first live run stuck because a 10 s job lease expired mid-download; 120 s fixed it.

## Accomplishments that we're proud of

- A full Studio → fal → House run worked live: photo to 3D Object, a scene restored, animated and given ambience, approved, sent and played.
- One live scene: 157 s, about $0.48 (small test photo).
- The House demo runs fully offline.

## What we learned

- Fidelity rules belong in one place, the prompt compiler.
- Mocks with the live interface keep four people moving.
- "No text, single tap, targets ≥ 64 px" simplifies the code as much as the screen.

## What's next

- Test with families and carers.
- An automatic check that flags a changed face before approval.
- A voice conversation that fills the Memory sheet.
- Public hosting with cloud storage.

## Built with

fal, figma, figma-mcp, anthropic-claude, mongodb-atlas, nextjs, react, typescript, tailwindcss, three.js, react-three-fiber, zod, topaz, bria, kling, mmaudio, hyper3d-rodin, birefnet, nano-banana, howler.js, tanstack-query, biome, vitest, playwright
