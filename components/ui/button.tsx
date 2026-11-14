import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Figma v5 "Button": pill, Nunito Bold 18, padding 18/30. The Figma component is still
// dark (#2B2420); screens use terracotta for the main action, which is what we ship.
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2.5 whitespace-nowrap rounded-full font-body font-bold transition-[background-color,box-shadow,transform] duration-200 ease-memorai active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary/90",
        secondary: "border-[1.5px] border-ink/14 bg-surface text-ink hover:bg-surface-muted",
      },
      size: {
        md: "min-h-16 px-7.5 py-4.5 text-18 [&_svg]:size-5",
        sm: "min-h-12 px-5 py-3 text-16 [&_svg]:size-4.5",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
