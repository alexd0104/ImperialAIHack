"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { HouseDetail, Room, Story } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { postStudio, requestStudio, StudioApiError } from "./api";
import { DontShowWarning } from "./DontShowWarning";
import { dontShowMatches } from "./dont-show";
import { fetchMemory, memoryKey, patchMemory } from "./memory-client";
import { StudioQuery } from "./StudioQuery";

const words = copy.studio.place;

export function PlaceStory({ storyId }: { storyId: string }) {
  return (
    <StudioQuery>
      <Place storyId={storyId} />
    </StudioQuery>
  );
}

function Place({ storyId }: { storyId: string }) {
  const client = useQueryClient();
  const storyKey = ["story", storyId];
  const story = useQuery({
    queryKey: storyKey,
    queryFn: () => requestStudio(`/api/stories/${storyId}`, Story),
  });
  const roomId = story.data?.roomId;
  const houseId = story.data?.houseId;
  const room = useQuery({
    queryKey: ["room", roomId],
    enabled: Boolean(roomId),
    queryFn: () => requestStudio(`/api/rooms/${roomId}`, Room),
  });
  const house = useQuery({
    queryKey: ["house", houseId],
    enabled: Boolean(houseId),
    queryFn: () => requestStudio(`/api/houses/${houseId}`, HouseDetail),
  });
  const memories = useQueries({
    queries: (story.data?.memoryOrder ?? []).map((id) => ({
      queryKey: memoryKey(id),
      queryFn: () => fetchMemory(id),
    })),
  });

  const patchStory = useMutation({
    mutationFn: (body: { slotId?: string; memoryOrder?: string[] }) =>
      requestStudio(`/api/stories/${storyId}`, Story, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    onSuccess: (next) => client.setQueryData(storyKey, next),
  });
  const alone = useMutation({
    mutationFn: ({ id, okAlone }: { id: string; okAlone: boolean }) => patchMemory(id, { okAlone }),
    onSettled: (_data, _error, { id }) => client.invalidateQueries({ queryKey: memoryKey(id) }),
  });
  const publish = useMutation({
    mutationFn: () => postStudio(`/api/stories/${storyId}/publish`, {}, Story, crypto.randomUUID()),
  });

  if (story.isError || room.isError)
    return (
      <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
        {words.loadError}
      </p>
    );
  if (!story.data || !room.data) return null;

  const name = house.data?.firstName ?? "";
  const order = story.data.memoryOrder;
  const loaded = memories.map((query) => query.data).filter((memory) => memory !== undefined);
  const pending = loaded.some(
    (memory) => memory.scenes.length === 0 || memory.scenes.some((scene) => !scene.choice),
  );
  const mentions = [
    ...new Set(
      loaded.flatMap((memory) =>
        dontShowMatches(
          { ...memory.answers, freeText: memory.freeText },
          house.data?.dontShow ?? [],
        ),
      ),
    ),
  ];
  const move = (index: number, by: -1 | 1) => {
    const next = [...order];
    const [item] = next.splice(index, 1);
    if (item === undefined) return;
    next.splice(index + by, 0, item);
    patchStory.mutate({ memoryOrder: next });
  };

  if (publish.isSuccess)
    return (
      <Card className="mx-auto flex max-w-lg flex-col items-center gap-4 p-6 text-center">
        <Check aria-hidden className="size-10 text-success-strong" />
        <h1 className="font-display text-32">{words.sentTitle}</h1>
        <p className="text-18">{words.sentBody.replace("{name}", name)}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={`/studio?house=${story.data.houseId}`}>{words.backToHouse}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/studio/stories/new?roomId=${story.data.roomId}`}>{words.another}</Link>
          </Button>
        </div>
      </Card>
    );

  const published = Boolean(story.data.publishedAt);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-14 font-bold text-ink/70">{words.eyebrow}</p>
        <h1 className="font-display text-32 sm:text-40">{story.data.title}</h1>
        <p className="mt-2 max-w-2xl text-18 text-ink/70">{words.intro}</p>
      </div>

      <Card className="space-y-3 p-5">
        <h2 className="font-display text-22">{words.slotLegend}</h2>
        {/* Slots sit where they will in the Room (normalised 0..1 on 1194×834); once published they never move. */}
        <div className="relative aspect-[1194/834] w-full overflow-hidden rounded-xl bg-ink/5">
          {/* biome-ignore lint/performance/noImgElement: Room picture from /rooms or /api/files, not optimised by Next. */}
          <img
            src={
              room.data.backgroundPath.startsWith("/")
                ? room.data.backgroundPath
                : `/api/files/${room.data.backgroundPath}`
            }
            alt=""
            draggable={false}
            className="absolute inset-0 size-full object-cover"
          />
          {room.data.slots.map((slot, index) => {
            const chosen = slot.id === story.data?.slotId;
            const taken = Boolean(slot.storyId && slot.storyId !== storyId);
            return (
              <button
                key={slot.id}
                type="button"
                disabled={taken || published || patchStory.isPending}
                onClick={() => patchStory.mutate({ slotId: slot.id })}
                aria-pressed={chosen}
                aria-label={`${index + 1}: ${taken ? words.slotTaken : chosen ? words.slotChosen : words.slotFree}`}
                style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
                className={cn(
                  "absolute flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-18 font-bold",
                  chosen
                    ? "border-primary-strong bg-primary-strong text-white"
                    : taken
                      ? "border-ink/10 bg-ink/10 text-ink/40"
                      : "border-ink/30 bg-surface",
                )}
              >
                {chosen ? <Check aria-hidden className="size-6" /> : index + 1}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-display text-22">{words.orderLegend}</h2>
        {order.length === 0 && <p className="text-16 text-ink/70">{words.noMemories}</p>}
        <ol className="space-y-2">
          {order.map((id, index) => {
            const memory = memories[index]?.data;
            return (
              <li
                key={id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-ink/10 p-3"
              >
                <span className="w-6 text-18 font-bold">{index + 1}</span>
                <span className="min-w-40 flex-1 text-18">
                  {memory ? (
                    <Link
                      href={`/studio/memories/${id}`}
                      className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
                    >
                      {memory.title}
                    </Link>
                  ) : (
                    "…"
                  )}
                </span>
                <label htmlFor={`alone-${id}`} className="flex items-center gap-2 text-14">
                  {words.okAlone}
                  <Switch
                    id={`alone-${id}`}
                    checked={memory?.okAlone ?? false}
                    disabled={!memory}
                    onCheckedChange={(okAlone) => alone.mutate({ id, okAlone })}
                  />
                </label>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-label={words.up}
                  disabled={index === 0 || patchStory.isPending}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp aria-hidden />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  aria-label={words.down}
                  disabled={index === order.length - 1 || patchStory.isPending}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown aria-hidden />
                </Button>
              </li>
            );
          })}
        </ol>
      </Card>

      {mentions.length > 0 && <DontShowWarning mentions={mentions} />}
      {(publish.isError || patchStory.isError) && (
        <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
          {(publish.error ?? patchStory.error) instanceof StudioApiError
            ? (publish.error ?? patchStory.error)?.message
            : words.error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="button"
          disabled={pending || order.length === 0 || publish.isPending}
          onClick={() => publish.mutate()}
        >
          {publish.isPending ? words.sending : words.send.replace("{name}", name)}
        </Button>
        {pending && <p className="text-16 text-ink/70">{words.blocked}</p>}
      </div>
    </div>
  );
}
