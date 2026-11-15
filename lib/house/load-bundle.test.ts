import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadHouseBundle, orNullWithin } from "./load-bundle";

const findHouseByToken = vi.fn();
vi.mock("@/lib/db", () => ({
  findHouseByToken: (t: string) => findHouseByToken(t),
  db: {},
}));

const savedBundle = {
  house: { firstName: "Rose", avatars: [] },
  mode: "together",
  rooms: [{ id: "r1", name: "Garden", background: "/rooms/garden.jpg", slots: [] }],
  files: ["/rooms/garden.jpg"],
};

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "mh-demo-"));
  await writeFile(path.join(dir, "bundle.json"), JSON.stringify(savedBundle));
  vi.stubEnv("DEMO_ASSETS_DIR", dir);
  vi.stubEnv("HOUSE_DEMO_MODE", "true");
  vi.stubEnv("DEMO_HOUSE_TOKEN", "demo-token");
  findHouseByToken.mockReset();
});
afterEach(async () => {
  vi.unstubAllEnvs();
  await rm(dir, { recursive: true, force: true });
});

describe("orNullWithin", () => {
  it("returns the result, or null when the work fails or is too slow", async () => {
    expect(await orNullWithin(async () => 1, 50)).toBe(1);
    expect(await orNullWithin(() => Promise.reject(new Error("down")), 50)).toBeNull();
    expect(await orNullWithin(() => new Promise<number>(() => {}), 20)).toBeNull();
  });
});

describe("demo House (B33)", () => {
  it("plays the saved bundle when the DB is unreachable", async () => {
    findHouseByToken.mockRejectedValue(new Error("offline"));
    const bundle = await loadHouseBundle("demo-token", "together");
    expect(bundle?.rooms.map((r) => r.name)).toEqual(["Garden"]);
  });

  it("plays the saved bundle when the demo House is not in this DB", async () => {
    findHouseByToken.mockResolvedValue(null);
    expect((await loadHouseBundle("demo-token", "together"))?.house.firstName).toBe("Rose");
  });
});
