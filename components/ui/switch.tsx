"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Figma v5 "Toggle": 56×32 track, 26 px knob, 3 px inset.
export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-xl p-0.75 transition-colors duration-200 ease-memorai disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-switch-on data-[state=unchecked]:bg-switch-off",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-6.5 rounded-full bg-white shadow-knob transition-transform duration-200 ease-memorai data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}
