"use client";

import dynamic from "next/dynamic";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import type { ObjectLook } from "@/components/house/room-canvas";
import type { BundleSlot, Slot, StoryObject, StoryPosition } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  fitPosition,
  normalizePoint,
  resizeScale,
  studioObjectUrl,
} from "./placement";

// The House's own R3F layer, so the family sees each Object exactly as the House will show
// it (3D, same size). three.js touches `window`: client-only (TECHNICAL.md §10).
const RoomCanvas = dynamic(() => import("@/components/house/room-canvas"), { ssr: false });

/** Other Objects already in the Room: visible for context, clearly not the one being placed. */
const OTHER_LOOK: ObjectLook = { opacity: 0.55, scale: 1 };
const CURRENT_ID = "placing";

/** B18: a new Object falls into the Room and lands with a small bounce and a dust puff. */
const DROP_MS = 750;
const DROP_FROM = -0.35;

/** 0 → 1 with one soft bounce at the end (ease-out-back on the way down, then settle). */
function dropCurve(t: number): number {
  const c = 1.6;
  const p = t - 1;
  return 1 + (c + 1) * p ** 3 + c * p ** 2;
}

function useDrop(key: string): { offset: number; landed: number } {
  const [state, setState] = useState({ offset: 0, landed: 0 });
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` is the trigger: a new Object drops in again.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t0 = performance.now();
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min((now - t0) / DROP_MS, 1);
      setState((s) => ({ ...s, offset: DROP_FROM * (1 - dropCurve(t)) }));
      if (t < 1) frame = requestAnimationFrame(step);
      else setState((s) => ({ offset: 0, landed: s.landed + 1 }));
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key]);
  return state;
}

export type PlacedObject = { id: string; object: StoryObject; position: StoryPosition };

function toBundleSlot(id: string, object: StoryObject, at: StoryPosition): BundleSlot {
  return {
    id,
    ...at,
    story: {
      id,
      title: "",
      object: { kind: object.kind, url: studioObjectUrl(object) },
      available: true,
      memories: [],
    },
  };
}

const words = copy.studio.place;

type Drag = { mode: "move" | "resize"; startX: number; startScale: number };

/**
 * Editor on the Room picture (1194×834, letterboxed by aspect ratio): drag the Object to
 * move it, drag the corner handle to resize. Pointer events, so touch works too. The Object
 * and the Room's other Objects are drawn by the House's 3D layer under the DOM handles.
 * Old Slots are shown faintly as suggested spots; tapping one snaps the Object there.
 */
export function PlacementEditor({
  background,
  slots,
  object,
  others = [],
  value,
  disabled,
  onChange,
}: {
  background: string;
  slots: Slot[];
  object: StoryObject;
  others?: PlacedObject[];
  value: StoryPosition;
  disabled?: boolean;
  onChange: (next: StoryPosition) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [live, setLive] = useState<StoryPosition | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const shown = live ?? value;
  const drop = useDrop(`${object.kind}:${object.path}`);

  // The 3D layer is laid out at 1194×834 and scaled with CSS to the editor's width, like the
  // House stage, so 1 three.js unit stays 1 stage pixel.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setBoxWidth(entry?.contentRect.width ?? 0));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const canvasSlots = [
    ...others.map((o) => toBundleSlot(o.id, o.object, o.position)),
    toBundleSlot(CURRENT_ID, object, { ...shown, y: Math.max(0, shown.y + drop.offset) }),
  ];
  const looks = Object.fromEntries(others.map((o) => [o.id, OTHER_LOOK]));

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
      {boxWidth > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 origin-top-left"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            transform: `scale(${boxWidth / CANVAS_WIDTH})`,
          }}
        >
          <RoomCanvas slots={canvasSlots} looks={looks} reducedMotion={false} />
        </div>
      )}
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
      {drop.landed > 0 && (
        <span
          key={drop.landed}
          aria-hidden
          className="pointer-events-none absolute h-6 rounded-full bg-surface/80 blur-sm animate-puff"
          style={{
            left: `${shown.x * 100}%`,
            top: `${(shown.y + (shown.scale * CANVAS_WIDTH) / CANVAS_HEIGHT / 2) * 100}%`,
            width: `${shown.scale * 100}%`,
          }}
        />
      )}
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
