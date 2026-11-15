import "server-only";
import type {
  FeedbackResponse,
  House,
  HouseDetail,
  Story,
  UpdateHouseRequest,
} from "@/lib/contracts";
import { db, deleteHouseDocuments } from "@/lib/db";
import { deleteHouseFolder } from "@/lib/storage";
import { getEntity, listEntities } from "../stories/_store";
import { deleteMockHouse, updateMockHouse } from "./_mock-store";

export { findHouse } from "./_store";

// Same switch as _store.ts.
function mockStore() {
  return process.env.STUDIO_MOCK_STORE === "true" && (process.env.AI_MODE ?? "mock") === "mock";
}

/** The House as the Studio sees it. The private token never leaves through here. */
export async function houseDetail(house: House): Promise<HouseDetail> {
  const { token: _token, ...rest } = house;
  const mine = (item: { houseId: string }) => item.houseId === house.id;
  // Offline, Rooms/Stories/Memories live in the same studio-mock folders as the S2 entity store,
  // so the Studio Room picker works without MongoDB too (B18).
  const [rooms, stories, memories] = mockStore()
    ? await Promise.all([
        listEntities("rooms", mine),
        listEntities("stories", mine),
        listEntities("memories", mine),
      ])
    : await Promise.all([
        db.rooms.find({ houseId: house.id }),
        db.stories.find({ houseId: house.id }),
        db.memories.find({ houseId: house.id }),
      ]);
  return {
    ...rest,
    rooms,
    stories: await Promise.all(
      stories.map(async (story) => ({
        id: story.id,
        roomId: story.roomId,
        slotId: story.slotId,
        title: story.title,
        publishedAt: story.publishedAt,
        memoryCount: memories.filter((memory) => memory.storyId === story.id).length,
        objectUrl: await objectPicture(story),
      })),
    ),
  };
}

/**
 * A flat picture of the Story's Object for Studio lists (a GLB can't be an <img>): the SVG,
 * the thumbnail of a library 3D Object, or the family's own photo the 3D Object was made from.
 */
export async function objectPicture(story: Story): Promise<string | undefined> {
  const { kind, path, jobId } = story.object;
  if (kind === "svg") return `/objects/${path}.svg`;
  const library = path.match(/^\/objects\/glb\/([a-z0-9-]+)\.glb$/);
  if (library) return `/objects/thumbs/${library[1]}.png`;
  try {
    const job = jobId ? await getEntity("jobs", jobId) : null;
    const asset = job?.assetId ? await getEntity("assets", job.assetId) : null;
    return asset ? `/api/files/${asset.path}` : undefined;
  } catch {
    // No picture is fine: the Studio shows a cube icon instead.
    return undefined;
  }
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
