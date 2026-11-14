import "server-only";
import type { FeedbackResponse, House, HouseDetail, UpdateHouseRequest } from "@/lib/contracts";
import { db, deleteHouseDocuments } from "@/lib/db";
import { deleteHouseFolder } from "@/lib/storage";
import { deleteMockHouse, updateMockHouse } from "./_mock-store";

export { findHouse } from "./_store";

// Same switch as _store.ts: the offline adapter only holds Houses and Rooms.
function mockStore() {
  return process.env.STUDIO_MOCK_STORE === "true" && (process.env.AI_MODE ?? "mock") === "mock";
}

/** The House as the Studio sees it. The private token never leaves through here. */
export async function houseDetail(house: House): Promise<HouseDetail> {
  const { token: _token, ...rest } = house;
  if (mockStore()) return { ...rest, rooms: [], stories: [] };
  const [rooms, stories, memories] = await Promise.all([
    db.rooms.find({ houseId: house.id }),
    db.stories.find({ houseId: house.id }),
    db.memories.find({ houseId: house.id }),
  ]);
  return {
    ...rest,
    rooms,
    stories: stories.map((story) => ({
      id: story.id,
      roomId: story.roomId,
      slotId: story.slotId,
      title: story.title,
      publishedAt: story.publishedAt,
      memoryCount: memories.filter((memory) => memory.storyId === story.id).length,
    })),
  };
}

export async function updateHouse(id: string, input: UpdateHouseRequest) {
  const fields: Partial<Omit<House, "id">> = {
    ...(input.firstName !== undefined ? { firstName: input.firstName } : {}),
    ...(input.dontShow !== undefined
      ? { dontShow: [...new Set(input.dontShow.map((word) => word.trim()).filter(Boolean))] }
      : {}),
    updatedAt: new Date().toISOString(),
  };
  return mockStore() ? updateMockHouse(id, fields) : db.houses.update(id, fields);
}

/** GDPR cascade: documents first, then the files, so nothing stays reachable. */
export async function deleteHouse(id: string) {
  if (mockStore()) return deleteMockHouse(id);
  await deleteHouseDocuments(id);
  await deleteHouseFolder(id);
  return true;
}

export async function houseFeedback(houseId: string): Promise<FeedbackResponse> {
  if (mockStore()) return { views: 0, hearts: 0, perMemory: [] };
  const [events, memories] = await Promise.all([
    db.events.find({ houseId }),
    db.memories.find({ houseId }),
  ]);
  const perMemory = memories.map((memory) => {
    const own = events.filter((event) => event.memoryId === memory.id);
    const hearts = own.filter((event) => event.type === "heart");
    return {
      memoryId: memory.id,
      title: memory.title,
      views: own.filter((event) => event.type === "view_started").length,
      hearts: hearts.length,
      lastHeartAt: hearts
        .map((event) => event.at)
        .sort()
        .at(-1),
    };
  });
  return {
    views: perMemory.reduce((sum, item) => sum + item.views, 0),
    hearts: perMemory.reduce((sum, item) => sum + item.hearts, 0),
    perMemory,
  };
}
