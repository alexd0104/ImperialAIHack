# Q&A prep — memorAI (6 minutes)

Twelve likely questions, with short answers based on what the repo shows. Keep each answer to about 20 seconds.

**1. How do you stop the AI from creating false memories?**
Every model prompt goes through one prompt compiler (`lib/ai/prompt-compiler.ts`): Claude may only describe subtle motion of what is already in the photo, and a fixed negative prompt blocks new people, objects, face changes and camera cuts. If the family's free text asks to add something that isn't there, it goes into a "refused" list, the Studio says so gently, and the request is ignored. Then the family approves every scene or keeps the original photo.

**2. What if the animation still changes a face?**
The family sees original and new version for every scene and can keep the original photo with one tap, or try again. Nothing reaches the House without that choice. An automatic face-change check is on our list but not built.

**3. Who consents, and how?**
The family member who creates the House must tick a consent checkbox, and the time is stored. The family decides what goes in, can keep people or topics out with the "Don't show" list, and can delete the House. Early-stage Alzheimer's makes the person's own consent realistic, but how we collect it from them is [TODO: confirm].

**4. Isn't it risky to show this to someone living with Alzheimer's?**
We make no medical claim. Reminiscence and familiar music are widely used in care, with small benefits in the research we read, and we only promise a shared moment. Watching together is the default; the family must mark a Memory "OK alone" before it shows when the person is on their own.

**5. ElevenLabs and Anam sponsor your track. Why didn't you use them?**
On purpose. Our rule is real voices only: a cloned family voice or an avatar would be an invented memory, so the family records its own message and generated audio is limited to ambience, never music or speech. An ElevenLabs agent that *asks* the guided questions out loud fits that rule; it was planned (`FEATURES.md` SH6) but we didn't build it. (Adaption: that prize needs a fine-tuned model; we have none, so we don't enter.)

**6. How much does one Memory cost, and how long does it take?**
One live scene measured 157 s and about $0.48: Claude 6 s, restore 30 s, colourise 18 s, animate 94 s, ambience 9 s (on a small test photo). Our estimate for a 3-photo Memory is about $1.50; a 3D Object is about $0.10 for Rodin. A full multi-photo Memory timing has not been measured: [TODO: confirm].

**7. What in the demo is live and what is mocked?**
The demo House runs from an exported bundle in offline demo mode so it can't fail on stage; that content was generated live earlier [TODO: confirm]. A full Studio → fal → House run worked live in the browser with one scene. Mock mode returns fixtures with the same interface and is what we use for tests and CI. Not tested live: a Memory with several photos, song and voice together.

**8. Why fal and Claude, and what makes this a strong use of fal?**
fal runs every generative step: 11 endpoints for 9 tasks (restore, colourise, image-to-video, two kinds of ambience, cutout, photo-to-3D, room edit, room from text) behind one client and one queue, which fits long jobs with retries, fallbacks, a cache and a budget guard. We compared models before choosing (Rodin beat Trellis 2 on 3 of 3 objects, at $0.10), and swapping a model is one line in `lib/ai/models.ts`. Claude (`claude-haiku-5-5`) is the guardrail in front of fal: it turns plain family answers into strict motion, negative and ambience prompts as Zod-validated JSON, with fixed templates if it fails.

**9. How did you use Figma, and how do you qualify for Best-Designed?**
The v5 Figma page (17 frames, tablet size) is the source of truth, and we worked both ways through the Figma MCP server: exact specs and 13 SVG assets came into code, and 8 new frames plus 35 code tokens (as Figma Variables) went back into the file. `docs/design-evidence/` has 14 Figma-vs-code pairs at the same size, and `docs/DESIGN.md` §7 lists every difference. Some Studio screens are still simpler than their frames, and we raised text contrast above Figma's to meet WCAG AA.

**10. Where does the data go? Privacy?**
Photos, voices and outputs are stored on our own disk, not in a public folder; fal inputs are uploaded with a 1-hour expiry preference because we keep our own copies. API keys stay on the server, the Studio is behind a password, and each House is reached by a private token link. Data retention by fal and Anthropic beyond that: [TODO: confirm].

**11. How does the House avoid looking broken?**
It preloads every file before showing anything, shows no error text or spinner after that, and a failed clip falls back to the still photo with its sound. A `demo:check` script checks the House plays with the network blocked.

**12. What would you build next?**
Test with families and carers [TODO: confirm], an automatic check that flags a changed face before approval, a voice conversation that fills the Memory sheet, and public hosting with cloud storage instead of one laptop.
