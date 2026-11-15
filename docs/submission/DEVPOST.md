# Devpost fields — memorAI

Paste each section into the matching Devpost field. Word count (without Built with): 598 of 600.

## Inspiration

When a parent lives with Alzheimer's, the family wants to share moments with them, but their memories sit in old, damaged, black-and-white photos. Reminiscence and familiar music are widely used in dementia care, yet making something from those photos takes skills and time families don't have. Generic AI video tools also invent things easily, and an invented memory is the last thing a family wants to show someone whose memory is fragile.

## What it does

memorAI has two sides in one app.

In the **Studio**, a family member creates a private House for their relative, photographs a meaningful object (it becomes a 3D Object in a familiar Room), uploads old photos, the person's real song and a recorded voice message, and answers a few plain questions. memorAI restores, optionally colourises and gently animates each photo, and adds ambient sound. The family approves every scene, or keeps the original photo, before anything is sent.

In the **House**, the person living with Alzheimer's opens one link on a tablet: choose a room, tap an Object, polaroids fly out, a Memory plays full screen with the song and the family's voice, and a large Heart sends love back to the family. No login, no menus, nothing to read.

## How we built it

One Next.js 16 app with TypeScript, Zod contracts, MongoDB Atlas and local file storage. Generation runs as jobs on the server: Claude (`claude-haiku-5-5`) compiles the family's answers into a motion prompt, a negative prompt and an ambience prompt, under strict rules: only subtle motion of what is already in the photo. Then fal.ai runs Topaz restore (`topaz/restore/image`), Bria colourise (`bria/fibo-edit/colorize`), Kling 2.5 Turbo Pro image-to-video (`fal-ai/kling-video/v2.5-turbo/pro/image-to-video`) and MMAudio (`fal-ai/mmaudio-v2`). Objects go through BiRefNet cutout (`fal-ai/birefnet/v2`) and Hyper3D Rodin (`fal-ai/hyper3d/rodin/v2.5/fast`); Rooms can come from a photo or a description via Nano Banana 2 (`fal-ai/nano-banana-2/edit`, `fal-ai/nano-banana-2`). The House renders Rooms with react-three-fiber. The whole UI was designed in Figma and built from it through the Figma MCP server. A mock mode with the same interface let four people build in parallel without spending credits.

## Challenges we ran into

- Keeping AI faithful: Claude moves any request to add something absent (for example a person) into a "refused" list that the Studio shows gently.
- A House that can never look broken: every file is preloaded, and a failed clip falls back to the still photo with its sound.
- Slow models: one live scene took 157 s, so generation runs as resumable jobs with retries, a lease and a budget guard.
- Our first live end-to-end run stuck mid-chain: a job's 10 s lease expired while a clip was still downloading. Raising it to 120 s fixed it.

## Accomplishments that we're proud of

- A full Studio → fal → House run worked live in the browser: photo Object to 3D, one scene restored, animated and given ambience, approved, placed, sent and played.
- One live scene measured 157 s and about $0.48 (on a small test photo).
- The House demo runs fully offline from an exported bundle.

## What we learned

- Fidelity rules belong in one place, the prompt compiler, not scattered across prompts.
- Mocks with the same interface as the live API keep a four-person team moving.
- A design rule like "no text, single tap, targets ≥ 64 px" simplifies the code as much as the screen.

## What's next

- Test with families and with people living with Alzheimer's and their carers. [TODO: confirm]
- An automatic check comparing the original photo and the animated clip to flag a changed face before approval.
- A voice conversation that fills the Memory sheet instead of a form.
- Public hosting with cloud storage instead of a single laptop.

## Built with

nextjs, react, typescript, tailwindcss, three.js, react-three-fiber, zod, mongodb-atlas, fal.ai, anthropic-claude, topaz, bria, kling, mmaudio, hyper3d-rodin, birefnet, nano-banana, howler.js, tanstack-query, biome, vitest, playwright, figma
