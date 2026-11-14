import type { z } from "zod";
import { apiResponse, type ErrorCode } from "@/lib/contracts";
import { copy } from "@/lib/copy";

export class StudioApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export async function postStudio<S extends z.ZodType>(
  url: string,
  body: unknown,
  schema: S,
  requestId: string,
): Promise<z.infer<S>> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "Idempotency-Key": requestId },
    body: JSON.stringify(body),
  });
  const parsed = apiResponse(schema).safeParse(await response.json());
  if (!parsed.success) throw new Error(copy.studio.createHouse.saveError);
  if ("error" in parsed.data)
    throw new StudioApiError(parsed.data.error.code, parsed.data.error.message);
  if (!response.ok) throw new Error(copy.studio.createHouse.saveError);
  if ("data" in parsed.data) return schema.parse(parsed.data.data);
  throw new Error(copy.studio.createHouse.saveError);
}
