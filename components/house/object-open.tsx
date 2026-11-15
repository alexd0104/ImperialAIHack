"use client";

import { useEffect, useState } from "react";
import { Polaroid } from "@/components/ui/polaroid";
import type { BundleSlot, BundleStory } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { polaroidLayout, STAGE_HEIGHT, STAGE_WIDTH } from "@/lib/house/layout";

// Figma v5 "Garden — Flower opened" (20-219): the Memory polaroids fly out of the
// Object (0.9 s, --ease-memorai). Tap one to start it; with no tap the first Memory
// starts after 3 s, so no choice is ever required.
export const AUTO_START_MS = 3000;

export function ObjectOpen({
  slot,
  story,
  onPick,
  onClose,
}: {
  slot: BundleSlot;
  story: BundleStory;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  const [out, setOut] = useState(false);
  const places = polaroidLayout(story.memories.length, slot);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setOut(true));
    const timer = setTimeout(() => onPick(0), AUTO_START_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [onPick]);

  const originX = slot.x * STAGE_WIDTH;
  const originY = slot.y * STAGE_HEIGHT;

  return (
    <div className="absolute inset-0" data-testid="object-open">
      {/* Tapping anywhere else closes the Object again. */}
      <button
        type="button"
        aria-label={copy.house.returnToRoom}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      {story.memories.map((memory, i) => {
        const place = places[i];
        if (!place) return null;
        const dx = originX - place.x;
        const dy = originY - place.y;
        return (
          <button
            key={memory.id}
            type="button"
            data-testid="polaroid"
            aria-label={`${copy.house.playMemory}: ${memory.title}`}
            onClick={() => onPick(i)}
            className="absolute cursor-pointer transition-[translate,scale,opacity] duration-900 ease-memorai"
            style={{
              left: place.x - 100,
              top: place.y - 125,
              opacity: out ? 1 : 0,
              // Reduced motion: the global rule makes this instant, leaving a plain fade-in.
              translate: out ? "0 0" : `${dx}px ${dy}px`,
              scale: out ? "1" : "0.2",
              transitionDelay: `${i * 60}ms`,
            }}
          >
            <Polaroid
              src={memory.polaroidUrl}
              caption={memory.caption}
              tilt={place.tilt}
              video={memory.scenes.some((s) => s.kind !== "photo")}
            />
          </button>
        );
      })}
    </div>
  );
}
