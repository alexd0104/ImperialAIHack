import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Three Figma badge families: status pills (Studio lists), the on-media chip (House,
// over video) and the photo chip (on polaroids / scene thumbnails).
export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full font-body",
  {
    variants: {
      variant: {
        approved: "bg-success-surface px-2.5 py-1 text-12 font-bold text-success-strong",
        attention: "bg-primary-strong px-2.5 py-1 text-12 font-bold text-white",
        neutral: "bg-surface-muted px-2.5 py-1 text-12 font-bold text-ink/80",
        media:
          "gap-2.5 border-[1.5px] border-surface/30 bg-overlay/45 py-2.25 pr-4 pl-3.5 text-17 font-semibold text-white backdrop-blur-[7px]",
        photo: "bg-surface/92 px-3.5 py-2 text-14 font-semibold text-ink",
        photoPrimary: "bg-primary-strong px-3.5 py-2 text-14 font-semibold text-white",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {variant === "media" && (
        <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-primary" />
      )}
      {children}
    </span>
  );
}
