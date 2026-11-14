import "server-only";

export type AiErrorCode =
  | "not_configured"
  | "request_failed"
  | "not_ready"
  | "unknown_request"
  | "bad_output";

/**
 * One error type for live and mock, so the job engine decides retry vs fallback
 * from `retryable` alone and never has to know which provider failed.
 */
export class AiRequestError extends Error {
  readonly code: AiErrorCode;
  readonly retryable: boolean;

  constructor(code: AiErrorCode, message: string, retryable: boolean, options?: ErrorOptions) {
    super(message, options);
    this.name = "AiRequestError";
    this.code = code;
    this.retryable = retryable;
  }
}
