import { describe, expect, it } from "vitest";
import { SESSION_COOKIE } from "@/lib/session";
import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const response = POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { ok: true } });
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${SESSION_COOKIE}=;`);
    expect(cookie).toContain("Max-Age=0");
    expect(cookie).toContain("HttpOnly");
  });
});
