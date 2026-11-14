import "server-only";
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ApiError, createFalClient } from "@fal-ai/client";
import { AiRequestError } from "./errors";
import { type AiMode, aiMode, mockFailRate } from "./mode";
import { type FalModelKey, MODELS } from "./models";

export type FalQueueStatus = "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED";

export interface FalResult {
  requestId: string;
  data: Record<string, unknown>;
}

/**
 * What the job engine talks to. Live and mock implement exactly this, so
 * nothing above lib/ai knows which one is running (TECHNICAL.md §7.4).
 * Never "subscribe": the engine polls status and fetches the result itself.
 */
export interface FalGateway {
  readonly mode: AiMode;
  /** Uploads a local file to the fal CDN and returns a URL models can read. */
  upload(file: Blob): Promise<string>;
  /** Queues a request and returns its request ID (store it on the job step). */
  submit(model: FalModelKey, input: Record<string, unknown>): Promise<string>;
  status(model: FalModelKey, requestId: string): Promise<FalQueueStatus>;
  /** Throws AiRequestError if the request failed; `retryable` says whether to resubmit. */
  result(model: FalModelKey, requestId: string): Promise<FalResult>;
}

export function getFal(): FalGateway {
  return aiMode() === "live" ? liveFal() : mockFal;
}

/** Main output URL and type of a result, using the path declared in models.ts. */
export function extractOutput(model: FalModelKey, data: unknown): { url: string; mime: string } {
  const { path: outputPath, mime } = MODELS[model].output;
  let node: unknown = data;
  for (const segment of outputPath) {
    if (node === null || typeof node !== "object") {
      node = undefined;
      break;
    }
    node = (node as Record<string | number, unknown>)[segment];
  }
  if (typeof node !== "string" || node.length === 0) {
    throw new AiRequestError("bad_output", `No output URL in ${model} result`, true);
  }
  return { url: node, mime };
}

// ---------------------------------------------------------------- live

/** We keep our own copies in storage/, so fal can delete inputs and outputs after an hour. */
const LIFECYCLE_SECONDS = 3600;
const LIFECYCLE_HEADERS = {
  "X-Fal-Object-Lifecycle-Preference": JSON.stringify({
    expiration_duration_seconds: LIFECYCLE_SECONDS,
  }),
};

type LiveClient = ReturnType<typeof createFalClient>;
const globalForFal = globalThis as typeof globalThis & {
  __mhFalClient?: { key: string; client: LiveClient };
};

function liveClient(): LiveClient {
  const key = process.env.FAL_KEY;
  if (!key) throw new AiRequestError("not_configured", "FAL_KEY is not set", false);
  const cached = globalForFal.__mhFalClient;
  if (cached?.key === key) return cached.client;
  const client = createFalClient({ credentials: key });
  globalForFal.__mhFalClient = { key, client };
  return client;
}

function toAiError(error: unknown): AiRequestError {
  if (error instanceof AiRequestError) return error;
  if (error instanceof ApiError) {
    const retryable = error.status >= 500 || error.status === 429 || error.status === 408;
    return new AiRequestError(
      "request_failed",
      `fal ${error.status}: ${error.message}`,
      retryable,
      {
        cause: error,
      },
    );
  }
  // Network errors and timeouts: worth another try.
  const message = error instanceof Error ? error.message : String(error);
  return new AiRequestError("request_failed", `fal: ${message}`, true, { cause: error });
}

async function guarded<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw toAiError(error);
  }
}

function liveFal(): FalGateway {
  return {
    mode: "live",
    upload: (file) =>
      guarded(() =>
        liveClient().storage.upload(file, { lifecycle: { expiresIn: LIFECYCLE_SECONDS } }),
      ),
    submit: (model, input) =>
      guarded(async () => {
        // Typed as string so the client accepts any input shape; the model's schema is checked by fal.
        const id: string = MODELS[model].id;
        const queued = await liveClient().queue.submit(id, {
          input: { ...MODELS[model].defaults, ...input },
          headers: LIFECYCLE_HEADERS,
        });
        return queued.request_id;
      }),
    status: (model, requestId) =>
      guarded(
        async () => (await liveClient().queue.status(MODELS[model].id, { requestId })).status,
      ),
    result: (model, requestId) =>
      guarded(async () => {
        const id: string = MODELS[model].id;
        const res = await liveClient().queue.result(id, { requestId });
        return { requestId: res.requestId, data: res.data as Record<string, unknown> };
      }),
  };
}

// ---------------------------------------------------------------- mock

const MOCK_FIXTURES_DIR = path.join(process.cwd(), "mocks", "fal");
export const MOCK_MEDIA_DIR = path.join(process.cwd(), "mocks", "media");
const MOCK_MEDIA_PREFIX = "mocks/media/";
const MOCK_MIN_DELAY_MS = 2000;
const MOCK_MAX_DELAY_MS = 5000;

/** True for URLs the mock returns; the engine copies these from disk instead of downloading. */
export function isMockUrl(url: string): boolean {
  if (!url.startsWith("file://")) return false;
  return fileURLToPath(url).startsWith(MOCK_MEDIA_DIR + path.sep);
}

export function mockFixturePath(model: FalModelKey): string {
  return path.join(MOCK_FIXTURES_DIR, `${MODELS[model].id.replaceAll("/", "__")}.json`);
}

interface MockRequest {
  submittedAt: number;
  delayMs: number;
  fails: boolean;
}

/**
 * The request ID carries its own timing and outcome, so mock jobs survive a dev
 * server restart or hot reload exactly like live ones (the engine stores the ID in Mongo).
 */
function encodeMockId(req: MockRequest): string {
  const nonce = randomBytes(4).toString("hex");
  return `mock_${req.submittedAt.toString(36)}_${req.delayMs.toString(36)}_${req.fails ? 1 : 0}_${nonce}`;
}

function decodeMockId(requestId: string): MockRequest {
  const match = /^mock_([0-9a-z]+)_([0-9a-z]+)_([01])_[0-9a-f]+$/.exec(requestId);
  if (!match)
    throw new AiRequestError("unknown_request", `Unknown mock request ${requestId}`, false);
  return {
    submittedAt: Number.parseInt(match[1], 36),
    delayMs: Number.parseInt(match[2], 36),
    fails: match[3] === "1",
  };
}

function mockStatusOf(req: MockRequest): FalQueueStatus {
  const elapsed = Date.now() - req.submittedAt;
  if (elapsed >= req.delayMs) return "COMPLETED";
  return elapsed < req.delayMs / 4 ? "IN_QUEUE" : "IN_PROGRESS";
}

/** Fixtures point at "mocks/media/<file>"; turn those into absolute file:// URLs. */
function resolveMockMedia(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith(MOCK_MEDIA_PREFIX)) {
    return pathToFileURL(path.join(MOCK_MEDIA_DIR, value.slice(MOCK_MEDIA_PREFIX.length))).href;
  }
  if (Array.isArray(value)) return value.map(resolveMockMedia);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveMockMedia(v)]));
  }
  return value;
}

const mockFal: FalGateway = {
  mode: "mock",
  async upload(file) {
    // Mock models never read their input, but the URL must look like a real CDN one.
    return `https://mock.fal.media/files/${randomBytes(6).toString("hex")}-${file.size}`;
  },
  async submit(model, input) {
    if (!(model in MODELS))
      throw new AiRequestError("request_failed", `Unknown model ${model}`, false);
    if (input === null || typeof input !== "object") {
      throw new AiRequestError("request_failed", "Input must be an object", false);
    }
    const delayMs =
      MOCK_MIN_DELAY_MS + Math.floor(Math.random() * (MOCK_MAX_DELAY_MS - MOCK_MIN_DELAY_MS + 1));
    return encodeMockId({
      submittedAt: Date.now(),
      delayMs,
      fails: Math.random() < mockFailRate(),
    });
  },
  async status(_model, requestId) {
    return mockStatusOf(decodeMockId(requestId));
  },
  async result(model, requestId) {
    const req = decodeMockId(requestId);
    if (mockStatusOf(req) !== "COMPLETED") {
      throw new AiRequestError("not_ready", `Mock request ${requestId} is still running`, true);
    }
    // Like fal: a failed request reports COMPLETED, then fetching its result throws.
    if (req.fails) {
      throw new AiRequestError(
        "request_failed",
        `Mock failure for ${model} (MOCK_FAIL_RATE)`,
        true,
      );
    }
    let fixture: unknown;
    try {
      fixture = JSON.parse(await readFile(mockFixturePath(model), "utf8"));
    } catch (error) {
      throw new AiRequestError(
        "bad_output",
        `Missing or invalid mock fixture for ${model}`,
        false,
        {
          cause: error,
        },
      );
    }
    return { requestId, data: resolveMockMedia(fixture) as Record<string, unknown> };
  },
};
