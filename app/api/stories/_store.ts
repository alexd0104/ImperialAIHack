import "server-only";
import { randomUUID } from "node:crypto";
import { link, mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import { Asset, House, Job, Memory, Room, Scene, Story } from "@/lib/contracts";
import { db, type TypedCollection } from "@/lib/db";

const schemas = {
  houses: House,
  rooms: Room,
  stories: Story,
  assets: Asset,
  jobs: Job,
  memories: Memory,
  scenes: Scene,
};
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

export async function updateEntity<K extends Collection>(
  collection: K,
  id: string,
  fields: Partial<Omit<Entity<K>, "id">>,
) {
  if (!offline()) {
    const table = db[collection] as TypedCollection<Entity<K>>;
    return table.update(id, fields);
  }
  const current = await getEntity(collection, id);
  if (!current) return null;
  const next = schemas[collection].parse({ ...current, ...fields }) as Entity<K>;
  await replaceEntity(collection, next);
  return next;
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

/** Every entity of a collection matching a predicate, oldest first. */
export async function listEntities<K extends Collection>(
  collection: K,
  match: (entity: Entity<K>) => boolean,
): Promise<Entity<K>[]> {
  let all: Entity<K>[];
  if (!offline()) {
    all = (await db[collection].find({}, { sort: { createdAt: 1 } })) as Entity<K>[];
  } else {
    const directory = join(process.env.STORAGE_DIR ?? "storage", "studio-mock", collection);
    const names = await readdir(directory).catch(() => [] as string[]);
    all = [];
    for (const name of names) {
      if (!name.endsWith(".json")) continue;
      const entity = await getEntity(collection, name.slice(0, -5));
      if (entity) all.push(entity);
    }
    all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return all.filter(match);
}

export async function deleteEntity(collection: Collection, id: string): Promise<boolean> {
  if (!/^[a-f0-9]{24}$/.test(id)) return false;
  if (!offline()) return db[collection].deleteById(id);
  try {
    await unlink(filename(collection, id));
    return true;
  } catch {
    return false;
  }
}
