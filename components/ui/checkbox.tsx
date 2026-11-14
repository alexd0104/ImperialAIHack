"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Figma v5 Questions frame: 26 px box, 8 px radius, sage when checked.
export function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      className={cn(
        "peer inline-flex size-6.5 shrink-0 cursor-pointer items-center justify-center rounded-[8px] border-[1.5px] border-ink/45 bg-surface transition-colors duration-200 ease-memorai disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-success data-[state=checked]:bg-success",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-white">
        <Check className="size-4.5" strokeWidth={3} aria-hidden />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
