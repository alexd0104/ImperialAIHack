import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Round icon-only buttons. 64 is the Studio close/rooms button; 76, 92 and 124 are the
// House controls (back, replay, play), all well above the 64 px House touch minimum.
export const iconButtonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full transition-[transform,background-color] duration-200 ease-memorai active:scale-95 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      size: {
        64: "size-16 [&_svg]:size-6.5",
        76: "size-19 [&_svg]:size-8.5",
        92: "size-23 [&_svg]:size-8.5",
        124: "size-31 [&_svg]:size-10",
      },
      tone: {
        surface: "bg-surface text-ink hover:bg-surface-muted",
        glass: "bg-surface/92 text-ink backdrop-blur-sm hover:bg-surface",
        primary: "bg-primary text-white hover:bg-primary/90",
      },
      elevation: {
        studio: "shadow-round-button",
        house: "shadow-house-control",
      },
    },
    defaultVariants: { size: 64, tone: "surface", elevation: "studio" },
  },
);

export type IconButtonProps = Omit<React.ComponentProps<"button">, "aria-label"> &
  VariantProps<typeof iconButtonVariants> & {
    /** Required: icon-only buttons need an accessible name. Comes from lib/copy.ts. */
    label: string;
  };

export function IconButton({
  className,
  size,
  tone,
  elevation,
  label,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(iconButtonVariants({ size, tone, elevation }), className)}
      {...props}
    />
  );
}
