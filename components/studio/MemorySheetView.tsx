"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  DEFAULT_SCENE_MOTION,
  HouseDetail,
  RetryResponse,
  type SceneMotion,
  type UpdateMemoryRequest,
} from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { postStudio, requestStudio, StudioApiError } from "./api";
import { DontShowWarning } from "./DontShowWarning";
import { dontShowMatches } from "./dont-show";
import { hasVisual } from "./memory-bank";
import { fetchMemory, generateMemory, memoryKey, patchMemory } from "./memory-client";
import { sheetRows } from "./memory-sheet-rows";
import { StudioQuery } from "./StudioQuery";

const words = copy.studio.sheet;

export function MemorySheetView({ memoryId }: { memoryId: string }) {
  return (
    <StudioQuery>
      <Sheet memoryId={memoryId} />
    </StudioQuery>
  );
}

function Sheet({ memoryId }: { memoryId: string }) {
  const router = useRouter();
  const memory = useQuery({ queryKey: memoryKey(memoryId), queryFn: () => fetchMemory(memoryId) });
  const houseId = memory.data?.houseId;
  const house = useQuery({
    queryKey: ["house", houseId],
    enabled: Boolean(houseId),
    queryFn: () => requestStudio(`/api/houses/${houseId}`, HouseDetail),
  });
  // Nothing is made until the family presses the button (product rule: family approves).
  const started = (memory.data?.scenes.length ?? 0) > 0;
  // After a first run, changed answers mean new prompts: retry bypasses the cache per scene.
  const generate = useMutation({
    mutationFn: async () => {
      await generateMemory(memoryId);
      for (const scene of memory.data?.scenes ?? [])
        await postStudio(`/api/scenes/${scene.id}/retry`, {}, RetryResponse, crypto.randomUUID());
    },
    onSuccess: () => router.push(`/studio/memories/${memoryId}/review`),
  });

  if (memory.isError)
    return (
      <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
        {memory.error instanceof StudioApiError ? memory.error.message : copy.studio.memory.error}
      </p>
    );
  if (!memory.data) return null;
  const canGenerate = hasVisual(memory.data.assets);
  const mentions = dontShowMatches(
    { ...memory.data.answers, freeText: memory.data.freeText },
    house.data?.dontShow ?? [],
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-14 font-bold text-ink/70">{words.eyebrow}</p>
        <h1 className="font-display text-32 sm:text-40">{words.title}</h1>
        <p className="mt-2 max-w-2xl text-18 text-ink/70">{words.intro}</p>
      </div>

      <Card className="p-2 sm:p-4">
        <dl className="divide-y divide-ink/10">
          {sheetRows(memory.data).map((row) => (
            <div key={row.key} className="flex flex-wrap items-center gap-x-6 gap-y-1 p-3">
              <dt className="w-44 text-16 font-bold">{row.label}</dt>
              <dd className="min-w-0 flex-1 text-18">{row.value}</dd>
              <dd>
                <Link
                  href={row.href}
                  className="inline-flex min-h-12 items-center text-16 font-bold underline"
                  aria-label={`${words.change}: ${row.label}`}
                >
                  {words.change}
                </Link>
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <LookOptions
        memoryId={memoryId}
        restore={memory.data.answers.restore ?? true}
        motion={memory.data.answers.motion ?? "gentle"}
        sceneMotion={memory.data.sceneMotion ?? DEFAULT_SCENE_MOTION}
      />
      {mentions.length > 0 && <DontShowWarning mentions={mentions} />}
      {generate.isError && (
        <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
          {generate.error instanceof StudioApiError ? generate.error.message : words.generateError}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          disabled={!canGenerate || generate.isPending}
          onClick={() => {
            if (started && !window.confirm(words.regenerateConfirm)) return;
            generate.mutate();
          }}
        >
          {generate.isPending ? words.generating : started ? words.regenerate : words.generate}
        </Button>
        {!canGenerate && (
          <>
            <p className="text-16 text-ink/70">{words.noPhotos}</p>
            <Button asChild variant="secondary">
              <Link href={`/studio/memories/${memoryId}`}>{words.addPhotos}</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/** S6 options, chosen before anything is made. Memory-wide: the contract has no per-photo field yet. */
type Movement = "still" | "gentle" | "custom";

/**
 * B23: every choice is visible at once as a labelled row of big buttons, and each tap saves.
 * (Before, a "Gentle movement" switch hid the movement and length choices.)
 */
function LookOptions(props: {
  memoryId: string;
  restore: boolean;
  motion: "gentle" | "still";
  sceneMotion: SceneMotion;
}) {
  const client = useQueryClient();
  const words = copy.studio.progress;
  const motionWords = copy.studio.motion;
  const [restore, setRestore] = useState(props.restore);
  const [movement, setMovement] = useState<Movement>(
    props.motion === "still" ? "still" : props.sceneMotion.preset,
  );
  const [text, setText] = useState(props.sceneMotion.text ?? "");
  const [durationSec, setDuration] = useState<SceneMotion["durationSec"]>(
    props.sceneMotion.durationSec,
  );

  const save = useMutation({
    mutationFn: (body: UpdateMemoryRequest) => patchMemory(props.memoryId, body),
    onSettled: () => client.invalidateQueries({ queryKey: memoryKey(props.memoryId) }),
  });

  /** Writes the movement answer and the scene motion together, so they never disagree. */
  function saveMotion(next: { movement?: Movement; text?: string; durationSec?: 5 | 10 }) {
    const m = next.movement ?? movement;
    const t = (next.text ?? text).trim();
    const d = next.durationSec ?? durationSec;
    // "Describe it" with nothing typed yet behaves as gentle until the family writes something.
    const sceneMotion: SceneMotion =
      m === "custom" && t
        ? { preset: "custom", text: t, durationSec: d }
        : { preset: "gentle", durationSec: d };
    save.mutate({ answers: { motion: m === "still" ? "still" : "gentle" }, sceneMotion });
  }

  return (
    <Card className="space-y-6 p-5">
      <div className="space-y-1">
        <h2 className="font-display text-22">{words.optionsTitle}</h2>
        <p className="text-14 text-ink/70">{words.optionsIntro}</p>
      </div>

      <OptionRow label={words.repairLabel}>
        <ToggleGroup
          type="single"
          value={restore ? "yes" : "no"}
          aria-label={words.repairLabel}
          onValueChange={(value) => {
            if (!value) return;
            setRestore(value === "yes");
            save.mutate({ answers: { restore: value === "yes" } });
          }}
        >
          <ToggleGroupItem value="yes">{words.repairYes}</ToggleGroupItem>
          <ToggleGroupItem value="no">{words.repairNo}</ToggleGroupItem>
        </ToggleGroup>
      </OptionRow>

      <OptionRow
        label={words.movementLabel}
        hint={movement === "still" ? words.movementStillHint : words.movementGentleHint}
      >
        <ToggleGroup
          type="single"
          value={movement}
          aria-label={words.movementLabel}
          onValueChange={(value) => {
            if (!value) return;
            setMovement(value as Movement);
            saveMotion({ movement: value as Movement });
          }}
        >
          <ToggleGroupItem value="still">{words.movementStill}</ToggleGroupItem>
          <ToggleGroupItem value="gentle">{words.movementGentle}</ToggleGroupItem>
          <ToggleGroupItem value="custom">{words.movementCustom}</ToggleGroupItem>
        </ToggleGroup>
        {movement === "custom" && (
          <Input
            value={text}
            maxLength={200}
            placeholder={motionWords.placeholder}
            aria-label={motionWords.custom}
            onChange={(event) => setText(event.target.value)}
            onBlur={() => saveMotion({})}
          />
        )}
      </OptionRow>

      {movement !== "still" && (
        <OptionRow label={words.lengthLabel} hint={motionWords.hintBefore}>
          <ToggleGroup
            type="single"
            value={String(durationSec)}
            aria-label={words.lengthLabel}
            onValueChange={(value) => {
              if (!value) return;
              const d = value === "10" ? 10 : 5;
              setDuration(d);
              saveMotion({ durationSec: d });
            }}
          >
            <ToggleGroupItem value="5">{motionWords.seconds5}</ToggleGroupItem>
            <ToggleGroupItem value="10">{motionWords.seconds10}</ToggleGroupItem>
          </ToggleGroup>
        </OptionRow>
      )}

      <p aria-live="polite" className="min-h-5 text-14 text-ink/70">
        {save.isPending
          ? words.saving
          : save.isError
            ? motionWords.error
            : save.isSuccess
              ? words.saved
              : ""}
      </p>
    </Card>
  );
}

function OptionRow(props: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-16 font-bold">{props.label}</p>
      <div className="flex flex-wrap items-center gap-3">{props.children}</div>
      {props.hint && <p className="text-14 text-ink/70">{props.hint}</p>}
    </div>
  );
}
