import "server-only";
import { getFal } from "@/lib/ai/fal";
import { jobConfig } from "./config";
import { mongoCacheRepo, mongoJobRepo } from "./repo";
import { defaultHandlers, settleJob, storeOutput } from "./steps";
import type { EngineDeps } from "./types";

/** Production wiring: MongoDB, storage/, lib/ai (mock or live by AI_MODE). */
export function defaultEngineDeps(): EngineDeps {
  return {
    jobs: mongoJobRepo,
    cache: mongoCacheRepo,
    fal: getFal,
    handlers: defaultHandlers,
    storeOutput,
    settle: settleJob,
    now: () => new Date(),
    config: jobConfig(),
  };
}
