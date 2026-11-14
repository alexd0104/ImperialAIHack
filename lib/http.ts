import type { z } from "zod";
import { ERROR_RETRYABLE, ERROR_STATUS, type ErrorCode } from "./contracts";

// Route handler helpers. Every route returns `{ data }` or `{ error }`.
//
// Next 16: route params are a Promise.
//
//   export async function PATCH(
//     req: Request,
//     ctx: RouteContext<"/api/memories/[id]">,
//   ) {
//     const { id } = await ctx.params;
//     const body = await parseJson(req, UpdateMemoryRequest);
//     if (!body.success) return fail("validation_failed", body.message);
//     const memory = await updateMemory(id, body.data);
//     if (!memory) return fail("not_found", "Memory not found");
//     return ok(memory);
//   }

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function fail(
  code: ErrorCode,
  message: string,
  status: number = ERROR_STATUS[code],
  retryable: boolean = ERROR_RETRYABLE[code],
): Response {
  return Response.json({ error: { code, message, retryable } }, { status });
}

export type ParseResult<T> =
  | { success: true; data: T }
  | { success: false; message: string; issues: z.core.$ZodIssue[] };

/** Reads and validates a JSON body. Never throws: bad JSON is a failed parse. */
export async function parseJson<S extends z.ZodType>(
  req: Request,
  schema: S,
): Promise<ParseResult<z.infer<S>>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { success: false, message: "Body must be valid JSON", issues: [] };
  }
  const result = schema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  const message = result.error.issues
    .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
    .join("; ");
  return { success: false, message, issues: result.error.issues };
}
