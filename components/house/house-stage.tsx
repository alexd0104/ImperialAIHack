"use client";

import { type ReactNode, useEffect, useState } from "react";
import { STAGE_HEIGHT, STAGE_WIDTH } from "@/lib/house/layout";

// Every House screen is designed at 1194 × 834 (Figma v5) and scaled to fit, letterboxed
// in the background colour, so Slot positions never drift between screens or devices.
export function HouseStage({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const resize = () =>
      setScale(Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT));
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-background select-none">
      <div
        data-testid="house-stage"
        className="absolute top-1/2 left-1/2 overflow-hidden"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          // Hidden until measured so the first paint is never at the wrong size.
          visibility: scale ? "visible" : "hidden",
          transform: `translate(-50%, -50%) scale(${scale || 1})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
