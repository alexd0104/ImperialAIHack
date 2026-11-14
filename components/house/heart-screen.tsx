"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { HeartButton } from "@/components/ui/heart-button";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

// Figma v5 "Story · Send love" (20-668): one big Heart after each Memory, a "Next memory"
// pill, and the Story continues by itself after 10 s.
export const AUTO_CONTINUE_MS = 10_000;
const AFTER_HEART_MS = 1500;

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
