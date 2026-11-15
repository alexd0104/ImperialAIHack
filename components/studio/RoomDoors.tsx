"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { copy } from "@/lib/copy";

const words = copy.studio.rooms;

export type DoorRoom = { id: string; name: string; backgroundPath: string; backgroundUrl?: string };

export const roomBackgroundUrl = (room: Pick<DoorRoom, "backgroundPath" | "backgroundUrl">) =>
  room.backgroundUrl ??
  (room.backgroundPath.startsWith("/") ? room.backgroundPath : `/api/files/${room.backgroundPath}`);

// Same arch for the frame, the picture and the door leaf, so they line up exactly.
const ARCH = "rounded-t-[999px] rounded-b-md";

/**
 * Room carousel on the Studio home: each Room is a door left ajar, its background visible
 * behind it; the door opens wider on hover/focus. Horizontal scroll with snap (touch-friendly),
 * and an empty doorway with "+" at the end to add a Room.
 */
export function RoomDoors({ rooms, houseId }: { rooms: DoorRoom[]; houseId: string }) {
  const q = `?house=${encodeURIComponent(houseId)}`;
  return (
    <ul
      aria-label={words.title}
      className="-mx-4 flex snap-x snap-mandatory gap-8 overflow-x-auto px-4 pt-2 pb-6 [scrollbar-width:thin]"
    >
      {rooms.map((room) => (
        <li key={room.id} className="shrink-0 snap-center">
          <Link
            href={`/studio/rooms/${encodeURIComponent(room.id)}${q}`}
            aria-label={`${words.editRoom}: ${room.name}`}
            className="group block w-44 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-primary sm:w-52"
          >
            <div
              className={`relative aspect-[3/5] border-[10px] border-primary-strong bg-surface-muted shadow-lg [perspective:900px] ${ARCH}`}
            >
              {/* biome-ignore lint/performance/noImgElement: Room picture from /rooms or /api/files, not optimised by Next. */}
              <img
                src={roomBackgroundUrl(room)}
                alt=""
                className={`absolute inset-0 size-full object-cover ${ARCH}`}
              />
              <div
                aria-hidden
                className={`absolute inset-0 origin-left bg-primary shadow-xl transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform:rotateY(-52deg)] group-hover:[transform:rotateY(-72deg)] group-focus-visible:[transform:rotateY(-72deg)] motion-reduce:transition-none ${ARCH}`}
              >
                <span className="absolute top-1/2 right-3 size-3 rounded-full bg-surface" />
                <span className="absolute inset-x-4 top-8 bottom-1/2 rounded-t-[999px] border-2 border-primary-strong/40" />
                <span className="absolute inset-x-4 top-[58%] bottom-6 rounded-md border-2 border-primary-strong/40" />
              </div>
            </div>
            <p className="mt-3 truncate text-center text-18 font-bold">{room.name}</p>
          </Link>
        </li>
      ))}
      <li className="shrink-0 snap-center">
        <Link
          href={`/studio/rooms/new${q}`}
          className="group block w-44 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-primary sm:w-52"
        >
          <div
            className={`flex aspect-[3/5] items-center justify-center border-[10px] border-dashed border-ink/30 bg-surface transition-colors group-hover:border-primary-strong ${ARCH}`}
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-primary-strong text-white shadow-lg transition-transform group-hover:scale-110 motion-reduce:transition-none">
              <Plus aria-hidden className="size-8" />
            </span>
          </div>
          <p className="mt-3 text-center text-18 font-bold">{words.addCard}</p>
        </Link>
      </li>
    </ul>
  );
}
