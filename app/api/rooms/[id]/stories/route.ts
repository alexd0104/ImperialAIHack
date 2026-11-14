import "server-only";
import { createHash } from "node:crypto";
import { creationId } from "@/app/api/houses/_store";
import { getEntity, insertEntity, isDuplicate } from "@/app/api/stories/_store";
import { objectLibrary } from "@/components/studio/object-library";
import { CreateStoryRequest, Job, Story } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const words = copy.studio.createStory;
  const input = await parseJson(request, CreateStoryRequest);
  const id = creationId(request);
  if (!input.success || !id) return fail("validation_failed", words.invalid, 422);
  const body = input.data;
  const roomId = (await context.params).id;
  try {
    const room = await getEntity("rooms", roomId);
    if (!room) return fail("not_found", words.missingRoom);
    const existing = await getEntity("stories", id);
    if (existing) {
      const job = existing.object.jobId ? await getEntity("jobs", existing.object.jobId) : null;
      const asset =
        body.object.kind === "photo" ? await getEntity("assets", body.object.assetId) : null;
      const sameObject =
        body.object.kind === "library"
          ? !existing.object.jobId && existing.object.path === body.object.name
          : asset && job?.steps[0]?.output === asset.path;
      return existing.roomId === roomId &&
        existing.title === body.title &&
        existing.slotId === body.slotId &&
        sameObject
        ? ok(existing, 201)
        : fail("conflict", words.conflict);
    }
    if (!room.slots.some((slot) => slot.id === body.slotId && !slot.storyId))
      return fail("conflict", words.noSlot);
    const now = new Date().toISOString();
    let object: Story["object"];
    if (body.object.kind === "library") {
      const libraryName = body.object.name;
      if (!objectLibrary.some((name) => name === libraryName))
        return fail("validation_failed", words.invalid, 422);
      object = { kind: "svg", path: body.object.name };
    } else {
      if ((process.env.AI_MODE ?? "mock") !== "mock")
        return fail("upstream_failed", words.liveUnavailable, 503, false);
      const asset = await getEntity("assets", body.object.assetId);
      if (!asset || asset.houseId !== room.houseId || asset.kind !== "photo")
        return fail("validation_failed", words.wrongAsset, 422);
      const jobId = createHash("sha256").update(`${id}:object`).digest("hex").slice(0, 24);
      const job = Job.parse({
        id: jobId,
        houseId: room.houseId,
        roomId,
        storyId: id,
        type: "object_3d",
        steps: [
          { name: "upload", status: "done", output: asset.path },
          { name: "cutout", status: "pending" },
          { name: "model3d", status: "pending" },
          { name: "compress", status: "pending" },
        ],
        current: 1,
        status: "queued",
        falKeyLabel: "studio-mock",
        // This mock provider owns progression; keep P1 from processing its synthetic steps.
        lockedUntil: "9999-12-31T23:59:59.999Z",
        createdAt: now,
        updatedAt: now,
      });
      try {
        await insertEntity("jobs", job);
      } catch (error) {
        if (!isDuplicate(error)) throw error;
        const saved = await getEntity("jobs", jobId);
        if (saved?.steps[0]?.output !== asset.path) return fail("conflict", words.conflict);
      }
      object = { kind: "svg", path: "camera", jobId };
    }
    const story = Story.parse({
      id,
      roomId,
      houseId: room.houseId,
      slotId: body.slotId,
      title: body.title,
      object,
      createdAt: now,
    });
    // Provisional placement is explicitly approved; publishing in S8 reserves the Slot.
    try {
      await insertEntity("stories", story);
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      const saved = await getEntity("stories", id);
      if (
        !saved ||
        saved.title !== story.title ||
        saved.roomId !== story.roomId ||
        saved.slotId !== story.slotId ||
        saved.object.path !== story.object.path ||
        saved.object.jobId !== story.object.jobId
      )
        return fail("conflict", words.conflict);
      return ok(saved, 201);
    }
    return ok(story, 201);
  } catch {
    return fail("internal", words.error);
  }
}
