"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";
import { segmentedItem, segmentedTrack } from "./tabs";

// Same segmented look as Tabs, for choices that do not switch panels (e.g. "keep
// original photo" vs "bring to life"). "primary" fills the chosen item in terracotta.
const itemVariants = cva(segmentedItem, {
  variants: {
    tone: {
      surface:
        "data-[state=on]:bg-surface data-[state=on]:font-bold data-[state=on]:text-ink data-[state=on]:shadow-card",
      primary: "data-[state=on]:bg-primary data-[state=on]:font-bold data-[state=on]:text-white",
    },
  },
  defaultVariants: { tone: "surface" },
});

export function ToggleGroup({
  className,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return <ToggleGroupPrimitive.Root className={cn(segmentedTrack, className)} {...props} />;
}

export function ToggleGroupItem({
  className,
  tone,
  ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item> & VariantProps<typeof itemVariants>) {
  return <ToggleGroupPrimitive.Item className={cn(itemVariants({ tone }), className)} {...props} />;
}
