"use client";

import { type CSSProperties, useEffect, useState } from "react";
import type { BundleRoom } from "@/lib/contracts";

// B18: what makes a Room feel lived in without anything really moving. A few slow particles
// that match the Room, and a hint of time-of-day light over the photo. Both sit under the
// Objects, never take a tap, and disappear entirely under reduced motion / stay static.

export type AmbienceKind = "pollen" | "steam" | "dust";

/** The Room's kind from its library photo or its name; dust motes fit any indoor room. */
export function ambienceKind(room: Pick<BundleRoom, "background" | "name">): AmbienceKind {
  const text = `${room.background} ${room.name}`.toLowerCase();
  if (/garden|jardin|yard|park|outside/.test(text)) return "pollen";
  if (/kitchen|cuisine/.test(text)) return "steam";
  return "dust";
}

export type LightPhase = "morning" | "day" | "evening" | "night";

export function lightPhase(hour: number): LightPhase {
  if (hour >= 6 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "day";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

const LIGHT: Record<LightPhase, { color: string; opacity: number }> = {
  morning: { color: "var(--color-light-morning)", opacity: 0.22 },
  day: { color: "var(--color-light-morning)", opacity: 0 },
  evening: { color: "var(--color-light-evening)", opacity: 0.26 },
  night: { color: "var(--color-light-night)", opacity: 0.22 },
};

/** Deterministic pseudo-random in [0, 1), so particles never jump between renders. */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

type Particle = { style: CSSProperties; className: string };

function particles(kind: AmbienceKind): Particle[] {
  const count = kind === "steam" ? 6 : 12;
  return Array.from({ length: count }, (_, i) => {
    const r = (n: number) => rand(i * 7 + n);
    if (kind === "steam") {
      // Soft wisps rising from the counter area.
      return {
        className: "absolute size-16 rounded-full bg-surface blur-xl animate-rise",
        style: {
          left: `${30 + r(1) * 45}%`,
          top: `${52 + r(2) * 14}%`,
          "--drift-s": `${8 + r(3) * 5}s`,
          "--drift-delay": `${-r(4) * 10}s`,
          "--dx": `${(r(5) - 0.5) * 40}px`,
          "--drift-o": "0.35",
        } as CSSProperties,
      };
    }
    const pollen = kind === "pollen";
    return {
      className: `absolute rounded-full animate-drift ${
        pollen ? "size-2 bg-light-morning" : "size-1.5 bg-surface"
      }`,
      style: {
        left: `${r(1) * 100}%`,
        // Dust gathers in the upper half where a sunbeam would be; pollen floats anywhere.
        top: `${pollen ? 15 + r(2) * 70 : 8 + r(2) * 50}%`,
        "--drift-s": `${14 + r(3) * 10}s`,
        "--drift-delay": `${-r(4) * 20}s`,
        "--dx": `${(r(5) - 0.3) * 80}px`,
        "--dy": `${-(10 + r(6) * 40)}px`,
        "--drift-o": pollen ? "0.8" : "0.55",
      } as CSSProperties,
    };
  });
}

function useHour(): number | null {
  const [hour, setHour] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setHour(new Date().getHours());
    tick();
    const timer = setInterval(tick, 60_000);
    return () => clearInterval(timer);
  }, []);
  return hour;
}

export function RoomAmbience({ room }: { room: BundleRoom }) {
  const hour = useHour();
  const kind = ambienceKind(room);
  const light = LIGHT[lightPhase(hour ?? 12)];
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* The light shifts over a minute, so a change of phase is never seen as movement. */}
      <div
        className="absolute inset-0 mix-blend-soft-light transition-[opacity,background-color] duration-[60000ms] ease-linear"
        style={{ backgroundColor: light.color, opacity: light.opacity }}
      />
      {kind === "dust" && (
        <div className="absolute -top-1/4 left-1/5 h-[150%] w-1/4 rotate-[24deg] bg-linear-to-b from-surface/18 to-transparent blur-2xl motion-reduce:hidden" />
      )}
      <div className="motion-reduce:hidden">
        {particles(kind).map((p, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed decorative list, never reordered.
          <span key={i} className={p.className} style={p.style} />
        ))}
      </div>
    </div>
  );
}
