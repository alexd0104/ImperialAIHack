# Demo video script — memorAI (2:00)

Recording notes:
- Studio on a laptop browser; House at 1194 × 834 (tablet size).
- The generation step takes about 2.5 min live, so show it sped up or cut, and say so in the voiceover. Do not present mock output as live.
- Use only demo content the team has consent for. No real family names on screen beyond the demo House's first name.

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:12 | Old black-and-white family photo, slightly damaged. Title "memorAI". | When someone you love lives with Alzheimer's, your shared memories often sit in old, faded photos. memorAI brings those real photos gently back to life. |
| 0:12–0:30 | Studio: create the House (first name, a familiar Room, consent tick). Photograph a teapot; it turns into a 3D Object. | The family starts in the Studio. They give a first name, pick a familiar room, and photograph a meaningful object. It becomes a 3D Object in that room. |
| 0:30–0:45 | Memory bank: drop in photos, the person's song, record a voice message. Answer the guided questions; Memory sheet appears. | They add photos, the person's real song and their own voice, then answer a few plain questions. No prompts to write. |
| 0:45–0:58 | Press "Bring to life". Steps tick through: restore, colour, gentle motion, ambience. Caption: "Sped up: about 2.5 min live". | Claude turns the answers into strict prompts: only subtle motion of what is already in the photo. fal restores, colourises, animates and adds ambient sound. |
| 0:58–1:10 | Approve screen: original vs new version for each scene; tap "Keep the original photo" on one; "Keep and continue"; place the Object; "Send". | Nothing is invented and nothing is sent without approval. If a scene looks wrong, one tap keeps the original photo. |
| 1:10–1:20 | Tablet: House "Choose a room" → tap the Room. Objects breathe gently in fixed places. | On the tablet, the person opens one link. No login, nothing to read. They choose a room. |
| 1:20–1:40 | Tap the Object → polaroids fly out → first Memory starts after 3 s, full screen, with song and voice. | They touch an object, its memories fly out like polaroids, and the first one plays, with their song and the family's voice. |
| 1:40–1:48 | Tap the large Heart → small hearts rise → gentle return to the Room. Cut to Studio "Hear back" showing a Heart. | One tap on the heart tells the family it was loved. |
| 1:48–2:00 | Figma prize: split screen of Figma v5 frame (e.g. `docs/design-evidence/20-67-choose-room-figma.png`) next to the built screen (`q4-house-choose-room-code.png`), then the `docs/DESIGN.md` evidence table scrolling. | Every screen started in Figma, and we built from it through the Figma MCP server. Real photos, real voices, the family in control, and no medical claim. |

Voiceover: about 205 words.

## Figma prize segment (1:48–2:00, 12 s)

Show, in order, about 3–4 s each:
1. Figma page "v5 · Full flow · memorAI" with the 17 frames.
2. One pair side by side, Figma vs code, from `docs/design-evidence/` (Choose a room `20-67-…-figma.png` / `q4-house-choose-room-code.png`, or Approve `23-580-…-figma.png` / `q4-studio-approve-code.png`).
3. `docs/DESIGN.md` §6 ("How we used the Figma MCP server") or §7 evidence log.

Only use committed evidence files. The Object-open capture (20-219) has no committed code image.

## Open questions

- **Adaption prize:** the repo has no mention of Adaption and no evidence that we qualify. Do we enter it? If yes, what do we show? [TODO: confirm]
- Who records the voiceover and who drives the screen? (`PLAN.md` says "to be decided".) [TODO: confirm]
- Is the Studio footage recorded in `AI_MODE=live` or from pre-generated content? The voiceover must match. [TODO: confirm]
- Which demo photos, song and voice are used, and is consent for each confirmed? [TODO: confirm]
- Final video link for the README and Devpost: [VIDEO_URL]
