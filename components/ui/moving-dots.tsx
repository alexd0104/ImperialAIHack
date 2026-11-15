import type * as React from "react";
import { cn } from "@/lib/utils";

// Three soft dots, no text: the House waits with this only (no reading needed).
// Fixed box so it never shifts layout; static dots under reduced motion.
export function MovingDots({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div aria-hidden className={cn("flex h-4 items-center gap-2", className)} {...props}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-3 rounded-full bg-primary-strong/60 [animation:dot-float_1.2s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </div>
  );
}
