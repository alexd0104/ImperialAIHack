import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

export const cardVariants = cva("rounded-card bg-surface text-ink shadow-card", {
  variants: {
    padding: { none: "", sm: "p-3.5", md: "p-6" },
  },
  defaultVariants: { padding: "md" },
});

export type CardProps = React.ComponentProps<"div"> & VariantProps<typeof cardVariants>;

export function Card({ className, padding, ...props }: CardProps) {
  return <div className={cn(cardVariants({ padding }), className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("font-display text-22 leading-tight text-ink", className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-16 leading-normal text-ink/70", className)} {...props} />;
}
