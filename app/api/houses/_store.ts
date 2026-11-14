import "server-only";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { roomStyles } from "@/components/studio/room-styles";
import { type CreateHouseRequest, type CreateRoomRequest, House, Room } from "@/lib/contracts";
import { db, type TypedCollection } from "@/lib/db";
import { findMockHouse, insertMockHouse, insertMockRoom } from "./_mock-store";

function isMockStoreEnabled() {
  if (process.env.STUDIO_MOCK_STORE !== "true") return false;
  if ((process.env.AI_MODE ?? "mock") !== "mock") throw new Error("Mock adapter disabled");
  return true;
}

export function creationId(request: Request): string | null {
  const key = request.headers.get("Idempotency-Key");
  if (key !== null && !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(key))
    return null;
  // Keep retry ids compatible with F4's ObjectId mapping, without storing an
  // additional request field in the shared entity contracts.
  return createHash("sha256")
    .update((key ?? randomUUID()).toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

async function insertOnce<T extends { id: string }>(
  collection: TypedCollection<T>,
  entity: T,
): Promise<T> {
  try {
    return await collection.insert(entity);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === 11000)) throw error;
    const existing = await collection.findById(entity.id);
    if (!existing) throw error;
    return existing;
  }
}

export async function findHouse(id: string) {
  return isMockStoreEnabled() ? findMockHouse(id) : db.houses.findById(id);
}

export async function createHouse(id: string, input: CreateHouseRequest) {
  const now = new Date().toISOString();
  const house = House.parse({
    id,
    firstName: input.firstName,
    consentAt: now,
    createdAt: now,
    token: randomBytes(32).toString("base64url"),
  });
  return isMockStoreEnabled() ? insertMockHouse(house) : insertOnce(db.houses, house);
}

export async function createRoom(
  id: string,
  houseId: string,
  input: Extract<CreateRoomRequest, { source: "style" }>,
) {
  const preset = roomStyles[input.style];
  const room = Room.parse({
    ...input,
    id,
    houseId,
    backgroundPath: preset.image,
    slots: preset.slots,
    createdAt: new Date().toISOString(),
  });
  return isMockStoreEnabled() ? insertMockRoom(room) : insertOnce(db.rooms, room);
}
