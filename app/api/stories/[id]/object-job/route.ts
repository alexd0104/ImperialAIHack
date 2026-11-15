import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getEntity, replaceEntity, updateEntity } from "@/app/api/stories/_store";
import { JobView } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok } from "@/lib/http";
import { advanceJob, defaultEngineDeps } from "@/lib/jobs";
import { saveFile } from "@/lib/storage";

// P5: real object_3d jobs are advanced by lib/jobs (cutout → Rodin → compress; the
// Story keeps its library object on failure). Jobs labelled "studio-mock" come from
// the offline file store (STUDIO_MOCK_STORE), which has no engine: they keep S2's
// synthetic progress with a sample GLB and never claim to reproduce the photo.
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const words = copy.studio.createStory;
  try {
    const story = await getEntity("stories", (await context.params).id);
    const job = story?.object.jobId ? await getEntity("jobs", story.object.jobId) : null;
    if (!story || !job || job.type !== "object_3d" || job.storyId !== story.id)
      return fail("not_found", words.error);
    if (job.falKeyLabel !== "studio-mock") {
      const advanced = await advanceJob(job.id, defaultEngineDeps());
      return ok(JobView.parse(advanced.job ?? job));
    }
    if (job.status === "done" || job.status === "fallback" || job.status === "failed")
      return ok(JobView.parse(job));
    if ((process.env.AI_MODE ?? "mock") !== "mock" || job.falKeyLabel !== "studio-mock")
      return fail("upstream_failed", words.liveUnavailable, 503, false);
    const elapsed = Date.now() - Date.parse(job.createdAt);
    const stage = Math.min(3, 1 + Math.floor(Math.max(0, elapsed) / 1000));
    const complete = elapsed >= 3000;
    const steps = job.steps.map((step, index) => ({
      ...step,
      status:
        complete || index < stage
          ? ("done" as const)
          : index === stage
            ? ("running" as const)
            : ("pending" as const),
    }));
    if (!complete) return ok(JobView.parse({ ...job, status: "running", current: stage, steps }));
    let fallback = false;
    const rate = Number(process.env.MOCK_FAIL_RATE ?? "0.1");
    try {
      if (parseInt(job.id.slice(0, 4), 16) / 65536 < rate) throw new Error("Synthetic failure");
      const bytes = await readFile(join(process.cwd(), "mocks/media/object.glb"));
      const saved = await saveFile(story.houseId, `objects/${job.id}.glb`, bytes);
      story.object = { kind: "glb", path: saved.path, jobId: job.id };
    } catch {
      fallback = true;
      story.object = { kind: "svg", path: "camera", jobId: job.id };
    }
    await updateEntity("stories", story.id, { object: story.object });
    const finished = {
      ...job,
      status: fallback ? ("fallback" as const) : ("done" as const),
      current: 3,
      steps: steps.map((step, index) => ({
        ...step,
        status: fallback && index > 0 ? ("failed" as const) : step.status,
      })),
      updatedAt: new Date().toISOString(),
    };
    await replaceEntity("jobs", finished);
    return ok(JobView.parse(finished));
  } catch {
    return fail("internal", words.error);
  }
}
