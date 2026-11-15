# Demo video script — memorAI (2:00)

Track: Voice, Vision & Generative Media, going for **Best use of fal**. Extra prize: **Figma Best-Designed AI Product** (the rules say the demo must show how we qualify: that is 1:38–1:53). We do not enter Adaption (needs a fine-tuned model; we have none).

Recording notes:
- Studio on a laptop browser; House at 1194 × 834 (tablet size).
- The generation step takes about 2.5 min live, so show it sped up and say so on screen. Do not present mock output as live.
- Sponsor captions are lower-thirds on screen, so the voiceover stays short.
- Use only demo content the team has consent for. No real family names on screen beyond the demo House's first name.

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:10 | Damaged black-and-white family photo. Title "memorAI". | When someone you love lives with Alzheimer's, your shared memories often sit in faded photos. memorAI brings those real photos gently back to life. |
| 0:10–0:24 | Studio: create the House (first name, familiar Room, consent tick). Photograph a teapot; it becomes a 3D Object. Caption: **fal · BiRefNet cutout → Hyper3D Rodin 3D**. | The family starts in the Studio: a first name, a familiar room, and a photo of a meaningful object, which fal turns into a 3D Object. |
| 0:24–0:36 | Memory bank: photos, the person's song, record a voice message. Guided questions; Memory sheet appears. | They add photos, the person's real song and their own voice, then answer a few plain questions. |
| 0:36–0:54 | Press "Bring to life". As each step ticks, a caption names it: **Claude prompt compiler → fal Topaz restore → Bria colourise → Kling 2.5 image-to-video → MMAudio ambience**. Corner caption: "Sped up · about 2.5 min, about $0.50 per photo, live". | Claude turns their answers into strict prompts: only gentle motion of what is already in the photo. Then a chain of fal models restores, colourises, animates and adds the sound of the place. |
| 0:54–1:04 | Approve screen: original vs new version per scene; tap "Keep the original photo" on one; "Keep and continue"; place the Object; "Send". | Nothing is invented and nothing is sent without approval. One tap keeps the original photo. |
| 1:04–1:12 | Tablet: House "Choose a room" → tap the Room. Objects breathe gently in fixed places. | On the tablet, one link. No login, nothing to read. |
| 1:12–1:30 | Tap the Object → polaroids fly out → first Memory starts after 3 s, full screen, with song and voice. | They touch the object, its memories fly out like polaroids, and the first one plays with their song and the family's real voice. |
| 1:30–1:38 | Tap the large Heart → hearts rise → return to the Room. Cut to Studio "Hear back" showing the Heart. | One heart tells the family it was loved. |
| 1:38–1:53 | **Figma segment** (see below): v5 page → Figma vs code pair → Figma Variables panel → DESIGN.md evidence log. Caption: **Designed in Figma · built through the Figma MCP server**. | Every screen started in Figma. Through the Figma MCP server we read exact specs into code, and pushed our design tokens back into Figma as variables. |
| 1:53–2:00 | Logo, then captions: "fal · Figma · Claude · MongoDB Atlas". | Real photos, real voices, the family in control. No medical claim. |

Voiceover: about 190 words.

## Figma prize segment (1:38–1:53, 15 s)

Show, in order, about 3–4 s each:
1. Figma page "v5 · Full flow · memorAI" with its 17 frames (and the 8 frames we added).
2. One pair side by side, Figma vs code, from `docs/design-evidence/`: Choose a room `20-67-choose-room-figma.png` / `q4-house-choose-room-code.png`, or Approve `23-580-approve-scenes-figma.png` / `q4-studio-approve-code.png`.
3. The "memorAI tokens" Variables collection in Figma (35 variables pushed from `app/globals.css` with `use_figma`). Live from the Figma file, not from the repo.
4. `docs/DESIGN.md` §6 ("How we used the Figma MCP server") or the §7 evidence log.

Only use committed evidence files. The Object-open capture (20-219) has no committed code image.

## Open questions

- Who records the voiceover and who drives the screen? (`PLAN.md` says "to be decided".) [TODO: confirm]
- Is the Studio footage recorded in `AI_MODE=live` or from pre-generated content? The captions must match. [TODO: confirm]
- Which demo photos, song and voice are used, and is consent for each confirmed? [TODO: confirm]
- Final video link for the README and Devpost: [VIDEO_URL]
