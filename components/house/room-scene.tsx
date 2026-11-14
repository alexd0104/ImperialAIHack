"use client";

import { LayoutGrid } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { IconButton } from "@/components/ui/icon-button";
import type { BundleRoom, HouseBundle } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { slotBox } from "@/lib/house/layout";
import { EmptySlot } from "./empty-slot";
import { ObjectOpen } from "./object-open";
import type { ObjectLook } from "./room-canvas";
import { useReducedMotion } from "./use-reduced-motion";

// three.js touches `window`: client-only (TECHNICAL.md §10).
const RoomCanvas = dynamic(() => import("./room-canvas"), { ssr: false });

/** Alone mode: unavailable Objects stay in place, faded (H8). */
const UNAVAILABLE_OPACITY = 0.28;
const FADED_WHILE_OPEN = 0.3;
const OPEN_SCALE = 1.12;

// Figma v5 "Room · Garden" (20-176) and "watching alone" (20-701).
export function RoomScene({
  bundle,
  room,
  openSlotId,
  onTapObject,
  onPickMemory,
  onCloseObject,
  onShowRooms,
}: {
  bundle: HouseBundle;
  room: BundleRoom;
  openSlotId: string | null;
  onTapObject: (slotId: string) => void;
  onPickMemory: (index: number) => void;
  onCloseObject: () => void;
  onShowRooms: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const looks: Record<string, ObjectLook> = {};
  for (const slot of room.slots) {
    if (!slot.story) continue;
    const opacity = !slot.story.available
      ? UNAVAILABLE_OPACITY
      : openSlotId && openSlotId !== slot.id
        ? FADED_WHILE_OPEN
        : 1;
    looks[slot.id] = { opacity, scale: openSlotId === slot.id ? OPEN_SCALE : 1 };
  }

  const openSlot = room.slots.find((s) => s.id === openSlotId);
  const alone = bundle.mode === "alone";
  const people = bundle.house.avatars.map((a) => ({ name: a.initial }));

  return (
    <section
      data-testid="room-scene"
      className="relative size-full transition-opacity duration-900 ease-memorai"
      style={{ opacity: shown ? 1 : 0 }}
    >
      {/* biome-ignore lint/performance/noImgElement: preloaded by the House, not optimised by Next. */}
      <img
        src={room.background}
        alt=""
        draggable={false}
        className="absolute inset-0 size-full object-cover"
      />

      {room.slots.map((slot) => (slot.story ? null : <EmptySlot key={slot.id} slot={slot} />))}

      <div className="absolute inset-0">
        <RoomCanvas slots={room.slots} looks={looks} reducedMotion={reducedMotion} />
      </div>

      {/* Tap targets over each Object (≥ 200 px, Figma Objects 200–290). */}
      {!openSlot &&
        room.slots.map((slot) => {
          const story = slot.story;
          if (!story) return null;
          const box = slotBox(slot, 1.1);
          return (
            <button
              key={slot.id}
              type="button"
              data-testid="room-object"
              data-available={story.available}
              aria-label={`${copy.house.openStory}: ${story.title}`}
              aria-disabled={!story.available}
              onClick={() => story.available && onTapObject(slot.id)}
              className="absolute cursor-pointer rounded-card aria-disabled:cursor-default"
              style={{
                left: box.left,
                top: box.top,
                width: Math.max(box.width, 200),
                height: Math.max(box.height, 200),
              }}
            />
          );
        })}

      {openSlot?.story && (
        <ObjectOpen
          slot={openSlot}
          story={openSlot.story}
          onPick={onPickMemory}
          onClose={onCloseObject}
        />
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-8">
        <IconButton
          label={copy.house.rooms}
          size={64}
          elevation="house"
          onClick={onShowRooms}
          className="pointer-events-auto"
          data-testid="rooms-button"
        >
          <LayoutGrid aria-hidden />
        </IconButton>
        <div
          data-testid="mode-pill"
          className="flex items-center gap-2.5 rounded-full bg-surface/90 py-1.5 pr-4 pl-2 text-15 font-bold text-ink"
        >
          {!alone && people.length > 0 && <AvatarGroup people={people} size={30} />}
          {alone ? copy.house.alone : copy.house.together}
        </div>
      </header>
    </section>
  );
}
