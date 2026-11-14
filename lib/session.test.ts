import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  needsSession,
  passwordMatches,
  SESSION_MAX_AGE_SECONDS,
  safeNextPath,
  verifySessionToken,
} from "./session";

const SECRET = "test-secret-that-is-at-least-32-chars";

describe("session token", () => {
  it("round-trips a fresh token", async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(token, SECRET)).toBe(true);
  });

  it("rejects a token signed with another secret", async () => {
    const token = await createSessionToken("another-secret-of-sufficient-length!");
    expect(await verifySessionToken(token, SECRET)).toBe(false);
  });

  it("rejects a token whose expiry was tampered with", async () => {
    const token = await createSessionToken(SECRET);
    const [expiresAt, signature] = token.split(".");
    const forged = `${Number(expiresAt) + 1_000_000}.${signature}`;
    expect(await verifySessionToken(forged, SECRET)).toBe(false);
  });

  it("rejects an expired token", async () => {
    const now = Date.now();
    const token = await createSessionToken(SECRET, now);
    const later = now + SESSION_MAX_AGE_SECONDS * 1000 + 1;
    expect(await verifySessionToken(token, SECRET, later)).toBe(false);
  });

  it("fails closed on a missing token, missing secret or malformed token", async () => {
    const token = await createSessionToken(SECRET);
    expect(await verifySessionToken(undefined, SECRET)).toBe(false);
    expect(await verifySessionToken(token, undefined)).toBe(false);
    expect(await verifySessionToken("garbage", SECRET)).toBe(false);
    expect(await verifySessionToken(`${token}.extra`, SECRET)).toBe(false);
    expect(await verifySessionToken("abc.def", SECRET)).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("accepts the exact password only", async () => {
    expect(await passwordMatches("hunter2", "hunter2", SECRET)).toBe(true);
    expect(await passwordMatches("hunter3", "hunter2", SECRET)).toBe(false);
    expect(await passwordMatches("hunter", "hunter2", SECRET)).toBe(false);
  });
});

describe("needsSession", () => {
  it.each(["/studio", "/studio/", "/studio/new", "/api/houses", "/api/memories/1/generate"])(
    "guards %s",
    (path) => {
      expect(needsSession(path)).toBe(true);
    },
  );

  it.each([
    "/",
    "/studio/login",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/h",
    "/api/files",
    "/api/h/abc/bundle",
    "/api/files/a/b.jpg",
    "/house/abc",
    "/studiox",
  ])("leaves %s open", (path) => {
    expect(needsSession(path)).toBe(false);
  });

  it("does not open look-alike paths", () => {
    expect(needsSession("/studio/loginx")).toBe(true);
    expect(needsSession("/api/hx")).toBe(true);
    expect(needsSession("/api/filesystem")).toBe(true);
  });
});

describe("safeNextPath", () => {
  it("keeps Studio paths", () => {
    expect(safeNextPath("/studio/new?x=1")).toBe("/studio/new?x=1");
  });

  it.each([
    null,
    undefined,
    "",
    "https://evil.example",
    "//evil.example",
    "/\\evil",
    "/house/x",
    "/studiox",
  ])("falls back to /studio for %s", (next) => {
    expect(safeNextPath(next)).toBe("/studio");
  });
});
