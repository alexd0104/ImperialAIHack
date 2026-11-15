"use client";

import { type PointerEvent, useRef, useState } from "react";
import type { Slot, StoryObject, StoryPosition } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { CANVAS_HEIGHT, CANVAS_WIDTH, fitPosition, normalizePoint, resizeScale } from "./placement";

const words = copy.studio.place;

type Drag = { mode: "move" | "resize"; startX: number; startScale: number };

/**
 * 2D editor on the Room picture (1194×834, letterboxed by aspect ratio): drag the Object to
 * move it, drag the corner handle to resize. Pointer events, so touch works too. Old Slots
 * are shown faintly as suggested spots; tapping one snaps the Object there.
 */
export function PlacementEditor({
  background,
  slots,
  object,
  value,
  disabled,
  onChange,
}: {
  background: string;
  slots: Slot[];
  object: StoryObject;
  value: StoryPosition;
  disabled?: boolean;
  onChange: (next: StoryPosition) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<StoryPosition | null>(null);
  const shown = live ?? value;
  const src =
    object.kind === "svg"
      ? `/objects/${object.path}.svg`
      : object.path.startsWith("/objects/glb/")
        ? object.path.replace("/objects/glb/", "/objects/thumbs/").replace(/\.glb$/, ".png")
        : `/api/files/${object.path}`; // glb has no 2D picture; falls back to the label below

  const rect = () => box.current?.getBoundingClientRect();

  const begin = (event: PointerEvent, mode: Drag["mode"]) => {
    if (disabled) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { mode, startX: event.clientX, startScale: shown.scale };
  };
  const move = (event: PointerEvent) => {
    const r = rect();
    const d = drag.current;
    if (!r || !d) return;
    if (d.mode === "move") {
      setLive(normalizePoint(event.clientX - r.left, event.clientY - r.top, r, shown.scale));
    } else {
      const scale = resizeScale(d.startScale, event.clientX - d.startX, r.width);
      setLive(fitPosition({ x: shown.x, y: shown.y, scale }));
    }
  };
  const end = () => {
    if (drag.current && live) onChange(live);
    drag.current = null;
    setLive(null);
  };

  const widthPct = shown.scale * 100;
  return (
    <div
      ref={box}
      style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
      className="relative w-full touch-none select-none overflow-hidden rounded-xl bg-ink/5"
    >
      {/* biome-ignore lint/performance/noImgElement: Room picture from /rooms or /api/files, not optimised by Next. */}
      <img
        src={background}
        alt=""
        draggable={false}
        className="absolute inset-0 size-full object-cover"
      />
      {slots.map((slot) => (
        <button
          key={slot.id}
          type="button"
          disabled={disabled}
          aria-label={words.suggestedSpot}
          onClick={() =>
            onChange(normalizePoint(slot.x, slot.y, { width: 1, height: 1 }, value.scale))
          }
          style={{ left: `${slot.x * 100}%`, top: `${slot.y * 100}%` }}
          className="absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-ink/20 bg-surface/20"
        />
      ))}
      <div
        role="img"
        aria-label={words.objectHandle}
        onPointerDown={(event) => begin(event, "move")}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        style={{
          left: `${shown.x * 100}%`,
          top: `${shown.y * 100}%`,
          width: `${widthPct}%`,
          aspectRatio: "1",
        }}
        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-lg ring-2 ring-primary-strong active:cursor-grabbing"
      >
        {object.kind === "svg" ? (
          // biome-ignore lint/performance/noImgElement: small library SVG from /objects.
          <img src={src} alt="" draggable={false} className="size-full object-contain" />
        ) : (
          <div className="size-full rounded-lg bg-surface/80" />
        )}
        <span
          onPointerDown={(event) => begin(event, "resize")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          role="img"
          aria-label={words.resizeHandle}
          className="absolute -right-4 -bottom-4 size-8 cursor-nwse-resize rounded-full border-2 border-white bg-primary-strong"
        />
      </div>
    </div>
  );
}
