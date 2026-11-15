"use client";

import { LayoutGrid } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AvatarGroup } from "@/components/ui/avatar-group";
import { IconButton } from "@/components/ui/icon-button";
import type { BundleRoom, BundleSlot, HouseBundle } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { slotBox } from "@/lib/house/layout";
import { diffObjects, MOVE_FADE_MS } from "@/lib/house/refresh";
import { EmptySlot } from "./empty-slot";
import { ObjectOpen } from "./object-open";
import { RoomAmbience } from "./room-ambience";
import type { ObjectLook } from "./room-canvas";
import { useReducedMotion } from "./use-reduced-motion";

// three.js touches `window`: client-only (TECHNICAL.md §10).
const RoomCanvas = dynamic(() => import("./room-canvas"), { ssr: false });

/** Alone mode: unavailable Objects stay in place, faded (H8). */
const UNAVAILABLE_OPACITY = 0.28;
const FADED_WHILE_OPEN = 0.3;
const OPEN_SCALE = 1.12;

/** H11: a new background fades in over the old one (already preloaded), never a flash. */
function RoomBackground({ src }: { src: string }) {
  const [layers, setLayers] = useState<{ current: string; previous: string | null }>({
    current: src,
    previous: null,
  });
  const [fadedIn, setFadedIn] = useState(true);
  useEffect(() => {
    if (src === layers.current) return;
    setLayers({ current: src, previous: layers.current });
    setFadedIn(false);
    const frame = requestAnimationFrame(() => requestAnimationFrame(() => setFadedIn(true)));
    const done = setTimeout(() => setLayers((l) => ({ ...l, previous: null })), MOVE_FADE_MS + 100);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(done);
    };
  }, [src, layers.current]);
  const cls = "absolute inset-0 size-full object-cover";
  return (
    <>
      {layers.previous && (
        // biome-ignore lint/performance/noImgElement: preloaded by the House, not optimised by Next.
        <img src={layers.previous} alt="" draggable={false} className={cls} />
      )}
      {/* biome-ignore lint/performance/noImgElement: preloaded by the House, not optimised by Next. */}
      <img
        src={layers.current}
        alt=""
        draggable={false}
        className={`${cls} transition-opacity ease-memorai`}
        style={{ opacity: fadedIn ? 1 : 0, transitionDuration: `${MOVE_FADE_MS}ms` }}
      />
    </>
  );
}

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

  // H11: a moved or removed Object fades out where it was, then the new layout fades in.
  const [staged, setStaged] = useState<{ slots: BundleSlot[]; leaving: Set<string> }>({
    slots: room.slots,
    leaving: new Set(),
  });
  const shownSlots = staged.slots;
  useEffect(() => {
    if (shownSlots === room.slots) return;
    const diff = diffObjects(shownSlots, room.slots);
    const leaving = new Set([...diff.moved, ...diff.removed]);
    if (leaving.size === 0 || reducedMotion) {
      setStaged({ slots: room.slots, leaving: new Set() });
      return;
    }
    setStaged({ slots: shownSlots, leaving });
    const timer = setTimeout(
      () => setStaged({ slots: room.slots, leaving: new Set() }),
      MOVE_FADE_MS / 2,
    );
    return () => clearTimeout(timer);
  }, [room.slots, shownSlots, reducedMotion]);

  const looks: Record<string, ObjectLook> = {};
  for (const slot of shownSlots) {
    if (!slot.story) continue;
    if (staged.leaving.has(slot.story.id)) {
      looks[slot.id] = { opacity: 0, scale: 1 };
      continue;
    }
    const opacity = !slot.story.available
      ? UNAVAILABLE_OPACITY
      : openSlotId && openSlotId !== slot.id
        ? FADED_WHILE_OPEN
        : 1;
    looks[slot.id] = { opacity, scale: openSlotId === slot.id ? OPEN_SCALE : 1 };
  }

  const openSlot = room.slots.find((s) => s.id === openSlotId);
  // B18: a warm halo blooms under the Object a finger is on (or a mouse is over), so it
  // answers "can I touch this?" without any words.
  const [near, setNear] = useState<string | null>(null);
  const alone = bundle.mode === "alone";
  const people = bundle.house.avatars.map((a) => ({ name: a.initial }));

  return (
    <section
      data-testid="room-scene"
      className="relative size-full transition-opacity duration-900 ease-memorai"
      style={{ opacity: shown ? 1 : 0 }}
    >
      <RoomBackground src={room.background} />
      <RoomAmbience room={room} />

      {shownSlots.map((slot) => {
        if (!slot.story?.available) return null;
        const box = slotBox(slot, 1);
        const lit = near === slot.id && !openSlotId;
        return (
          <div
            key={`glow-${slot.id}`}
            aria-hidden
            className="pointer-events-none absolute rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--color-glow)_85%,transparent),color-mix(in_srgb,var(--color-glow)_35%,transparent)_55%,transparent)] blur-md transition-[opacity,scale] duration-500 ease-memorai"
            style={{
              // A pool of light on the ground around the Object's base.
              left: box.left - box.width * 0.5,
              top: box.top + box.height * 0.35,
              width: box.width * 2,
              height: box.height * 1.1,
              opacity: lit ? 1 : 0,
              scale: lit ? "1" : "0.8",
            }}
          />
        );
      })}

      {shownSlots.map((slot) => (slot.story ? null : <EmptySlot key={slot.id} slot={slot} />))}

      <div className="absolute inset-0">
        <RoomCanvas slots={shownSlots} looks={looks} reducedMotion={reducedMotion} />
      </div>

      {/* Tap targets over each Object (≥ 200 px, Figma Objects 200–290). */}
      {!openSlot &&
        shownSlots.map((slot) => {
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
              onPointerEnter={() => setNear(slot.id)}
              onPointerDown={() => setNear(slot.id)}
              onPointerLeave={() => setNear((id) => (id === slot.id ? null : id))}
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
