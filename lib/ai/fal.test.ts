import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiRequestError } from "./errors";
import { extractOutput, getFal, isMockUrl } from "./fal";
import { FAL_MODEL_KEYS, MODELS } from "./models";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-14T20:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("getFal", () => {
  it("is the mock unless AI_MODE is exactly 'live'", () => {
    vi.stubEnv("AI_MODE", "");
    expect(getFal().mode).toBe("mock");
    vi.stubEnv("AI_MODE", "LIVE");
    expect(getFal().mode).toBe("mock");
  });
});

describe("mock fal lifecycle", () => {
  it.each([
    [0, 2000],
    [0.9999, 5000],
  ])("random %s gives a %s ms delay (bounds of the 2–5 s window)", async (random, delayMs) => {
    vi.spyOn(Math, "random").mockReturnValue(random);
    const fal = getFal();
    const id = await fal.submit("restore", {});
    vi.advanceTimersByTime(delayMs - 1);
    expect(await fal.status("restore", id)).toBe("IN_PROGRESS");
    vi.advanceTimersByTime(1);
    expect(await fal.status("restore", id)).toBe("COMPLETED");
  });

  it("goes IN_QUEUE → IN_PROGRESS → COMPLETED", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // 3.5 s delay
    const fal = getFal();
    const id = await fal.submit("animate", { image_url: "https://mock.fal.media/x", prompt: "p" });

    expect(await fal.status("animate", id)).toBe("IN_QUEUE");
    await expect(fal.result("animate", id)).rejects.toMatchObject({ code: "not_ready" });

    vi.advanceTimersByTime(1000);
    expect(await fal.status("animate", id)).toBe("IN_PROGRESS");

    vi.advanceTimersByTime(2000);
    expect(await fal.status("animate", id)).toBe("IN_PROGRESS");

    vi.advanceTimersByTime(500);
    expect(await fal.status("animate", id)).toBe("COMPLETED");

    const result = await fal.result("animate", id);
    expect(result.requestId).toBe(id);
    const output = extractOutput("animate", result.data);
    expect(output.mime).toBe("video/mp4");
    expect(isMockUrl(output.url)).toBe(true);
    expect(existsSync(fileURLToPath(output.url))).toBe(true);
  });

  it.each(FAL_MODEL_KEYS)("%s returns its fixture with a real local output file", async (key) => {
    const fal = getFal();
    const id = await fal.submit(key, {});
    vi.advanceTimersByTime(5000);
    const { data } = await fal.result(key, id);
    const { url, mime } = extractOutput(key, data);
    expect(mime).toBe(MODELS[key].output.mime);
    expect(existsSync(fileURLToPath(url))).toBe(true);
  });

  it("keeps working across a 'restart': the request ID carries its own state", async () => {
    const id = await getFal().submit("restore", {});
    vi.advanceTimersByTime(5000);
    // A fresh gateway (as after a dev-server reload) still resolves the stored ID.
    expect(await getFal().status("restore", id)).toBe("COMPLETED");
  });

  it("rejects unknown request IDs as non-retryable", async () => {
    await expect(getFal().status("restore", "req_123")).rejects.toMatchObject({
      code: "unknown_request",
      retryable: false,
    });
  });

  it("uploads return a CDN-looking URL", async () => {
    const url = await getFal().upload(new Blob(["x"], { type: "image/jpeg" }));
    expect(url).toMatch(/^https:\/\/mock\.fal\.media\/files\//);
  });
});

describe("mock failure injection", () => {
  it("fails every request with MOCK_FAIL_RATE=1, after reporting COMPLETED like fal", async () => {
    vi.stubEnv("MOCK_FAIL_RATE", "1");
    const fal = getFal();
    const id = await fal.submit("colourise", {});
    vi.advanceTimersByTime(5000);
    expect(await fal.status("colourise", id)).toBe("COMPLETED");
    const error = await fal.result("colourise", id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiRequestError);
    expect(error).toMatchObject({ code: "request_failed", retryable: true });
  });

  it("never fails with MOCK_FAIL_RATE=0", async () => {
    vi.stubEnv("MOCK_FAIL_RATE", "0");
    const fal = getFal();
    const ids = await Promise.all(Array.from({ length: 20 }, () => fal.submit("cutout", {})));
    vi.advanceTimersByTime(5000);
    await Promise.all(ids.map((id) => fal.result("cutout", id)));
  });
});

describe("extractOutput", () => {
  it("throws a retryable bad_output when the URL is missing", () => {
    expect(() => extractOutput("roomEdit", { images: [] })).toThrow(AiRequestError);
  });
});
