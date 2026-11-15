import { compilePrompts } from "@/lib/ai/prompt-compiler";
import type { LabApproach, LabRun } from "@/lib/contracts/lab";
import {
  type ApproachResult,
  approachAgent,
  approachFreeText,
  approachPhotoQuestions,
  approachQuestions,
  type LabModel,
  type TestPhoto,
} from "./approaches";

export const APPROACHES: LabApproach[] = ["questions", "free_text", "photo_questions", "agent"];

export type NewLabRun = Omit<LabRun, "id">;

function runApproach(a: LabApproach, photo: TestPhoto, model: LabModel): Promise<ApproachResult> {
  switch (a) {
    case "questions":
      return Promise.resolve(approachQuestions(photo));
    case "free_text":
      return approachFreeText(photo, model);
    case "photo_questions":
      return approachPhotoQuestions(photo, model);
    case "agent":
      return approachAgent(photo, model);
  }
}

/**
 * Every approach on every photo → one run each (5 photos × 4 approaches = 20).
 * Prompts always go through the prompt compiler (AGENTS.md §3.1). `assetIds` maps a
 * photo key to its uploaded asset id; `outputs` stays empty until a live generation.
 */
export async function runExperiment(opts: {
  photos: TestPhoto[];
  model: LabModel;
  assetIds?: Record<string, string>;
  now?: () => string;
}): Promise<NewLabRun[]> {
  const now = opts.now ?? (() => new Date().toISOString());
  const runs: NewLabRun[] = [];
  for (const photo of opts.photos) {
    for (const approach of APPROACHES) {
      const { sheet, inputs } = await runApproach(approach, photo, opts.model);
      const prompts = await compilePrompts({ sheet, photoDescription: photo.script.description });
      runs.push({
        approach,
        photoAssetId: opts.assetIds?.[photo.key] ?? `lab-photo-${photo.key}`,
        inputs,
        sheet,
        prompts: { ...prompts },
        outputs: {},
        createdAt: now(),
      });
    }
  }
  return runs;
}
