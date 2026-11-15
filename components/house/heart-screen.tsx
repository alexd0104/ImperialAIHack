"use client";

import { ChevronRight, Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HeartButton } from "@/components/ui/heart-button";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

// Figma v5 "Story · Send love" (20-668): one big Heart after each Memory, a "Next memory"
// pill, and the Story continues by itself after 10 s.
export const AUTO_CONTINUE_MS = 10_000;
const AFTER_HEART_MS = 1500;
/** B18: the sent Heart and a few small ones float up towards the family, then fade. */
const RISING = [
  { x: 0, size: "size-40", delay: 0 },
  { x: -120, size: "size-12", delay: 120 },
  { x: 110, size: "size-10", delay: 220 },
  { x: -60, size: "size-8", delay: 340 },
  { x: 70, size: "size-14", delay: 420 },
];

export function HeartScreen({
  isLast,
  onHeart,
  onNext,
}: {
  isLast: boolean;
  onHeart: () => void;
  onNext: () => void;
}) {
  const [sent, setSent] = useState(false);
  const next = useRef(onNext);
  next.current = onNext;

  useEffect(() => {
    const timer = setTimeout(() => next.current(), sent ? AFTER_HEART_MS : AUTO_CONTINUE_MS);
    return () => clearTimeout(timer);
  }, [sent]);

  return (
    <section
      data-testid="heart-screen"
      className="relative flex size-full items-center justify-center bg-background"
    >
      {sent && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center motion-reduce:hidden"
        >
          {RISING.map((h) => (
            <Heart
              key={`${h.x}-${h.delay}`}
              className={cn("absolute fill-primary text-primary animate-heart-rise", h.size)}
              style={{ ["--rise-x" as string]: `${h.x}px`, animationDelay: `${h.delay}ms` }}
            />
          ))}
        </div>
      )}
      <div className={cn("transition-transform duration-900 ease-memorai", sent && "scale-110")}>
        <HeartButton
          data-testid="heart-button"
          onClick={() => {
            if (sent) return;
            setSent(true);
            onHeart();
          }}
        />
      </div>
      <Button
        variant="secondary"
        onClick={onNext}
        data-testid="next-button"
        className="absolute right-page bottom-12 border-0 pr-4 pl-6 shadow-card"
      >
        {isLast ? copy.house.returnToRoom : copy.house.nextMemory}
        <ChevronRight aria-hidden className="size-8.5!" />
      </Button>
    </section>
  );
}
