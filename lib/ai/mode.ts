import "server-only";

export type AiMode = "mock" | "live";

/** Live only when explicitly asked for: a missing or misspelt value must never spend credits. */
export function aiMode(): AiMode {
  return process.env.AI_MODE === "live" ? "live" : "mock";
}

const DEFAULT_MOCK_FAIL_RATE = 0.1;

/** Probability (0–1) that a mock fal request fails, so retry and fallback paths get exercised. */
export function mockFailRate(): number {
  const raw = process.env.MOCK_FAIL_RATE;
  if (raw === undefined || raw.trim() === "") return DEFAULT_MOCK_FAIL_RATE;
  const value = Number(raw);
  if (!Number.isFinite(value)) return DEFAULT_MOCK_FAIL_RATE;
  return Math.min(1, Math.max(0, value));
}
