import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Document, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Job } from "@/lib/contracts";
import { saveFile } from "@/lib/storage";
import { compressGlb } from "./compress-glb";
import { advanceJob } from "./engine";
import { newObjectJob, object3dPlan } from "./plans";
import { defaultHandlers } from "./steps";
import { HOUSE, harness, makeJob } from "./test-fakes";

const JOB = "6650a1f0c0ffee0000000077";

/** A one-triangle GLB with the 256 px cutout PNG as its texture. */
async function texturedGlb(): Promise<Uint8Array> {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const texture = doc
    .createTexture("photo")
    .setImage(new Uint8Array(await readFile("mocks/media/cutout.png")))
    .setMimeType("image/png");
  const position = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer);
  const uv = doc
    .createAccessor()
    .setType("VEC2")
    .setArray(new Float32Array([0, 0, 1, 0, 0, 1]))
    .setBuffer(buffer);
  const prim = doc
    .createPrimitive()
    .setAttribute("POSITION", position)
    .setAttribute("TEXCOORD_0", uv)
    .setMaterial(doc.createMaterial().setBaseColorTexture(texture));
  doc.createScene().addChild(doc.createNode().setMesh(doc.createMesh().addPrimitive(prim)));
  return new NodeIO().writeBinary(doc);
}

describe("compressGlb", () => {
  it("rewrites textures as WebP and stays a readable GLB", async () => {
    const out = await compressGlb(await texturedGlb());
    expect(Buffer.from(out.subarray(0, 4)).toString()).toBe("glTF");
    const doc = await new NodeIO().registerExtensions(ALL_EXTENSIONS).readBinary(out);
    expect(
      doc
        .getRoot()
        .listTextures()
        .map((t) => t.getMimeType()),
    ).toEqual(["image/webp"]);
  });

  it("throws on a file that is not a GLB", async () => {
    await expect(compressGlb(new TextEncoder().encode("not a glb"))).rejects.toThrow();
  });
});

describe("object_3d steps", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "memorai-p5-"));
    vi.stubEnv("STORAGE_DIR", dir);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(dir, { recursive: true, force: true });
  });

  const job = () => makeJob(JOB, object3dPlan(), { type: "object_3d", sceneId: undefined });
  const compress = defaultHandlers.compress;
  if (compress?.kind !== "local") throw new Error("compress must be local");
  const model3d = defaultHandlers.model3d;
  if (model3d?.kind !== "fal") throw new Error("model3d must be fal");

  it("compress stores a lighter GLB next to the raw one", async () => {
    const raw = (await saveFile(HOUSE, `${JOB}/model3d.glb`, await texturedGlb())).path;
    const result = await compress.run({
      job: job(),
      step: job().steps[3],
      outputs: { model3d: raw },
    });
    expect(result.output).toBe(`${HOUSE}/${JOB}/compress.glb`);
  });

  it("compress keeps the raw GLB when it cannot read it", async () => {
    const raw = (await saveFile(HOUSE, `${JOB}/model3d.glb`, new TextEncoder().encode("x"))).path;
    const result = await compress.run({
      job: job(),
      step: job().steps[3],
      outputs: { model3d: raw },
    });
    expect(result.output).toBe(raw);
  });

  it("model3d sends the cutout to Rodin as an image_urls list", async () => {
    const cut = (
      await saveFile(HOUSE, `${JOB}/cutout.png`, await readFile("mocks/media/cutout.png"))
    ).path;
    const plan = await model3d.plan({ job: job(), step: job().steps[2], outputs: { cutout: cut } });
    expect(plan).toMatchObject({ model: "model3d", input: { field: "image_urls", list: true } });
  });
});

describe("object_3d job", () => {
  it("newObjectJob carries the photo asset id (contract addition)", () => {
    const job = Job.parse({
      ...newObjectJob({
        houseId: HOUSE,
        roomId: "6650a1f0c0ffee0000000002",
        storyId: "6650a1f0c0ffee0000000003",
        assetId: "6650a1f0c0ffee0000000011",
        falKeyLabel: "dev",
        now: "2026-11-14T20:00:00.000Z",
      }),
      id: JOB,
    });
    expect(job.assetId).toBe("6650a1f0c0ffee0000000011");
    expect(job.steps.map((s) => s.name)).toEqual([
      "upload",
      "cutout",
      "model3d",
      "compress",
      "finalize",
    ]);
  });

  it("the engine wraps a list input in an array", async () => {
    const h = harness();
    h.deps.handlers = {
      ...h.deps.handlers,
      cutout: { kind: "local", run: async () => ({ skipped: true }) },
      model3d: {
        kind: "fal",
        plan: async () => ({
          model: "model3d",
          params: {},
          input: {
            field: "image_urls",
            list: true,
            sha256: "b".repeat(64),
            read: async () => new Blob(["x"]),
          },
        }),
      },
    };
    h.repo.add(makeJob(JOB, object3dPlan(), { type: "object_3d" }));
    for (let i = 0; i < 4 && h.repo.peek(JOB).status !== "done"; i++) await advanceJob(JOB, h.deps);
    expect(h.mock.submits[0]?.input.image_urls).toEqual([expect.stringMatching(/^https:/)]);
    expect(h.repo.peek(JOB).status).toBe("done");
  });
});
