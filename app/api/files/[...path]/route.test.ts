import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiErrorResponse } from "@/lib/contracts";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";
import { saveFile } from "@/lib/storage";
import { GET, HEAD } from "./route";

const findHouseByToken = vi.fn();
vi.mock("@/lib/db", () => ({ findHouseByToken: (t: string) => findHouseByToken(t) }));

const SECRET = "test-secret-that-is-at-least-32-chars";
const HOUSE = "65f1a2b3c4d5e6f708192a3b";
const CONTENT = "0123456789abcdefghij"; // 20 bytes

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "mh-files-"));
  vi.stubEnv("STORAGE_DIR", dir);
  vi.stubEnv("SESSION_SECRET", SECRET);
  vi.stubEnv("HOUSE_DEMO_MODE", "false");
  findHouseByToken.mockReset().mockResolvedValue(null);
  await saveFile(HOUSE, "clips/a.mp4", new TextEncoder().encode(CONTENT));
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

async function call(
  segments: string[],
  { headers = {}, query = "", session = true, method = "GET" } = {},
) {
  const h = new Headers(headers);
  if (session) h.set("cookie", `${SESSION_COOKIE}=${await createSessionToken(SECRET)}`);
  const request = new NextRequest(`http://localhost:3000/api/files/${segments.join("/")}${query}`, {
    method,
    headers: h,
  });
  const ctx = { params: Promise.resolve({ path: segments }) };
  return (method === "HEAD" ? HEAD : GET)(request, ctx);
}

describe("GET /api/files/[...path]", () => {
  it("serves the whole file with type and Accept-Ranges", async () => {
    const res = await call([HOUSE, "clips", "a.mp4"]);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("video/mp4");
    expect(res.headers.get("accept-ranges")).toBe("bytes");
    expect(res.headers.get("content-length")).toBe("20");
    expect(await res.text()).toBe(CONTENT);
  });

  it("answers a Range request with 206 and exactly the requested bytes", async () => {
    const res = await call([HOUSE, "clips", "a.mp4"], { headers: { range: "bytes=5-9" } });
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 5-9/20");
    expect(res.headers.get("content-length")).toBe("5");
    expect(await res.text()).toBe("56789");

    const tail = await call([HOUSE, "clips", "a.mp4"], { headers: { range: "bytes=-3" } });
    expect(tail.status).toBe(206);
    expect(await tail.text()).toBe("hij");
  });

  it("returns 416 for an unsatisfiable range", async () => {
    const res = await call([HOUSE, "clips", "a.mp4"], { headers: { range: "bytes=50-" } });
    expect(res.status).toBe(416);
    expect(res.headers.get("content-range")).toBe("bytes */20");
  });

  it("HEAD returns headers without a body", async () => {
    const res = await call([HOUSE, "clips", "a.mp4"], { method: "HEAD" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBe("20");
    expect(res.body).toBeNull();
  });

  it("rejects path traversal", async () => {
    for (const segments of [
      [HOUSE, "..", "..", "etc", "passwd"],
      ["..", "x"],
      [HOUSE, "a\\..\\b"],
    ]) {
      const res = await call(segments);
      expect(res.status, segments.join("/")).toBe(400);
      expect(ApiErrorResponse.parse(await res.json()).error.code).toBe("validation_failed");
    }
  });

  it("returns 404 for a missing file", async () => {
    expect((await call([HOUSE, "nope.jpg"])).status).toBe(404);
  });

  it("refuses access without a session or token", async () => {
    const res = await call([HOUSE, "clips", "a.mp4"], { session: false });
    expect(res.status).toBe(401);
  });

  it("accepts a House token only for that House's files", async () => {
    findHouseByToken.mockResolvedValue({ id: HOUSE });
    const own = await call([HOUSE, "clips", "a.mp4"], { session: false, query: "?t=tok" });
    expect(own.status).toBe(200);
    expect(findHouseByToken).toHaveBeenCalledWith("tok");

    findHouseByToken.mockResolvedValue({ id: "65f1a2b3c4d5e6f708192a3c" });
    const other = await call([HOUSE, "clips", "a.mp4"], { session: false, query: "?t=tok" });
    expect(other.status).toBe(401);
  });

  it("in demo mode, opens files only with the explicitly configured demo token", async () => {
    vi.stubEnv("HOUSE_DEMO_MODE", "true");
    vi.stubEnv("DEMO_HOUSE_TOKEN", "");
    const unset = await call([HOUSE, "clips", "a.mp4"], { session: false, query: "?t=demo-token" });
    expect(unset.status).toBe(401);

    vi.stubEnv("DEMO_HOUSE_TOKEN", "stage-token");
    const ok = await call([HOUSE, "clips", "a.mp4"], { session: false, query: "?t=stage-token" });
    expect(ok.status).toBe(200);
    // Only the first call (no demo token configured) fell through to the DB lookup.
    expect(findHouseByToken).toHaveBeenCalledTimes(1);
  });

  it("answers a retryable error when the DB is unreachable", async () => {
    findHouseByToken.mockRejectedValue(new Error("MongoServerSelectionError"));
    const res = await call([HOUSE, "clips", "a.mp4"], { session: false, query: "?t=tok" });
    expect(res.status).toBe(500);
    expect(ApiErrorResponse.parse(await res.json()).error.retryable).toBe(true);
  });
});
