import type * as React from "react";
import { cn } from "@/lib/utils";

export type ShimmerBarProps = React.ComponentProps<"div"> & {
  /** 0–1 known progress. Omit for an indeterminate bar. */
  value?: number;
};

// Fixed height and a clipped track, so nothing around it shifts. CSS only; under
// reduced motion the sweep is hidden and the bar is a static fill.
export function ShimmerBar({ value, className, ...props }: ShimmerBarProps) {
  const known = typeof value === "number";
  const pct = known ? Math.round(Math.min(1, Math.max(0, value)) * 100) : 100;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={known ? pct : undefined}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-ink/10", className)}
      {...props}
    >
      <div
        className={cn(
          "absolute inset-y-0 left-0 rounded-full bg-primary-strong/70",
          !known && "opacity-40",
        )}
        style={{ width: `${pct}%` }}
      />
      <div className="absolute inset-y-0 left-0 w-1/3 bg-surface/50 [animation:shimmer-slide_1.6s_ease-in-out_infinite] motion-reduce:hidden" />
    </div>
  );
}
