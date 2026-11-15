"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StepProgress } from "@/components/ui/step-progress";
import {
  JobView,
  RetryResponse,
  Scene,
  type SceneChoiceRequest,
  type SceneView,
} from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { estimateMinutes } from "@/lib/job-estimates";
import { cn } from "@/lib/utils";
import { postStudio, requestStudio, StudioApiError } from "./api";
import { MemoryPreview } from "./MemoryPreview";
import { MotionPicker } from "./MotionPicker";
import { fetchMemory, memoryKey } from "./memory-client";
import { StudioQuery } from "./StudioQuery";

const words = copy.studio.approve;
const progress = copy.studio.progress;
const POLL_MS = 2000;
const working = (scene: SceneView) => scene.status === "pending" || scene.status === "generating";
/** Nothing usable came back: the family can only keep the original photo or try again. */
const isFallback = (scene: SceneView) =>
  scene.status === "fallback" ||
  scene.status === "failed" ||
  !(scene.urls.colourised ?? scene.urls.restored ?? scene.originalUrl);
const keptOriginal = (scene: SceneView) => Boolean(scene.choice && !scene.choice.restored);

type ScenePick = Pick<SceneChoiceRequest, "use" | "colour">;
/** What the family sees first: their saved choice, else colour and movement when available. */
const defaultPick = (scene: SceneView): ScenePick => ({
  colour: scene.choice?.colour ?? (scene.urls.colourised ? "colour" : "bw"),
  use: scene.choice?.use ?? (scene.urls.clip ? "animated" : "still"),
});
/** The one main action saves this for every scene; "keep original" is saved on its own. */
const finalChoice = (scene: SceneView, pick: ScenePick): SceneChoiceRequest | null => {
  // A failed scene can only be tried again (the route refuses a choice); publishing waits for it.
  if (keptOriginal(scene) || scene.status === "failed") return null;
  if (isFallback(scene)) return { use: "still", colour: "bw", restored: false };
  return { ...pick, restored: true };
};

export function ReviewMemory({ memoryId }: { memoryId: string }) {
  return (
    <StudioQuery>
      <Review memoryId={memoryId} />
    </StudioQuery>
  );
}

function Review({ memoryId }: { memoryId: string }) {
  const router = useRouter();
  const client = useQueryClient();
  const [picks, setPicks] = useState<Record<string, ScenePick>>({});
  const memory = useQuery({
    queryKey: memoryKey(memoryId),
    queryFn: () => fetchMemory(memoryId),
    // Poll only while something is still being made.
    refetchInterval: (query) => (query.state.data?.scenes.some(working) ? POLL_MS : false),
  });
  const keepAll = useMutation({
    mutationFn: async (scenes: SceneView[]) => {
      // One by one, each with its own idempotency key: the store writes one scene at a time.
      for (const scene of scenes) {
        const choice = finalChoice(scene, picks[scene.id] ?? defaultPick(scene));
        if (choice)
          await postStudio(`/api/scenes/${scene.id}/choice`, choice, Scene, crypto.randomUUID());
      }
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: memoryKey(memoryId) });
      if (memory.data) router.push(`/studio/stories/${memory.data.storyId}/place`);
    },
  });
  if (memory.isError)
    return (
      <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
        {words.loadError}
      </p>
    );
  if (!memory.data) return null;
  const scenes = [...memory.data.scenes].sort((a, b) => a.order - b.order);
  const anyWorking = scenes.some(working);
  const canContinue = scenes.length > 0 && !anyWorking;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-14 font-bold text-ink/70">
          {anyWorking ? progress.eyebrow : words.eyebrow}
        </p>
        <h1 className="font-display text-32 sm:text-40">
          {anyWorking ? progress.title : words.title}
        </h1>
        <p className="mt-2 max-w-2xl text-18 text-ink/70">
          {anyWorking ? progress.intro : words.intro}
        </p>
      </div>
      {scenes.length === 0 && <p className="text-16 text-ink/70">{progress.waiting}</p>}
      <ol className="space-y-6">
        {scenes.map((scene, index) => (
          <li key={scene.id}>
            {working(scene) ? (
              <SceneProgress scene={scene} index={index} />
            ) : (
              <SceneApproval
                scene={scene}
                index={index}
                memoryId={memoryId}
                pick={picks[scene.id] ?? defaultPick(scene)}
                onPick={(pick) => setPicks((all) => ({ ...all, [scene.id]: pick }))}
              />
            )}
          </li>
        ))}
      </ol>
      {keepAll.isError && (
        <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
          {errorText(keepAll.error)}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          disabled={!canContinue || keepAll.isPending}
          onClick={() => keepAll.mutate(scenes)}
        >
          {keepAll.isPending ? words.saving : words.keepAndContinue}
        </Button>
        <MemoryPreview memory={memory.data} />
        {anyWorking && (
          <p role="status" className="text-16 text-ink/70">
            {progress.waiting}
          </p>
        )}
      </div>
    </div>
  );
}

/** S6: the original photo zooms slowly while the live step name updates. */
function SceneProgress({ scene, index }: { scene: SceneView; index: number }) {
  const job = useQuery({
    queryKey: ["job", scene.jobId],
    enabled: Boolean(scene.jobId),
    queryFn: () => requestStudio(`/api/jobs/${scene.jobId}`, JobView),
    refetchInterval: POLL_MS,
  });
  const [zoom, setZoom] = useState(false);
  useEffect(() => setZoom(true), []);
  const step = job.data?.steps[job.data.current];
  const done = job.data?.steps.filter((item) => item.status === "done").length ?? 0;
  const total = job.data?.steps.length ?? 1;
  const minutes = job.data ? estimateMinutes(job.data.steps) : null;
  return (
    <Card className="grid gap-4 p-5 sm:grid-cols-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink/5">
        {scene.originalUrl && (
          // biome-ignore lint/performance/noImgElement: family uploads are served from /api/files.
          <img
            src={scene.originalUrl}
            alt=""
            className={cn(
              "h-full w-full object-cover transition-transform duration-[20000ms] ease-out motion-reduce:transition-none",
              zoom && "scale-110",
            )}
          />
        )}
      </div>
      <div className="flex flex-col justify-center gap-3">
        <p className="text-14 font-bold text-ink/70">{`${words.scene} ${index + 1}`}</p>
        <StepProgress
          stepLabel={step ? progress.steps[step.name] : progress.waiting}
          done={done}
          total={total}
          estimate={minutes ? progress.aboutMinutes(minutes) : undefined}
        />
      </div>
    </Card>
  );
}

/** S7: compare, pick colour and movement, approve, try again or keep the original photo. */
function SceneApproval({
  scene,
  index,
  memoryId,
  pick,
  onPick,
}: {
  scene: SceneView;
  index: number;
  memoryId: string;
  pick: ScenePick;
  onPick: (pick: ScenePick) => void;
}) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: memoryKey(memoryId) });
  const hasColour = Boolean(scene.urls.colourised);
  const hasClip = Boolean(scene.urls.clip);
  const { colour, use } = pick;
  const setColour = (value: ScenePick["colour"]) => onPick({ ...pick, colour: value });
  const setUse = (value: ScenePick["use"]) => onPick({ ...pick, use: value });
  const [split, setSplit] = useState(50);

  const choose = useMutation({
    mutationFn: (choice: SceneChoiceRequest) =>
      postStudio(`/api/scenes/${scene.id}/choice`, choice, Scene, crypto.randomUUID()),
    onSuccess: refresh,
  });
  const retry = useMutation({
    mutationFn: () =>
      postStudio(`/api/scenes/${scene.id}/retry`, {}, RetryResponse, crypto.randomUUID()),
    onSuccess: refresh,
  });

  const after =
    colour === "colour" && scene.urls.colourised
      ? scene.urls.colourised
      : (scene.urls.restored ?? scene.originalUrl);
  const fallback = isFallback(scene);
  const error = choose.error ?? retry.error;
  const kept = keptOriginal(scene);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-14 font-bold text-ink/70">{`${words.scene} ${index + 1}`}</p>
        {scene.choice && (
          <span className="flex items-center gap-2 text-16 font-bold text-success-strong">
            <Check aria-hidden className="size-5" />
            {kept ? words.keptOriginal : words.approved}
          </span>
        )}
      </div>

      {fallback ? (
        <>
          {scene.originalUrl && (
            // biome-ignore lint/performance/noImgElement: family uploads are served from /api/files.
            <img
              src={scene.originalUrl}
              alt=""
              className="max-h-96 w-full rounded-xl object-contain"
            />
          )}
          <p className="rounded-lg bg-warning-surface p-4 text-16">{words.fallbackNote}</p>
        </>
      ) : use === "animated" && scene.urls.clip ? (
        // The clip carries its muxed ambience: started by the family's click, with volume controls.
        // biome-ignore lint/a11y/useMediaCaption: ambience clip, no speech to caption.
        <video
          src={scene.urls.clip}
          controls
          loop
          playsInline
          className="max-h-96 w-full rounded-xl object-contain"
        />
      ) : (
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-ink/5">
          {/* Before/after: the original sits under the result, revealed up to the slider. */}
          {/* biome-ignore lint/performance/noImgElement: generated outputs are served from /api/files. */}
          <img
            src={after}
            alt={words.after}
            className="absolute inset-0 h-full w-full object-contain"
          />
          {scene.originalUrl && (
            // biome-ignore lint/performance/noImgElement: family uploads are served from /api/files.
            <img
              src={scene.originalUrl}
              alt={words.before}
              className="absolute inset-0 h-full w-full object-contain"
              style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
            />
          )}
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            aria-label={words.slider}
            onChange={(event) => setSplit(Number(event.target.value))}
            className="absolute inset-x-4 bottom-4 accent-primary-strong"
          />
        </div>
      )}

      {/* A still has its ambience as a separate file: let the family hear it. */}
      {!(use === "animated" && scene.urls.clip) && scene.urls.ambience && (
        // biome-ignore lint/a11y/useMediaCaption: ambience has no speech to caption.
        <audio src={scene.urls.ambience} controls loop className="w-full" />
      )}

      {!fallback && (
        <div className="flex flex-wrap gap-6">
          {hasColour && (
            <Choice
              legend={words.colourLegend}
              value={colour}
              options={[
                ["bw", words.bw],
                ["colour", words.colour],
              ]}
              onChange={setColour}
            />
          )}
          {hasClip && (
            <Choice
              legend={words.motionLegend}
              value={use}
              options={[
                ["animated", words.animated],
                ["still", words.still],
              ]}
              onChange={setUse}
            />
          )}
        </div>
      )}

      <MotionPicker scene={scene} onSaved={refresh} />

      {error && (
        <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
          {errorText(error)}
        </p>
      )}
      {/* The main "Keep and continue" sits under all scenes; here only the alternatives. */}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={retry.isPending}
          onClick={() => retry.mutate()}
        >
          <RotateCcw aria-hidden />
          {retry.isPending ? words.trying : words.tryAgain}
        </Button>
        {kept && !fallback ? (
          <Button
            type="button"
            variant="secondary"
            disabled={choose.isPending}
            onClick={() => choose.mutate({ use, colour, restored: true })}
          >
            {words.useNew}
          </Button>
        ) : (
          !kept && (
            <Button
              type="button"
              variant="secondary"
              disabled={choose.isPending}
              onClick={() => choose.mutate({ use: "still", colour: "bw", restored: false })}
            >
              {words.keepOriginal}
            </Button>
          )
        )}
      </div>
    </Card>
  );
}

function errorText(error: unknown) {
  if (error instanceof StudioApiError)
    return error.code === "rate_limited" ? words.rateLimited : error.message;
  return words.error;
}

function Choice<T extends string>(props: {
  legend: string;
  value: T;
  options: [T, string][];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-16 font-bold">{props.legend}</legend>
      <div className="flex flex-wrap gap-2">
        {props.options.map(([value, label]) => (
          <label
            key={value}
            className={cn(
              "flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-surface px-5 text-16 font-bold",
              props.value === value && "border-primary-strong",
            )}
          >
            <input
              type="radio"
              className="accent-primary-strong"
              checked={props.value === value}
              onChange={() => props.onChange(value)}
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
