"use client";

import { AvatarGroup } from "@/components/ui/avatar-group";
import type { HouseBundle } from "@/lib/contracts";
import { copy } from "@/lib/copy";

// Figma v5 "Choose a room" (20-67): greeting with the first name, family avatars, one
// arch card (320 × 480) per Room. One tap opens the Room; the picture is the label.
export function ChooseRoom({
  bundle,
  onChoose,
}: {
  bundle: HouseBundle;
  onChoose: (roomId: string) => void;
}) {
  const people = bundle.house.avatars.map((a) => ({ name: a.initial }));
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

      <ul className="mt-auto flex items-end justify-center gap-10 overflow-x-auto">
        {bundle.rooms.map((room) => (
          <li key={room.id} className="shrink-0">
            <button
              type="button"
              data-testid="room-card"
              onClick={() => onChoose(room.id)}
              className="group flex cursor-pointer flex-col items-center gap-4"
            >
              <span className="block h-[480px] w-[320px] overflow-hidden rounded-t-[160px] rounded-b-card bg-surface-muted shadow-card transition-transform duration-300 ease-memorai group-active:scale-[0.98]">
                {/* biome-ignore lint/performance/noImgElement: preloaded by the House, not optimised by Next. */}
                <img
                  src={room.background}
                  alt=""
                  draggable={false}
                  className="size-full object-cover"
                />
              </span>
              <span className="font-display text-28 font-semibold text-ink">{room.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
