import "server-only";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AiRequestError } from "@/lib/ai/errors";
import { getFal, isMockUrl } from "@/lib/ai/fal";
import { compilePrompts } from "@/lib/ai/prompt-compiler";
import { CompiledPrompts } from "@/lib/ai/prompt-types";
import type { Asset, Job, JobStep, MemorySheet, SceneOutputs } from "@/lib/contracts";
import { db } from "@/lib/db/collections";
import { openReadStream, saveFile, sha256File } from "@/lib/storage";
import type { FalPlan, StepContext, StepHandlers } from "./types";

// Default step handlers (TECHNICAL.md §5.1). P2 refines model params once each
// model is checked in the fal playground; the engine does not care what they send.

/** Source file of a job: the scene's photo, or the family's room photo. */
interface Source {
  path: string;
  sha256: string;
  mime: string;
  asset?: Asset;
}

const FAL_URL_MARGIN_MS = 10 * 60_000;
const FAL_URL_LIFETIME_MS = 60 * 60_000;

/** Fixed wording: only asks to tidy and relight what is already in the family's photo. */
const ROOM_EDIT_PROMPT = "warm, tidy, soft light, keep the room exactly as it is";

function nonRetryable(message: string): AiRequestError {
  return new AiRequestError("bad_output", message, false);
}

async function loadSource(job: Job): Promise<Source> {
  if (job.type === "scene") {
    const scene = job.sceneId ? await db.scenes.findById(job.sceneId) : null;
    const asset = scene ? await db.assets.findById(scene.assetId) : null;
    if (!asset) throw nonRetryable(`Scene job ${job.id} has no source photo`);
    return { path: asset.path, sha256: asset.sha256, mime: asset.mime, asset };
  }
  if (job.type === "room_background") {
    const room = job.roomId ? await db.rooms.findById(job.roomId) : null;
    if (room?.source !== "photo") throw nonRetryable(`Room job ${job.id} has no photo`);
    return { path: room.backgroundPath, sha256: await sha256File(room.backgroundPath), mime: "" };
  }
  // The Job contract carries no asset id for object_3d (reported as a contract gap).
  throw nonRetryable(`Object job ${job.id} has no source photo reference`);
}

async function loadSheet(job: Job): Promise<MemorySheet> {
  const memory = job.memoryId ? await db.memories.findById(job.memoryId) : null;
  if (!memory?.sheet) throw nonRetryable(`Job ${job.id} has no MemorySheet`);
  return memory.sheet;
}

async function loadPrompts(ctx: StepContext): Promise<CompiledPrompts> {
  const path = ctx.outputs.compile;
  if (!path) throw nonRetryable("Prompts were not compiled");
  return CompiledPrompts.parse(JSON.parse(await readStored(path)));
}

async function readBuffer(path: string): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of openReadStream(path)) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function readStored(path: string): Promise<string> {
  return (await readBuffer(path)).toString("utf8");
}

async function blobOf(path: string, mime: string): Promise<Blob> {
  return new Blob([new Uint8Array(await readBuffer(path))], mime ? { type: mime } : undefined);
}

function freshFalUrl(asset: Asset | undefined, now: number): string | undefined {
  if (!asset?.falUrl || !asset.falUrlExpiresAt) return undefined;
  return Date.parse(asset.falUrlExpiresAt) - FAL_URL_MARGIN_MS > now ? asset.falUrl : undefined;
}

/** The latest image of the chain (restored → colourised), or the original photo. */
async function imageInput(ctx: StepContext, ...preferred: ("restore" | "colourise")[]) {
  const source = await loadSource(ctx.job);
  for (const name of preferred) {
    const path = ctx.outputs[name];
    if (path) {
      return { field: "image_url", sha256: await sha256File(path), read: () => blobOf(path, "") };
    }
  }
  return {
    field: "image_url",
    sha256: source.sha256,
    url: freshFalUrl(source.asset, Date.now()),
    read: () => blobOf(source.path, source.mime),
  };
}

export const defaultHandlers: StepHandlers = {
  compile: {
    kind: "local",
    async run({ job }) {
      const prompts = await compilePrompts({ sheet: await loadSheet(job) });
      const saved = await saveFile(
        job.houseId,
        `${job.id}/prompts.json`,
        new TextEncoder().encode(JSON.stringify(prompts)),
      );
      return { output: saved.path };
    },
  },

  upload: {
    kind: "local",
    async run({ job }) {
      const source = await loadSource(job);
      const fal = getFal();
      // Mock uploads are fake URLs: never store them where a live run could reuse them.
      if (fal.mode !== "live" || freshFalUrl(source.asset, Date.now())) return {};
      const url = await fal.upload(await blobOf(source.path, source.mime));
      if (source.asset) {
        await db.assets.update(source.asset.id, {
          falUrl: url,
          falUrlExpiresAt: new Date(Date.now() + FAL_URL_LIFETIME_MS).toISOString(),
        });
      }
      return {};
    },
  },

  restore: {
    kind: "fal",
    plan: async (ctx): Promise<FalPlan> => ({
      model: "restore",
      params: {},
      input: await imageInput(ctx),
    }),
  },

  colourise: {
    kind: "fal",
    async plan(ctx): Promise<FalPlan> {
      const prompts = await loadPrompts(ctx);
      const color = prompts.colourStyle === "none" ? "contemporary color" : prompts.colourStyle;
      return { model: "colourise", params: { color }, input: await imageInput(ctx, "restore") };
    },
  },

  animate: {
    kind: "fal",
    async plan(ctx): Promise<FalPlan> {
      const prompts = await loadPrompts(ctx);
      return {
        model: "animate",
        params: { prompt: prompts.motionPrompt, negative_prompt: prompts.negativePrompt },
        input: await imageInput(ctx, "colourise", "restore"),
      };
    },
  },

  ambience: {
    kind: "fal",
    async plan(ctx): Promise<FalPlan> {
      const { ambiencePrompt } = await loadPrompts(ctx);
      const clip = ctx.outputs.animate;
      if (!clip) return { model: "ambienceStill", params: { prompt: ambiencePrompt } };
      return {
        model: "ambienceClip",
        params: { prompt: ambiencePrompt },
        input: { field: "video_url", sha256: await sha256File(clip), read: () => blobOf(clip, "") },
      };
    },
  },

  cutout: {
    kind: "fal",
    plan: async (ctx): Promise<FalPlan> => ({
      model: "cutout",
      params: {},
      input: await imageInput(ctx),
    }),
  },

  model3d: {
    kind: "fal",
    async plan(ctx): Promise<FalPlan> {
      const cut = ctx.outputs.cutout;
      // TODO(P5): check Rodin's input field name/shape in the playground.
      const input = cut
        ? { field: "image_url", sha256: await sha256File(cut), read: () => blobOf(cut, "") }
        : await imageInput(ctx);
      return { model: "model3d", params: {}, input };
    },
  },

  compress: {
    kind: "local",
    // P5 adds gltf-transform; until then the raw GLB is kept (its documented fallback).
    run: async ({ outputs }) => (outputs.model3d ? { output: outputs.model3d } : { skipped: true }),
  },

  room_edit: {
    kind: "fal",
    plan: async (ctx): Promise<FalPlan> => ({
      model: "roomEdit",
      params: { prompt: ROOM_EDIT_PROMPT },
      input: await imageInput(ctx),
    }),
  },

  // Results are written by `settleJob`, which also runs when a job falls back.
  finalize: { kind: "local", run: async () => ({}) },
};

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "audio/wav": "wav",
  "audio/mpeg": "mp3",
  "model/gltf-binary": "glb",
};

/** Every output is copied to storage/ at once: fal CDN files expire after an hour. */
export async function storeOutput(
  job: Job,
  step: JobStep,
  url: string,
  mime: string,
): Promise<string> {
  const name = `${job.id}/${step.name}.${EXTENSIONS[mime] ?? "bin"}`;
  if (isMockUrl(url)) {
    return (await saveFile(job.houseId, name, await readFile(fileURLToPath(url)))).path;
  }
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new AiRequestError("request_failed", `Download failed (${res.status})`, true);
  }
  return (await saveFile(job.houseId, name, res.body)).path;
}

/** Scene outputs from the steps that finished, whatever the final status. */
export function sceneOutputsOf(job: Job): SceneOutputs {
  const done = (name: JobStep["name"]) =>
    job.steps.find((s) => s.name === name && s.status === "done")?.output;
  const clip = done("animate");
  const ambience = done("ambience");
  return {
    restored: done("restore"),
    colourised: done("colourise"),
    // mmaudio on a clip returns the clip with its sound; on a still, a separate audio file.
    clip: clip && ambience ? ambience : clip,
    ambience: clip ? undefined : ambience,
  };
}

/** Writes a final job's result where the Studio and House read it. */
export async function settleJob(job: Job): Promise<void> {
  if (job.type === "scene" && job.sceneId) {
    await db.scenes.update(job.sceneId, {
      outputs: sceneOutputsOf(job),
      status: job.status === "done" ? "done" : job.status === "fallback" ? "fallback" : "failed",
    });
    return;
  }
  const last = (name: JobStep["name"]) =>
    job.steps.find((s) => s.name === name && s.status === "done")?.output;
  if (job.type === "room_background" && job.roomId && job.status === "done") {
    const background = last("room_edit");
    if (background) await db.rooms.update(job.roomId, { backgroundPath: background });
  }
  if (job.type === "object_3d" && job.storyId && job.status === "done") {
    const glb = last("compress") ?? last("model3d");
    if (glb)
      await db.stories.update(job.storyId, { object: { kind: "glb", path: glb, jobId: job.id } });
  }
  // On failure rooms keep their default style and stories their library object.
}
