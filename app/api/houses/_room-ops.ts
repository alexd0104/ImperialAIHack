import "server-only";
import { readFile, rm } from "node:fs/promises";
import {
  deleteEntity,
  getEntity,
  insertEntity,
  listEntities,
  updateEntity,
} from "@/app/api/stories/_store";
import { roomStyles } from "@/components/studio/room-styles";
import { cleanRoomPhoto } from "@/lib/ai/room-photo";
import { Room, type RoomBackgroundInput } from "@/lib/contracts";
import { resolveStoragePath, saveFile } from "@/lib/storage";

/** Slots of a family-photo Room: the living-room layout, the family moves Objects later. */
const photoSlots = () => roomStyles.living.slots;

/** Cleans the photo (mock: crop only) and stores it; the caller swaps it in only on success. */
async function cleanedPhoto(houseId: string, assetId: string, name: string) {
  const asset = await getEntity("assets", assetId);
  if (!asset || asset.houseId !== houseId || asset.kind !== "photo") return null;
  const source = await readFile(resolveStoragePath(asset.path));
  const bytes = await cleanRoomPhoto(source);
  return saveFile(houseId, `rooms/${name}.jpg`, bytes);
}

export async function createPhotoRoom(id: string, houseId: string, name: string, assetId: string) {
  const saved = await cleanedPhoto(houseId, assetId, id);
  if (!saved) return null;
  const room = Room.parse({
    id,
    houseId,
    name,
    source: "photo",
    backgroundPath: saved.path,
    background: { kind: "photo", assetId, path: saved.path },
    slots: photoSlots(),
    createdAt: new Date().toISOString(),
  });
  await insertEntity("rooms", room);
  return room;
}

/**
 * Rename and/or change the background. The old background stays in the Room until the new
 * one is fully ready: any failure before the final update leaves the Room untouched.
 */
export async function updateRoom(
  room: Room,
  input: { name?: string; background?: RoomBackgroundInput },
): Promise<Room | null> {
  const fields: Partial<Omit<Room, "id">> = {};
  if (input.name !== undefined) fields.name = input.name;
  const background = input.background;
  if (background?.kind === "style") {
    fields.source = "style";
    fields.style = background.style;
    fields.backgroundPath = roomStyles[background.style].image;
    fields.background = background;
  } else if (background?.kind === "photo") {
    const saved = await cleanedPhoto(room.houseId, background.assetId, `${room.id}-${Date.now()}`);
    if (!saved) return null;
    fields.source = "photo";
    fields.backgroundPath = saved.path;
    fields.background = { kind: "photo", assetId: background.assetId, path: saved.path };
  }
  fields.pendingBackground = undefined;
  const next = await updateEntity("rooms", room.id, fields);
  // The previous cleaned photo is now unreachable.
  if (next && background && room.source === "photo" && room.backgroundPath !== next.backgroundPath)
    await rm(resolveStoragePath(room.backgroundPath), { force: true });
  return next;
}

/** Deletes a Room with its Stories, Memories, Scenes, Assets and files. */
export async function deleteRoom(room: Room): Promise<void> {
  const stories = await listEntities("stories", (s) => s.roomId === room.id);
  const storyIds = new Set(stories.map((s) => s.id));
  const memories = await listEntities("memories", (m) => storyIds.has(m.storyId));
  const memoryIds = new Set(memories.map((m) => m.id));
  const scenes = await listEntities("scenes", (s) => memoryIds.has(s.memoryId));
  const assets = await listEntities("assets", (a) => !!a.memoryId && memoryIds.has(a.memoryId));
  const paths = new Set<string>();
  for (const scene of scenes) for (const p of Object.values(scene.outputs)) if (p) paths.add(p);
  for (const asset of assets) paths.add(asset.path);
  for (const story of stories) if (story.object.kind === "glb") paths.add(story.object.path);
  if (room.source === "photo") paths.add(room.backgroundPath);
  for (const scene of scenes) await deleteEntity("scenes", scene.id);
  for (const asset of assets) await deleteEntity("assets", asset.id);
  for (const memory of memories) await deleteEntity("memories", memory.id);
  for (const story of stories) await deleteEntity("stories", story.id);
  await deleteEntity("rooms", room.id);
  for (const p of paths) {
    try {
      await rm(resolveStoragePath(p), { force: true });
    } catch {
      // A bad path must not stop the cascade: the documents are already gone.
    }
  }
}
