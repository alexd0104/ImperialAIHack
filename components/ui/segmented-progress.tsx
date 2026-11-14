import type * as React from "react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

// Figma v5 Memory progress: one 73×6 segment per Memory in the Story.
const tones = {
  media: { done: "bg-surface/60", current: "bg-surface/60", todo: "bg-surface/25" },
  cream: { done: "bg-ink/95", current: "bg-ink/60", todo: "bg-ink/25" },
} as const;

export type SegmentedProgressProps = React.ComponentProps<"div"> & {
  count: number;
  /** Zero-based index of the Memory playing now. */
  current: number;
  /** "media" over video/photos, "cream" on the page background. */
  tone?: keyof typeof tones;
  label?: string;
};

export function SegmentedProgress({
  count,
  current,
  tone = "media",
  label = copy.ui.memoryProgress,
  className,
  ...props
}: SegmentedProgressProps) {
  const t = tones[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={Math.min(current + 1, count)}
      className={cn("flex items-center gap-2", className)}
      {...props}
    >
      {Array.from({ length: count }, (_, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: segments have no identity beyond position.
          key={i}
          className={cn(
            "h-1.5 w-[73px] shrink rounded-xs transition-colors duration-500 ease-memorai",
            i < current ? t.done : i === current ? t.current : t.todo,
          )}
        />
      ))}
    </div>
  );
}
