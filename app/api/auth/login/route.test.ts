import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { POST } from "./route";

const SECRET = "test-secret-that-is-at-least-32-chars";

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
  });

  it("returns 401 invalid_password and no cookie on a wrong password", async () => {
    const response = await login({ password: "nope" });
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("invalid_password");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([{}, { password: "" }, { password: 42 }, "not json"])(
    "returns 400 for %j",
    async (body) => {
      const response = await login(body);
      expect(response.status).toBe(400);
      expect((await response.json()).error.code).toBe("bad_request");
    },
  );

  it("returns 500 not_configured when env is missing", async () => {
    vi.stubEnv("STUDIO_PASSWORD", "");
    const response = await login({ password: "family-password" });
    expect(response.status).toBe(500);
    expect((await response.json()).error).toEqual({
      code: "not_configured",
      message: "Studio sign-in is not configured.",
      retryable: false,
    });
  });
});
