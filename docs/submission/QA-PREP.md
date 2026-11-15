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

**5. Why not voice cloning or an AI narrator?**
Rule: real voices only. A cloned voice of a family member would be an invented memory in sound. The family records its own message, and generated audio is limited to ambience, never music or speech.

**6. How much does one Memory cost, and how long does it take?**
One live scene measured 157 s and about $0.48: Claude 6 s, restore 30 s, colourise 18 s, animate 94 s, ambience 9 s (on a small test photo). Our estimate for a 3-photo Memory is about $1.50; a 3D Object is about $0.10 for Rodin. A full multi-photo Memory timing has not been measured: [TODO: confirm].

**7. What in the demo is live and what is mocked?**
The demo House runs from an exported bundle in offline demo mode so it can't fail on stage; that content was generated live earlier [TODO: confirm]. A full Studio → fal → House run worked live in the browser with one scene. Mock mode returns fixtures with the same interface and is what we use for tests and CI. Not tested live: a Memory with several photos, song and voice together.

**8. Why fal?**
One API and one client for every step we needed: restore, colourise, image-to-video, audio, cutout, 3D and image editing, with a queue that fits long jobs. Model IDs sit in one file (`lib/ai/models.ts`), so swapping Kling for another video model is a one-line change.

**9. Why Claude?**
It turns plain family answers into the precise prompts video and audio models need, while enforcing our fidelity rules and returning structured JSON we validate with Zod. We use the small Haiku model by default and can switch to Sonnet by env variable. If Claude fails, fixed templates take over.

**10. Where does the data go? Privacy?**
Photos, voices and outputs are stored on our own disk, not in a public folder; fal inputs are uploaded with a 1-hour expiry preference because we keep our own copies. API keys stay on the server, the Studio is behind a password, and each House is reached by a private token link. Data retention by fal and Anthropic beyond that: [TODO: confirm].

**11. How does the House avoid looking broken?**
It preloads every file before showing anything, shows no error text or spinner after that, and a failed clip falls back to the still photo with its sound. A `demo:check` script checks the House plays with the network blocked.

**12. What would you build next?**
Test with families and carers [TODO: confirm], an automatic check that flags a changed face before approval, a voice conversation that fills the Memory sheet, and public hosting with cloud storage instead of one laptop.
