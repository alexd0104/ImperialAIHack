import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, SESSION_COOKIE } from "./lib/session";
import { proxy } from "./proxy";

const SECRET = "test-secret-that-is-at-least-32-chars";

function request(path: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie: `${SESSION_COOKIE}=${cookie}` } : {},
  });
}

describe("proxy", () => {
  beforeEach(() => vi.stubEnv("SESSION_SECRET", SECRET));
  afterEach(() => vi.unstubAllEnvs());

  it("redirects a signed-out Studio page to login, keeping where they were going", async () => {
    const response = await proxy(request("/studio/new?step=2"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location") ?? "");
    expect(location.pathname).toBe("/studio/login");
    expect(location.searchParams.get("next")).toBe("/studio/new?step=2");
  });

  it("answers a signed-out API call with a 401 error envelope", async () => {
    const response = await proxy(request("/api/houses"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: "unauthorized", message: "Please sign in.", retryable: false },
    });
  });

  it("lets a valid session through", async () => {
    const token = await createSessionToken(SECRET);
    const response = await proxy(request("/studio", token));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("rejects a forged cookie", async () => {
    const response = await proxy(request("/api/houses", "9999999999999.forged"));
    expect(response.status).toBe(401);
  });

  it("leaves login, House and file routes open", async () => {
    for (const path of [
      "/studio/login",
      "/api/auth/login",
      "/api/h/tok/bundle",
      "/api/files/x.jpg",
    ]) {
      const response = await proxy(request(path));
      expect(response.headers.get("x-middleware-next")).toBe("1");
    }
  });

  it("marks every response noindex", async () => {
    for (const path of ["/", "/studio", "/api/houses"]) {
      const response = await proxy(request(path));
      expect(response.headers.get("x-robots-tag")).toBe("noindex");
    }
  });

  it("fails closed without SESSION_SECRET", async () => {
    const token = await createSessionToken(SECRET);
    vi.stubEnv("SESSION_SECRET", "");
    const response = await proxy(request("/api/houses", token));
    expect(response.status).toBe(401);
  });
});
