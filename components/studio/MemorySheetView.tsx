"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HouseDetail } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { requestStudio, StudioApiError } from "./api";
import { DontShowWarning } from "./DontShowWarning";
import { dontShowMatches } from "./dont-show";
import { hasVisual } from "./memory-bank";
import { fetchMemory, generateMemory, memoryKey } from "./memory-client";
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
  const generate = useMutation({
    mutationFn: () => generateMemory(memoryId),
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
          onClick={() => generate.mutate()}
        >
          {generate.isPending ? words.generating : words.generate}
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
