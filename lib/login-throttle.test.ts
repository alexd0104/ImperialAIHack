import { describe, expect, it } from "vitest";
import { clientKey, createLoginThrottle } from "./login-throttle";

function setup(overrides: Parameters<typeof createLoginThrottle>[0] = {}) {
  let t = 1_000_000;
  const throttle = createLoginThrottle({
    freeAttempts: 3,
    baseLockMs: 1_000,
    maxLockMs: 4_000,
    idleResetMs: 60_000,
    maxEntries: 3,
    now: () => t,
    ...overrides,
  });
  return { throttle, advance: (ms: number) => (t += ms) };
}

function fail(throttle: ReturnType<typeof createLoginThrottle>, key: string, times: number) {
  for (let i = 0; i < times; i++) throttle.recordFailure(key);
}

describe("login throttle", () => {
  it("allows the free attempts, then locks the IP", () => {
    const { throttle } = setup();
    fail(throttle, "a", 2);
    expect(throttle.check("a")).toEqual({ allowed: true });
    fail(throttle, "a", 1);
    expect(throttle.check("a")).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(throttle.check("b")).toEqual({ allowed: true });
  });

  it("doubles the lockout per further failure, up to the cap", () => {
    const { throttle, advance } = setup();
    fail(throttle, "a", 4);
    expect(throttle.check("a")).toEqual({ allowed: false, retryAfterSeconds: 2 });
    advance(2_000);
    expect(throttle.check("a")).toEqual({ allowed: true });
    fail(throttle, "a", 5);
    expect(throttle.check("a")).toEqual({ allowed: false, retryAfterSeconds: 4 });
  });

  it("resets on success", () => {
    const { throttle } = setup();
    fail(throttle, "a", 2);
    throttle.recordSuccess("a");
    fail(throttle, "a", 2);
    expect(throttle.check("a")).toEqual({ allowed: true });
  });

  it("forgets an idle IP after idleResetMs", () => {
    const { throttle, advance } = setup();
    fail(throttle, "a", 3);
    advance(60_001);
    expect(throttle.check("a")).toEqual({ allowed: true });
    fail(throttle, "a", 2);
    expect(throttle.check("a")).toEqual({ allowed: true });
  });

  it("caps memory by evicting the stalest IP", () => {
    const { throttle, advance } = setup();
    for (const key of ["a", "b", "c", "d"]) {
      throttle.recordFailure(key);
      advance(10);
    }
    expect(throttle.size).toBe(3);
    // "a" was evicted, so it starts over; "d" kept its failure.
    fail(throttle, "a", 2);
    expect(throttle.check("a")).toEqual({ allowed: true });
    fail(throttle, "d", 2);
    expect(throttle.check("d").allowed).toBe(false);
  });
});

describe("clientKey", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://localhost/api/auth/login", { headers });

  it("uses the first x-forwarded-for hop", () => {
    expect(clientKey(req({ "x-forwarded-for": " 1.2.3.4 , 10.0.0.1" }))).toBe("1.2.3.4");
  });

  it("falls back to one shared key", () => {
    expect(clientKey(req({}))).toBe("unknown");
  });
});
