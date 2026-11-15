import { Heart } from "lucide-react";
import type * as React from "react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

// Figma v5 Heart screen: 230 px gradient disc with a soft 440 px glow behind it. The one
// big target the person taps after each Memory.
export type HeartButtonProps = Omit<React.ComponentProps<"button">, "children"> & {
  label?: string;
};

export function HeartButton({
  className,
  label = copy.ui.heartButton,
  type = "button",
  ...props
}: HeartButtonProps) {
  return (
    <span className="relative inline-flex size-[440px] items-center justify-center">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-radial from-heart-from/45 via-heart-from/12 to-transparent to-70%"
      />
      <button
        type={type}
        aria-label={label}
        className={cn(
          "relative inline-flex size-[230px] cursor-pointer items-center justify-center rounded-full border-6 border-surface/80 bg-linear-to-b from-heart-from to-heart-to text-white shadow-heart transition-transform duration-300 ease-memorai active:scale-95",
          className,
        )}
        {...props}
      >
        <Heart className="size-24 fill-current" strokeWidth={0} aria-hidden />
      </button>
    </span>
  );
}
