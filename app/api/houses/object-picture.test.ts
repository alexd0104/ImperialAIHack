import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Asset, Job, Story } from "@/lib/contracts";

vi.mock("server-only", () => ({}));

import { insertEntity } from "@/app/api/stories/_store";
import { objectPicture } from "./_house-ops";

const hex = (n: number) => n.toString(16).padStart(24, "0");
const now = new Date().toISOString();
let directory: string;

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "memorai-b27-"));
  vi.stubEnv("STORAGE_DIR", directory);
  vi.stubEnv("AI_MODE", "mock");
  vi.stubEnv("STUDIO_MOCK_STORE", "true");
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(directory, { recursive: true, force: true });
});

const story = (object: Story["object"]) =>
  Story.parse({
    id: hex(30),
    houseId: hex(1),
    roomId: hex(2),
    slotId: "shelf",
    title: "Teapot",
    object,
    memoryOrder: [],
    createdAt: now,
  });

describe("objectPicture (B27)", () => {
  it("uses the thumbnail of a library 3D Object", async () => {
    expect(await objectPicture(story({ kind: "glb", path: "/objects/glb/teapot.glb" }))).toBe(
      "/objects/thumbs/teapot.png",
    );
  });

  it("uses the SVG of a library 2D Object", async () => {
    expect(await objectPicture(story({ kind: "svg", path: "radio" }))).toBe("/objects/radio.svg");
  });

  it("uses the family photo a 3D Object was made from", async () => {
    await insertEntity(
      "assets",
      Asset.parse({
        id: hex(40),
        houseId: hex(1),
        kind: "photo",
        path: `${hex(1)}/objects/radio.jpg`,
        mime: "image/jpeg",
        bytes: 10,
        sha256: "a".repeat(64),
        createdAt: now,
      }),
    );
    await insertEntity(
      "jobs",
      Job.parse({
        id: hex(41),
        type: "object_3d",
        houseId: hex(1),
        assetId: hex(40),
        steps: [{ name: "cutout", status: "done" }],
        current: 1,
        status: "done",
        falKeyLabel: "dev",
        createdAt: now,
        updatedAt: now,
      }),
    );
    const picture = await objectPicture(
      story({ kind: "glb", path: `${hex(1)}/${hex(41)}/model3d.glb`, jobId: hex(41) }),
    );
    expect(picture).toBe(`/api/files/${hex(1)}/objects/radio.jpg`);
  });

  it("has no picture for a 3D Object without a source photo", async () => {
    expect(await objectPicture(story({ kind: "glb", path: "x/y/model3d.glb" }))).toBeUndefined();
  });
});
