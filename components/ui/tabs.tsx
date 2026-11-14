"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Segmented control look from Figma v5 (Studio filters): muted pill track, surface pill
// for the selected tab.
export const segmentedTrack =
  "inline-flex h-12 items-center gap-1 rounded-full bg-surface-muted p-1";
export const segmentedItem =
  "inline-flex h-full min-w-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-4.5 font-body text-15 font-semibold text-ink/70 transition-[background-color,color,box-shadow] duration-200 ease-memorai hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn(segmentedTrack, className)} {...props} />;
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        segmentedItem,
        "data-[state=active]:bg-surface data-[state=active]:font-bold data-[state=active]:text-ink data-[state=active]:shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("outline-none", className)} {...props} />;
}
