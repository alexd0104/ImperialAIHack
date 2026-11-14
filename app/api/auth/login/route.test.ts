import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiErrorResponse } from "@/lib/contracts";
import { loginThrottle } from "@/lib/login-throttle";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { POST } from "./route";

const SECRET = "test-secret-that-is-at-least-32-chars";

/** Every error must be consumable by a contract-based client (review of #12). */
async function errorOf(response: Response) {
  return ApiErrorResponse.parse(await response.json()).error;
}

function login(body: unknown) {
  return POST(
    new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.stubEnv("STUDIO_PASSWORD", "family-password");
    vi.stubEnv("SESSION_SECRET", SECRET);
    loginThrottle.clear();
  });

  it("returns 429 rate_limited after repeated wrong passwords, even for the right one", async () => {
    for (let i = 0; i < 5; i++) expect((await login({ password: "nope" })).status).toBe(401);
    const blocked = await login({ password: "family-password" });
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await errorOf(blocked)).toEqual({
      code: "rate_limited",
      message: "Too many tries. Please wait a moment and try again.",
      retryable: true,
    });
    expect(blocked.headers.get("set-cookie")).toBeNull();
  });

  it("resets the count after a successful sign-in", async () => {
    for (let i = 0; i < 4; i++) await login({ password: "nope" });
    expect((await login({ password: "family-password" })).status).toBe(200);
    for (let i = 0; i < 4; i++) await login({ password: "nope" });
    expect((await login({ password: "family-password" })).status).toBe(200);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("sets a valid signed session cookie on the right password", async () => {
    const response = await login({ password: "family-password" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { ok: true } });

    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=604800");
    const token = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
    expect(await verifySessionToken(token, SECRET)).toBe(true);
  });

  it("adds Secure only over https", async () => {
    const plain = await login({ password: "family-password" });
    expect(plain.headers.get("set-cookie")).not.toContain("Secure");
    const https = await POST(
      new Request("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-proto": "https" },
        body: JSON.stringify({ password: "family-password" }),
      }),
    );
    expect(https.headers.get("set-cookie")).toContain("Secure");
  });

  it("refuses to sign in with a short SESSION_SECRET", async () => {
    vi.stubEnv("SESSION_SECRET", "short");
    const response = await login({ password: "family-password" });
    expect(response.status).toBe(500);
    expect((await errorOf(response)).code).toBe("internal");
  });

  it("returns 401 unauthorized and no cookie on a wrong password", async () => {
    const response = await login({ password: "nope" });
    expect(response.status).toBe(401);
    expect(await errorOf(response)).toEqual({
      code: "unauthorized",
      message: "That password is not right.",
      retryable: true,
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([{}, { password: "" }, { password: 42 }, "not json"])(
    "returns 422 validation_failed for %j",
    async (body) => {
      const response = await login(body);
      expect(response.status).toBe(422);
      expect((await errorOf(response)).code).toBe("validation_failed");
    },
  );

  it("returns 500 internal (not retryable) when env is missing", async () => {
    vi.stubEnv("STUDIO_PASSWORD", "");
    const response = await login({ password: "family-password" });
    expect(response.status).toBe(500);
    expect(await errorOf(response)).toEqual({
      code: "internal",
      message: "Studio sign-in is not configured.",
      retryable: false,
    });
  });
});
