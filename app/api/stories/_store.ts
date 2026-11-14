import "server-only";
import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import { Asset, House, Job, Room, Story } from "@/lib/contracts";
import { db } from "@/lib/db";

const schemas = { houses: House, rooms: Room, stories: Story, assets: Asset, jobs: Job };
type Collection = keyof typeof schemas;
type Entity<K extends Collection> = z.infer<(typeof schemas)[K]>;
function offline() {
  if (process.env.STUDIO_MOCK_STORE !== "true") return false;
  if ((process.env.AI_MODE ?? "mock") !== "mock") throw new Error("Offline store disabled");
  return true;
}
function filename(collection: Collection, id: string) {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new Error("Invalid id");
  return join(process.env.STORAGE_DIR ?? "storage", "studio-mock", collection, `${id}.json`);
}
export async function getEntity<K extends Collection>(
  collection: K,
  id: string,
): Promise<Entity<K> | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  if (!offline()) return (await db[collection].findById(id)) as Entity<K> | null;
  try {
    return schemas[collection].parse(
      JSON.parse(await readFile(filename(collection, id), "utf8")),
    ) as Entity<K>;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}
export async function insertEntity<K extends Collection>(
  collection: K,
  input: Entity<K>,
): Promise<void> {
  const entity = schemas[collection].parse(input);
  if (!offline()) {
    // The raw collection still uses F4's mapping and the shared entity schema.
    const { toDoc } = await import("@/lib/db");
    await (await db[collection].raw()).insertOne(toDoc(entity));
    return;
  }
  const target = filename(collection, entity.id);
  await mkdir(join(target, ".."), { recursive: true });
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(entity), { flag: "wx", mode: 0o600 });
  try {
    await link(temporary, target);
  } finally {
    await unlink(temporary);
  }
}

export function isDuplicate(error: unknown) {
  return (
    error instanceof Error && "code" in error && (error.code === "EEXIST" || error.code === 11000)
  );
}
export async function replaceEntity<K extends Collection>(collection: K, input: Entity<K>) {
  const entity = schemas[collection].parse(input);
  if (!offline()) {
    const { toDoc } = await import("@/lib/db");
    const document = toDoc(entity);
    await (await db[collection].raw()).replaceOne({ _id: document._id }, document);
    return;
  }
  const target = filename(collection, entity.id);
  const temporary = `${target}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(entity), { mode: 0o600 });
  await rename(temporary, target);
}
