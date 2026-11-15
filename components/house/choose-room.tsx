"use client";

import { useEffect, useRef, useState } from "react";
import { AvatarGroup } from "@/components/ui/avatar-group";
import type { HouseBundle } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { useReducedMotion } from "./use-reduced-motion";

// Same arch for the frame, the picture and the door leaf, so they line up exactly.
const ARCH = "rounded-t-[999px] rounded-b-card";
// The door swings open, then the Room appears: long enough to feel like walking in.
const OPEN_MS = 800;

// Figma v5 "Choose a room" (20-67): greeting with the first name, family avatars, one
// arch per Room. B30: like the Studio, each Room is a door left ajar over its picture; one
// tap swings it wide open, then the Room appears. The picture is the label (no reading).
export function ChooseRoom({
  bundle,
  onChoose,
}: {
  bundle: HouseBundle;
  onChoose: (roomId: string) => void;
}) {
  const people = bundle.house.avatars.map((a) => ({ name: a.initial }));
  const reduced = useReducedMotion();
  const [opening, setOpening] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function open(roomId: string) {
    // One tap is enough; a second tap while the door opens must not open another Room.
    if (opening) return;
    if (reduced) return onChoose(roomId);
    setOpening(roomId);
    timer.current = setTimeout(() => onChoose(roomId), OPEN_MS);
  }

  return (
    <section className="flex size-full flex-col bg-background px-page pt-14 pb-12">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-44 leading-tight font-semibold text-ink">
            {copy.house.greeting} {bundle.house.firstName}
          </h1>
          <p className="mt-2 text-20 text-ink/70">{copy.house.chooseRoom}</p>
        </div>
        {people.length > 0 && <AvatarGroup people={people} />}
      </header>

      <ul className="mt-auto flex snap-x snap-mandatory items-end gap-10 overflow-x-auto px-2 pt-16 pb-4 [scrollbar-width:none] [&>li:first-child]:ml-auto [&>li:last-child]:mr-auto">
        {bundle.rooms.map((room) => {
          const isOpening = opening === room.id;
          return (
            <li key={room.id} className="shrink-0 snap-center">
              <button
                type="button"
                data-testid="room-card"
                onClick={() => open(room.id)}
                className="group flex cursor-pointer flex-col items-center gap-8"
              >
                <span
                  className={`relative block h-[480px] w-[320px] border-[12px] border-primary-strong bg-surface-muted shadow-card [perspective:2400px] ${ARCH}`}
                >
                  {/* Clipped to the arch: the picture leans in as the door opens, never past the frame. */}
                  <span className={`absolute inset-0 overflow-hidden ${ARCH}`}>
                    {/* biome-ignore lint/performance/noImgElement: preloaded by the House, not optimised by Next. */}
                    <img
                      src={room.background}
                      alt=""
                      draggable={false}
                      className={`size-full object-cover transition-transform duration-[800ms] ease-memorai ${isOpening ? "scale-110" : ""}`}
                    />
                  </span>
                  <span
                    aria-hidden
                    className={`absolute inset-0 origin-left bg-primary shadow-xl transition-transform duration-[800ms] ease-memorai ${ARCH} ${
                      isOpening
                        ? "[transform:rotateY(-100deg)]"
                        : "[transform:rotateY(-42deg)] group-active:[transform:rotateY(-56deg)]"
                    }`}
                  >
                    <span className="absolute top-1/2 right-5 size-5 rounded-full bg-surface" />
                    <span className="absolute inset-x-6 top-12 bottom-1/2 rounded-t-[999px] border-2 border-primary-strong/40" />
                    <span className="absolute inset-x-6 top-[58%] bottom-8 rounded-md border-2 border-primary-strong/40" />
                  </span>
                </span>
                <span className="font-display text-28 font-semibold text-ink">{room.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
