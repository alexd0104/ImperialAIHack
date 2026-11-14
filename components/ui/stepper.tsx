import { Check } from "lucide-react";
import type * as React from "react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

export type StepState = "done" | "current" | "todo";

export function stepState(index: number, current: number): StepState {
  if (index < current) return "done";
  return index === current ? "current" : "todo";
}

// Figma v5 Studio header stepper. Done and todo labels use ink/0.7 (Figma has 0.75 and
// 0.45; 0.45 fails AA on cream, see zone rule).
export type StepperProps = React.ComponentProps<"ol"> & {
  steps: readonly string[];
  /** Zero-based index of the current step. */
  current: number;
};

export function Stepper({ steps, current, className, ...props }: StepperProps) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-7", className)} {...props}>
      {steps.map((label, i) => {
        const state = stepState(i, current);
        return (
          <li
            key={label}
            aria-current={state === "current" ? "step" : undefined}
            className="flex items-center gap-2.5"
          >
            <span
              aria-hidden
              className={cn(
                "flex size-7.5 shrink-0 items-center justify-center rounded-full text-14 font-bold",
                state === "done" && "bg-success text-white",
                state === "current" && "bg-primary text-white",
                state === "todo" && "border-[1.5px] border-ink/20 text-ink/70",
              )}
            >
              {state === "done" ? <Check className="size-4" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                "text-16 whitespace-nowrap",
                state === "current" ? "font-bold text-ink" : "font-semibold text-ink/70",
              )}
            >
              {label}
              {state !== "todo" && (
                <span className="sr-only">
                  {", "}
                  {state === "done" ? copy.ui.stepDone : copy.ui.stepCurrent}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
