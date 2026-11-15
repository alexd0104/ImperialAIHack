import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/lib/utils";

// Figma v5 Studio fields: "md" is the form field (cream fill), "lg" the single big
// question field (surface fill, larger text).
export const inputVariants = cva(
  "w-full min-w-0 font-body text-ink outline-none transition-[border-color,box-shadow] duration-200 ease-memorai placeholder:text-ink/70 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
  {
    variants: {
      size: {
        md: "h-14 rounded-lg border-[1.5px] border-ink/10 bg-background px-4.5 py-3.5 text-16",
        lg: "h-16 rounded-xl border-[1.5px] border-ink/12 bg-surface px-5 text-18 font-semibold",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  VariantProps<typeof inputVariants>;

export function Input({ className, size, type = "text", ...props }: InputProps) {
  return <input type={type} className={cn(inputVariants({ size }), className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        inputVariants({ size: "md" }),
        "h-auto min-h-28 resize-y leading-normal",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: callers pass htmlFor or wrap the control.
    <label className={cn("font-body text-15 font-bold text-ink/70", className)} {...props} />
  );
}
