"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { HouseDetail, RetryResponse } from "@/lib/contracts";
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
function LookOptions(props: { memoryId: string; restore: boolean; motion: "gentle" | "still" }) {
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (answers: { restore?: boolean; motion?: "gentle" | "still" }) =>
      patchMemory(props.memoryId, { answers }),
    onSettled: () => client.invalidateQueries({ queryKey: memoryKey(props.memoryId) }),
  });
  const words = copy.studio.progress;
  return (
    <Card className="space-y-4 p-5">
      <h2 className="font-display text-22">{words.optionsTitle}</h2>
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="opt-restore">{words.restore}</Label>
        <Switch
          id="opt-restore"
          checked={props.restore}
          onCheckedChange={(restore) => save.mutate({ restore })}
        />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="opt-motion">{words.motion}</Label>
          <p className="text-14 text-ink/70">{words.motionHint}</p>
        </div>
        <Switch
          id="opt-motion"
          checked={props.motion === "gentle"}
          onCheckedChange={(on) => save.mutate({ motion: on ? "gentle" : "still" })}
        />
      </div>
    </Card>
  );
}
