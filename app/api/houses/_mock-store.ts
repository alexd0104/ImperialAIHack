import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { link, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import { roomStyles } from "@/components/studio/room-styles";
import { type CreateHouseRequest, type CreateRoomRequest, House, Room } from "@/lib/contracts";

// Temporary Studio adapter until F4 publishes lib/db helpers. Kept explicitly
// mock-only; its files survive reloads but are not MongoDB documents or demo data.
function directory(collection: "houses" | "rooms") {
  if ((process.env.AI_MODE ?? "mock") !== "mock") throw new Error("Mock adapter disabled");
  return join(process.env.STORAGE_DIR ?? "storage", "studio-mock", collection);
}

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function creationId(request: Request): string | null {
  const key = request.headers.get("Idempotency-Key");
  return key === null ? randomUUID() : uuid.test(key) ? key.toLowerCase() : null;
}

function hasCode(error: unknown, code: string) {
  return error instanceof Error && "code" in error && error.code === code;
}

async function read<S extends z.ZodType>(collection: "houses" | "rooms", id: string, schema: S) {
  if (!uuid.test(id)) return null;
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

export async function createMockHouse(id: string, input: CreateHouseRequest) {
  const now = new Date().toISOString();
  return insert(
    "houses",
    id,
    House,
    House.parse({
      id,
      firstName: input.firstName,
      consentAt: now,
      createdAt: now,
      token: randomBytes(32).toString("base64url"),
    }),
  );
}

export async function createMockRoom(
  id: string,
  houseId: string,
  input: Extract<CreateRoomRequest, { source: "style" }>,
) {
  const preset = roomStyles[input.style];
  return insert(
    "rooms",
    id,
    Room,
    Room.parse({
      ...input,
      id,
      houseId,
      backgroundPath: preset.image,
      slots: preset.slots,
      createdAt: new Date().toISOString(),
    }),
  );
}
