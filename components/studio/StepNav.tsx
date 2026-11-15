import Link from "next/link";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { FLOW_STEPS, stepHref, stepLabel } from "./studio-nav";

const words = copy.studio.nav;

type Props = {
  current: number;
  memoryId: string | null;
  storyId: string | null;
};

/** Clickable stepper for the create flow: earlier steps link, the rest are plain. */
export function StepNav({ current, memoryId, storyId }: Props) {
  return (
    <nav aria-label={words.stepsLabel}>
      <p className="sr-only">{stepLabel(current)}</p>
      <ol className="flex items-center gap-1">
        {words.steps.slice(0, FLOW_STEPS).map((label, index) => {
          const step = index + 1;
          const href = stepHref(step, current, { memoryId, storyId });
          const style = cn(
            "inline-flex min-h-11 items-center rounded-full px-3 text-14",
            step === current ? "bg-surface font-bold text-ink" : "text-ink/70",
            href && "underline hover:text-ink",
          );
          return (
            <li key={label}>
              {href ? (
                <Link href={href} className={style}>
                  {label}
                </Link>
              ) : (
                <span aria-current={step === current ? "step" : undefined} className={style}>
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
