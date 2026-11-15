# Demo video script — memorAI (2:00)

Track: Voice, Vision & Generative Media, going for **Best use of fal**. Extra prize: **Figma Best-Designed AI Product** (the rules say the demo must show how we qualify: that is 1:38–1:53). We do not enter Adaption (it needs a fine-tuned model; we have none).

## What the video shows

1. **Create, sped up:** in the Studio, a new Room, a new Object and a new Memory are made. Generation runs for real and is sped up in the edit.
2. **A House prepared earlier:** the full House flow with richer content.
3. **The House we just made:** the new Room and Object, and the new Memory playing.

## Recording notes

- Studio in a laptop browser; House at 1194 × 834 (tablet size).
- One photo takes about 2.5 min to generate. Speed it up and keep the caption "Sped up" on screen while it runs.
- Sponsor captions are lower-thirds on screen, so the voiceover stays short.
- Use only photos, songs and voices the team has consent to use. No real family names on screen apart from the demo House's first name.

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:08 | Damaged black-and-white family photo. Title "memorAI". | When someone you love lives with Alzheimer's, your shared memories often sit in faded photos. |
| 0:08–0:22 | Studio: "+" doorway → Add room (describe it or use a photo). New Story: photograph a teapot; it becomes a 3D Object. Caption: **fal · Nano Banana 2 room · BiRefNet cutout → Hyper3D Rodin 3D** · "Sped up". | memorAI brings them gently back to life. The family adds a familiar room and photographs a meaningful object, which fal turns into 3D. |
| 0:22–0:34 | Memory bank: photos, the person's song, record a voice message. Guided questions; Memory sheet appears. | They add photos, the person's real song and their own voice, then answer a few plain questions. |
| 0:34–0:50 | "Bring to life". As each step ticks, a caption names it: **Claude prompt compiler → fal Topaz restore → Bria colourise → Kling 2.5 image-to-video → MMAudio ambience**. Corner: "Sped up · about 2.5 min, about $0.50 per photo". | Claude turns their answers into strict prompts: only gentle motion of what is already in the photo. A chain of fal models restores, colourises, animates and adds the sound of the place. |
| 0:50–1:00 | Approve: original vs new version per scene; "Keep the original photo" on one; "Keep and continue"; place the Object; "Send". | Nothing is invented, and nothing is sent without the family's approval. |
| 1:00–1:22 | Tablet, **House prepared earlier**: Choose a room (a door swings open) → Room, Objects breathing in fixed places → tap an Object → polaroids fly out → first Memory plays full screen with song and voice. Caption: "Prepared earlier". | On the tablet, one link. No login, nothing to read. They touch an object, its memories fly out like polaroids, and one plays with their song and the family's real voice. |
| 1:22–1:28 | Tap the large Heart → hearts rise → back to the Room. | One heart tells the family it was loved. |
| 1:28–1:38 | **The House we just made**: the new Room with the new 3D teapot → tap it → the new Memory plays. Caption: "Made in this video". | And here is the memory we just made, already waiting in its room. |
| 1:38–1:53 | **Figma segment** (below): v5 page → Figma vs code pair → Figma Variables panel → DESIGN.md evidence log. Caption: **Designed in Figma · built through the Figma MCP server**. | Every screen started in Figma. Through the Figma MCP server we read exact specs into code, and pushed our design tokens back into Figma as variables. |
| 1:53–2:00 | Logo, then captions: "fal · Figma · Claude · MongoDB Atlas". | Real photos, real voices, the family in control. No medical claim. |

Voiceover: 187 words (fits 2:00 at a calm pace).

## Figma prize segment (1:38–1:53, 15 s)

Show, in order, about 3–4 s each:
1. Figma page "v5 · Full flow · memorAI" with its 17 frames (and the 8 frames we added).
2. One pair side by side, Figma vs code, from `docs/design-evidence/`: Choose a room `20-67-choose-room-figma.png` / `q4-house-choose-room-code.png`, or Approve `23-580-approve-scenes-figma.png` / `q4-studio-approve-code.png`.
3. The "memorAI tokens" Variables collection in the Figma file (35 variables pushed from `app/globals.css` with `use_figma`). Open it in Figma first to check it is still there.
4. `docs/DESIGN.md` §6 ("How we used the Figma MCP server") or the §7 evidence log.

Only use committed evidence files. The Object-open capture (20-219) has no committed code image.
