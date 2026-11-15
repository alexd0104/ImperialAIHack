import { describe, expect, it } from "vitest";
import { CreateHouseRequest } from "./contracts";
import { fail, ok, parseJson } from "./http";

const post = (body: string) => new Request("http://localhost/api/houses", { method: "POST", body });

describe("ok / fail", () => {
  it("wraps data in { data }", async () => {
    const res = ok({ id: "h1" }, 201);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ data: { id: "h1" } });
  });

  it("uses the default status and retryable flag of the code", async () => {
    const res = fail("rate_limited", "Too many generations");
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: {
        code: "rate_limited",
        message: "Too many generations",
        retryable: true,
      },
    });
  });

  it("lets the caller override status and retryable", async () => {
    const res = fail("upstream_failed", "fal down", 502, false);
    expect(res.status).toBe(502);
    expect((await res.json()).error.retryable).toBe(false);
  });
});

describe("parseJson", () => {
  it("returns parsed data", async () => {
    const result = await parseJson(
      post(JSON.stringify({ firstName: " Frank ", consent: true })),
      CreateHouseRequest,
    );
    expect(result).toEqual({
      success: true,
      data: { firstName: "Frank", consent: true },
    });
  });

  it("reports schema issues with their path", async () => {
    const result = await parseJson(
      post(JSON.stringify({ firstName: "Frank" })),
      CreateHouseRequest,
    );
    expect(result.success).toBe(false);
    if (!result.success) expect(result.message).toMatch(/^consent:/);
  });

  it("never throws on invalid JSON", async () => {
    const result = await parseJson(post("{not json"), CreateHouseRequest);
    expect(result).toMatchObject({ success: false, issues: [] });
  });
});
