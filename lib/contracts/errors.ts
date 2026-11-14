import { z } from "zod";

export const ErrorCode = z.enum([
  "validation_failed",
  "unauthorized",
  "not_found",
  "conflict",
  "file_too_large",
  "unsupported_type",
  "rate_limited",
  "budget_exceeded",
  "upstream_failed",
  "internal",
]);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ERROR_STATUS: Record<ErrorCode, number> = {
  validation_failed: 400,
  unauthorized: 401,
  not_found: 404,
  conflict: 409,
  file_too_large: 413,
  unsupported_type: 422,
  rate_limited: 429,
  budget_exceeded: 429,
  upstream_failed: 500,
  internal: 500,
};

/** Whether the client may retry the same request later by default. */
export const ERROR_RETRYABLE: Record<ErrorCode, boolean> = {
  validation_failed: false,
  unauthorized: false,
  not_found: false,
  conflict: false,
  file_too_large: false,
  unsupported_type: false,
  rate_limited: true,
  budget_exceeded: false,
  upstream_failed: true,
  internal: true,
};

export const ApiError = z.object({
  code: ErrorCode,
  message: z.string(),
  retryable: z.boolean(),
});
export type ApiError = z.infer<typeof ApiError>;

export const ApiErrorResponse = z.object({ error: ApiError });
export type ApiErrorResponse = z.infer<typeof ApiErrorResponse>;

/** `{ data: T }` envelope for a success response schema. */
export const apiSuccess = <T extends z.ZodType>(data: T) => z.object({ data });

/** Success or error envelope, for clients parsing any response. */
export const apiResponse = <T extends z.ZodType>(data: T) =>
  z.union([apiSuccess(data), ApiErrorResponse]);
