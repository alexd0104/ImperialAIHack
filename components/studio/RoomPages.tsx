"use client";

import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Box, Move } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { MovingDots } from "@/components/ui/moving-dots";
import { HouseDetail } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { requestStudio } from "./api";
import { roomBackgroundUrl } from "./RoomDoors";
import { AddRoom, RoomRow } from "./RoomManager";
import { useStudioHouseId } from "./studio-house";

const words = copy.studio.rooms;

function WithQuery({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function useHouse(initialHouseId?: string) {
  const { houseId } = useStudioHouseId(initialHouseId);
  const house = useQuery({
    queryKey: ["house", houseId],
    enabled: Boolean(houseId),
    queryFn: () => requestStudio(`/api/houses/${houseId}`, HouseDetail),
  });
  return { houseId, house };
}

function BackToRooms({ houseId }: { houseId: string | null }) {
  return (
    <Link
      href={houseId ? `/studio?house=${encodeURIComponent(houseId)}` : "/studio"}
      className="inline-flex min-h-16 items-center gap-2 text-16 font-bold underline-offset-4 hover:underline"
    >
      <ArrowLeft aria-hidden className="size-5" />
      {words.backToRooms}
    </Link>
  );
}

/** "+" doorway target: name the Room, then a photo, a description or a familiar Room. */
export function NewRoomPage({ houseId: fromUrl }: { houseId?: string }) {
  return (
    <WithQuery>
      <NewRoom fromUrl={fromUrl} />
    </WithQuery>
  );
}

function NewRoom({ fromUrl }: { fromUrl?: string }) {
  const router = useRouter();
  const { houseId } = useStudioHouseId(fromUrl);
  if (!houseId) return <MovingDots />;
  return (
    <section className="space-y-4">
      <BackToRooms houseId={houseId} />
      <AddRoom
        houseId={houseId}
        onCreated={() => router.push(`/studio?house=${encodeURIComponent(houseId)}`)}
      />
    </section>
  );
}

/** Opening a door: change the background or the name, move the Objects, or remove the Room. */
export function EditRoomPage({ houseId: fromUrl, roomId }: { houseId?: string; roomId: string }) {
  return (
    <WithQuery>
      <EditRoom fromUrl={fromUrl} roomId={roomId} />
    </WithQuery>
  );
}

function EditRoom({ fromUrl, roomId }: { fromUrl?: string; roomId: string }) {
  const router = useRouter();
  const { houseId, house } = useHouse(fromUrl);
  const room = house.data?.rooms.find((r) => r.id === roomId);
  if (!houseId || house.isPending) return <MovingDots />;
  if (!room)
    return (
      <section className="space-y-4">
        <BackToRooms houseId={houseId} />
        <p className="text-18">{words.roomMissing}</p>
      </section>
    );
  const stories = house.data?.stories.filter((s) => s.roomId === roomId) ?? [];
  const home = `/studio?house=${encodeURIComponent(houseId)}`;
  return (
    <section className="space-y-6">
      <BackToRooms houseId={houseId} />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <CardTitle>{room.name}</CardTitle>
        <Button asChild>
          <Link href={`/studio/stories/new?roomId=${encodeURIComponent(room.id)}`}>
            {words.newStoryHere}
          </Link>
        </Button>
      </div>
      {/* biome-ignore lint/performance/noImgElement: Room picture from /rooms or /api/files, not optimised by Next. */}
      <img
        src={roomBackgroundUrl(room)}
        alt=""
        className="aspect-[1194/834] w-full max-w-3xl rounded-xl object-cover shadow-lg"
      />
      <Card className="space-y-4">
        <CardTitle>{words.objectsTitle}</CardTitle>
        {stories.length === 0 ? (
          <p className="text-16 text-ink/70">{words.objectsEmpty}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {stories.map((story) => (
              <li key={story.id}>
                <Link
                  href={`/studio/stories/${encodeURIComponent(story.id)}/place`}
                  className="flex min-h-16 items-center gap-3 rounded-xl border border-ink/15 bg-surface p-3 hover:border-primary-strong"
                >
                  <ObjectIcon url={story.objectUrl} />
                  <span className="flex-1 truncate text-16 font-bold">{story.title}</span>
                  <Move aria-hidden className="size-5" />
                  <span className="sr-only">{words.moveObject}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <RoomRow room={room} onChanged={() => house.refetch()} onDeleted={() => router.push(home)} />
    </section>
  );
}

/**
 * Picture of an Object in the Room list: SVG/PNG as is, a library 3D Object by its thumbnail,
 * and a 3D Object made from a family photo (no thumbnail yet) by a cube icon, never a blank box.
 */
function ObjectIcon({ url }: { url?: string }) {
  const library = url?.match(/^\/objects\/glb\/([a-z0-9-]+)\.glb$/);
  const src = library ? `/objects/thumbs/${library[1]}.png` : url?.endsWith(".glb") ? null : url;
  if (src)
    return (
      // biome-ignore lint/performance/noImgElement: Object picture from /objects or /api/files.
      <img src={src} alt="" className="size-12 rounded-lg bg-surface-muted object-contain p-1" />
    );
  return (
    <span
      className="flex size-12 items-center justify-center rounded-lg bg-surface-muted text-primary-strong"
      aria-hidden
    >
      <Box className="size-6" />
    </span>
  );
}
