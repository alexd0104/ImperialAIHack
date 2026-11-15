import "server-only";
import { randomUUID } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import { House, Room } from "@/lib/contracts";

// Explicit offline test adapter. Normal Studio requests use F4's MongoDB helpers;
// these files survive test-server reloads but are not MongoDB or demo documents.
function directory(collection: "houses" | "rooms") {
  if ((process.env.AI_MODE ?? "mock") !== "mock") throw new Error("Mock adapter disabled");
  return join(process.env.STORAGE_DIR ?? "storage", "studio-mock", collection);
}

const entityId = /^[a-f0-9]{24}$/i;

function hasCode(error: unknown, code: string) {
  return error instanceof Error && "code" in error && error.code === code;
}

async function read<S extends z.ZodType>(collection: "houses" | "rooms", id: string, schema: S) {
  if (!entityId.test(id)) return null;
  try {
    return schema.parse(
      JSON.parse(await readFile(join(directory(collection), `${id}.json`), "utf8")),
    );
  } catch (error) {
    if (hasCode(error, "ENOENT")) return null;
    throw error;
  }
}

async function insert<S extends z.ZodType>(
  collection: "houses" | "rooms",
  id: string,
  schema: S,
  value: z.infer<S>,
): Promise<z.infer<S>> {
  const folder = directory(collection);
  await mkdir(folder, { recursive: true });
  const temporary = join(folder, `${randomUUID()}.tmp`);
  await writeFile(temporary, JSON.stringify(schema.parse(value)), { flag: "wx", mode: 0o600 });
  try {
    // An atomic link prevents duplicate submissions from observing half a JSON file.
    await link(temporary, join(folder, `${id}.json`));
    return value;
  } catch (error) {
    if (!hasCode(error, "EEXIST")) throw error;
    const existing = await read(collection, id, schema);
    if (!existing) throw error;
    return existing;
  } finally {
    await unlink(temporary);
  }
}

export const findMockHouse = (id: string) => read("houses", id, House);

export const insertMockHouse = (house: House) => insert("houses", house.id, House, house);
export const insertMockRoom = (room: Room) => insert("rooms", room.id, Room, room);

export async function updateMockHouse(id: string, fields: Partial<Omit<House, "id">>) {
  const house = await findMockHouse(id);
  if (!house) return null;
  const next = House.parse({ ...house, ...fields });
  await writeFile(join(directory("houses"), `${id}.json`), JSON.stringify(next), { mode: 0o600 });
  return next;
}

export async function deleteMockHouse(id: string) {
  if (!entityId.test(id)) return false;
  try {
    await unlink(join(directory("houses"), `${id}.json`));
    return true;
  } catch (error) {
    if (hasCode(error, "ENOENT")) return false;
    throw error;
  }
}
