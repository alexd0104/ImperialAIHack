import type * as React from "react";
import { cn } from "@/lib/utils";
import { ShimmerBar } from "./shimmer-bar";

export type StepProgressProps = React.ComponentProps<"div"> & {
  /** Real step name from the job status, already in user words. */
  stepLabel: string;
  done: number;
  total: number;
  /** Optional "about 2 minutes" text; keeps its line so nothing shifts. */
  estimate?: string;
};

export function StepProgress({
  stepLabel,
  done,
  total,
  estimate,
  className,
  ...props
}: StepProgressProps) {
  return (
    <div role="status" className={cn("flex flex-col gap-2", className)} {...props}>
      <p className="text-20">{stepLabel}</p>
      <ShimmerBar value={total > 0 ? done / total : undefined} />
      <p className="min-h-6 text-14 text-ink/70">{estimate ?? ""}</p>
    </div>
  );
}
