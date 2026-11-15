# Playbook: add or change an API route

Shared by Claude Code (skill `add-api-route`) and Codex. Follow in order.

1. **Find the route** in `TECHNICAL.md` §4.3. If it is not there and you need a new one, add a row in your PR.
2. **Contract first** in `lib/contracts/api.ts` (or the entity file):
   ```ts
   export const CreateMemoryInput = z.object({ title: z.string().min(1).max(80) });
   export const CreateMemoryOutput = Memory; // reuse entity schemas
   ```
   - Changing an existing shape? Separate `feat/contracts-*` PR, additive if possible, announce in `docs/STATUS.md`. Timoté reviews.
3. **Route handler** in `app/api/<path>/route.ts`:
   ```ts
   import "server-only";
   import { NextRequest } from "next/server";
   import { CreateMemoryInput } from "@/lib/contracts/api";
   import { ok, fail, parseJson } from "@/lib/http"; // helpers: ok(data), fail(code, message, status, retryable)

   export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
     const { id } = await params;              // Next 16: params is a Promise
     const input = await parseJson(req, CreateMemoryInput);
     if (!input.success) return fail("validation_failed", input.error, 422);
     // ... db work through lib/db helpers only
     return ok(memory, 201);
   }
   ```
   - Return `{ data }` or `{ error: { code, message, retryable } }` only. Codes: `TECHNICAL.md` §4.4.
   - Auth is handled by `proxy.ts` for Studio routes; House routes check the token themselves.
   - Never call fal/Claude here directly: create jobs via `lib/jobs`, or call `lib/ai/*`.
4. **Client usage**: a typed fetcher in your zone (`components/studio/api.ts` or `lib/house/api.ts`) that parses the response with the same output schema; TanStack Query hooks around it.
5. **Mock**: if the route depends on AI results, make sure `AI_MODE=mock` produces realistic data (fixtures in `mocks/`).
6. **Test**: Vitest test for the handler logic (valid input → 2xx shape, invalid → 422). Put pure logic in a function you can test without HTTP.
7. **Verify**: `pnpm verify`, then PR with feature ID and "how to test" (curl example).
