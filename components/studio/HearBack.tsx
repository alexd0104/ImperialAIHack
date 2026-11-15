"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Check, Copy, ExternalLink, Heart, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { FeedbackResponse, HouseDetail, LinkResponse } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { requestStudio } from "./api";
import { useStudioHouseId } from "./studio-house";

const words = copy.studio.hearBack;
const nav = copy.studio.nav;

export function HearBack({ houseId }: { houseId?: string }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <HearBackContent initialHouseId={houseId} />
    </QueryClientProvider>
  );
}

/** The Memory with the most hearts; ties go to the most recent heart. */
export function mostLovedMemory(perMemory: FeedbackResponse["perMemory"]) {
  return (
    [...perMemory]
      .filter((item) => item.hearts > 0)
      .sort(
        (a, b) => b.hearts - a.hearts || (b.lastHeartAt ?? "").localeCompare(a.lastHeartAt ?? ""),
      )[0] ?? null
  );
}

function HearBackContent({ initialHouseId }: { initialHouseId?: string }) {
  const { houseId, ready } = useStudioHouseId(initialHouseId);
  const enabled = Boolean(houseId);
  const house = useQuery({
    queryKey: ["house", houseId],
    enabled,
    queryFn: () => requestStudio(`/api/houses/${houseId}`, HouseDetail),
  });
  const feedback = useQuery({
    queryKey: ["feedback", houseId],
    enabled,
    queryFn: () => requestStudio(`/api/houses/${houseId}/feedback`, FeedbackResponse),
  });
  const links = useQuery({
    queryKey: ["link", houseId],
    enabled,
    queryFn: () => requestStudio(`/api/houses/${houseId}/link`, LinkResponse),
  });

  if (!ready) return <p className="text-16 text-ink/70">{words.loading}</p>;
  if (!houseId)
    return (
      <Card className="flex flex-col items-start gap-4">
        <p className="text-18">{words.noHouse}</p>
        <Button asChild>
          <Link href="/studio/house/new">{words.newHouse}</Link>
        </Button>
      </Card>
    );
  if (house.isError || feedback.isError || links.isError)
    return <p role="alert">{words.loadError}</p>;
  if (!house.data || !feedback.data || !links.data)
    return <p className="text-16 text-ink/70">{words.loading}</p>;

  const best = mostLovedMemory(feedback.data.perMemory);
  const firstRoom = house.data.rooms[0];
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-32 text-ink">{words.title}</h1>
        <p className="mt-2 text-18 text-ink/70">{words.intro}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label={words.views} value={feedback.data.views} />
        <Stat label={words.hearts} value={feedback.data.hearts} hearts />
      </div>
      <Card className="flex items-center gap-4">
        <Heart aria-hidden className="size-8 shrink-0 text-primary" />
        <div>
          <CardTitle>{words.mostLoved}</CardTitle>
          {best ? (
            <p className="mt-1 text-18 text-ink/70">
              {best.title} · {best.hearts} {words.heartsCount}
            </p>
          ) : (
            <p className="mt-1 text-18 text-ink/70">{words.mostLovedNone}</p>
          )}
        </div>
      </Card>
      {feedback.data.perMemory.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {feedback.data.perMemory.map((item) => (
            <li key={item.memoryId}>
              <Link
                href={`/studio/memories/${item.memoryId}`}
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-4.5 py-3.5 text-16 hover:bg-surface-muted"
              >
                <span className="font-bold">{item.title}</span>
                <span className="text-ink/70">
                  {item.views} {words.viewsCount} · {item.hearts} {words.heartsCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {/* Existing Stories, so home is a way back into any Story, not only "create". */}
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-22 text-ink">{nav.stories}</h2>
        {house.data.stories.length === 0 ? (
          <p className="text-16 text-ink/70">{nav.storiesNone}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {house.data.stories.map((story) => (
              <li key={story.id}>
                <Link
                  href={`/studio/stories/${story.id}/place`}
                  className="flex min-h-11 flex-wrap items-center justify-between gap-2 rounded-lg bg-surface px-4.5 py-3.5 text-16 hover:bg-surface-muted"
                >
                  <span className="font-bold">{story.title}</span>
                  <span className="text-ink/70">
                    {story.memoryCount} {nav.memoriesCount}
                    {story.publishedAt ? "" : ` · ${nav.draft}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link
            href={
              firstRoom
                ? `/studio/stories/new?roomId=${encodeURIComponent(firstRoom.id)}`
                : "/studio/house/new"
            }
          >
            <Plus aria-hidden />
            {words.createStory}
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <a href={links.data.url} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden />
            {words.openHouse.replace("{name}", house.data.firstName)}
          </a>
        </Button>
        <CopyButton text={links.data.url} label={words.copyLink} />
        <CopyButton text={links.data.aloneUrl} label={words.copyAloneLink} />
        <Button asChild variant="secondary">
          <Link href={`/studio/care?house=${houseId}`}>{words.care}</Link>
        </Button>
      </div>
    </div>
  );
}

/** B18: the number ticks up from where it was, like an odometer (instant under reduced motion). */
function useCountUp(value: number, ms = 900): number {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = from.current;
    if (start === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      from.current = value;
      setShown(value);
      return;
    }
    const t0 = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const p = Math.min((now - t0) / ms, 1);
      const eased = 1 - (1 - p) ** 3;
      setShown(Math.round(start + (value - start) * eased));
      if (p < 1) frame = requestAnimationFrame(step);
      else from.current = value;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, ms]);
  return shown;
}

function Stat({ label, value, hearts }: { label: string; value: number; hearts?: boolean }) {
  const shown = useCountUp(value);
  return (
    <Card className="relative overflow-hidden">
      <p className="font-display text-32 text-ink tabular-nums">{shown}</p>
      <p className="text-16 text-ink/70">{label}</p>
      {hearts && value > 0 && (
        // A few Hearts float up from the bottom, as if just arriving from the House.
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-6 w-24 motion-reduce:hidden"
        >
          {[0, 1, 2, 3].slice(0, Math.min(value, 4)).map((i) => (
            <Heart
              key={i}
              className="absolute bottom-2 size-6 fill-primary text-primary animate-float-up"
              style={{
                left: `${[10, 55, 30, 70][i]}%`,
                ["--dx" as string]: `${[-8, 10, -4, 6][i]}px`,
                ["--drift-delay" as string]: `${i * 0.35}s`,
              }}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          // Clipboard can be blocked; the link is still reachable via Open.
        }
      }}
    >
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
      {done ? words.copied : label}
    </Button>
  );
}
