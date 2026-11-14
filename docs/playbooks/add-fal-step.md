# Playbook: add or swap a fal model in the generation chain

Shared by Claude Code (skill `add-fal-step`) and Codex. Owner zone: Pipeline (Timoté).

1. **Verify the model** on fal before coding: `https://fal.ai/models/<model-id>/api` (input schema, output field names, price) and try it once in the playground with a real photo. Prices or IDs from memory are not acceptable.
2. **Register it** in `lib/ai/models.ts`:
   ```ts
   export const MODELS = {
     animate: { id: "<verified-id>", priceUsd: { perSecond: 0.07 }, defaults: { duration: "5" } },
     // ...
   } as const;
   ```
   Model IDs never appear anywhere else in the code.
3. **Step handler** in `lib/jobs/steps/<step>.ts` implementing:
   ```ts
   export const step: StepHandler = {
     name: "animate",
     buildInput(ctx) { /* from MemorySheet + compiled prompts + previous output URL */ },
     submit(input) { return fal.queue.submit(MODELS.animate.id, { input, headers: lifecycleHeader }); },
     parseResult(result) { return { url: result.data.video.url, mime: "video/mp4", costUsd: ... }; },
   };
   ```
   - Inputs that are local files: `fal.storage.upload` first (lifecycle 1 h header).
   - Never use `fal.subscribe` inside a request handler; the engine polls with `queue.status` / `queue.result`.
   - On completion the engine downloads the output to `storage/<houseId>/<jobId>/<step>.<ext>`; never keep only the fal URL.
4. **Cache key** includes model id + sorted params (prompt included) + input file sha256 (done by the engine if you return params from `buildInput`).
5. **Cost**: return `costUsd` estimated from `priceUsd`; the budget guard depends on it.
6. **Mock**: add `mocks/fal/<model-id-with-slashes-replaced>.json` with the exact output shape, pointing at a CC0 file in `mocks/media/`.
7. **Prompts**: only from `lib/ai/prompt-compiler.ts`; keep the default negative prompt.
8. **Test**: unit test for `buildInput` and `parseResult` with the mock fixture.
9. **Docs**: update the table in `TECHNICAL.md` §7.1 (ID, params, price, fallback) in the same PR.
