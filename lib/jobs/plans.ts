import "server-only";
import type { Job, JobStep, JobType, MemorySheet, StepName } from "@/lib/contracts";
import type { NewEntity } from "@/lib/db/collections";

type PlannedStep = { name: StepName; enabled: boolean };

function toSteps(planned: PlannedStep[]): JobStep[] {
  return planned.map(({ name, enabled }) => ({
    name,
    status: enabled ? "pending" : "skipped",
    attempts: 0,
  }));
}

/**
 * TECHNICAL.md §5.1. Disabled steps stay in the list as "skipped" so the Studio
 * always shows the same chain for a scene.
 */
export function scenePlan(sheet: Pick<MemorySheet, "restore" | "colour" | "motion">): JobStep[] {
  return toSteps([
    { name: "compile", enabled: true },
    { name: "upload", enabled: true },
    { name: "restore", enabled: sheet.restore },
    { name: "colourise", enabled: sheet.colour === "colourise" },
    { name: "animate", enabled: sheet.motion === "gentle" },
    { name: "ambience", enabled: true },
    { name: "finalize", enabled: true },
  ]);
}

export function object3dPlan(): JobStep[] {
  return toSteps(
    (["upload", "cutout", "model3d", "compress", "finalize"] as const).map((name) => ({
      name,
      enabled: true,
    })),
  );
}

export function roomBackgroundPlan(): JobStep[] {
  return toSteps(
    (["upload", "room_edit", "finalize"] as const).map((name) => ({ name, enabled: true })),
  );
}

type JobRefs = Pick<Job, "houseId" | "memoryId" | "sceneId" | "storyId" | "roomId" | "assetId">;

/** A queued job ready for `db.jobs.insert` (P4 / P5 / SH1 create them). */
export function newJob(
  input: JobRefs & {
    type: JobType;
    steps: JobStep[];
    falKeyLabel: string;
    bypassCache?: boolean;
    now: string;
  },
): NewEntity<Job> {
  const { now, ...rest } = input;
  return {
    ...rest,
    current: 0,
    status: "queued",
    lockedUntil: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** The `object_3d` job of a Story made from an Object photo (P5). */
export function newObjectJob(input: {
  houseId: string;
  roomId: string;
  storyId: string;
  assetId: string;
  falKeyLabel: string;
  now: string;
}): NewEntity<Job> {
  return newJob({ ...input, type: "object_3d", steps: object3dPlan() });
}
