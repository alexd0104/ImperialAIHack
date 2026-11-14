import type * as React from "react";
import { cn } from "@/lib/utils";

// Figma v5 "Family avatars": overlapping initials discs with a cream ring.
const tones = ["bg-avatar-honey", "bg-avatar-sage", "bg-avatar-rose"] as const;

/** Stable colour per position so the same family member keeps a colour across screens. */
export function avatarTone(index: number): (typeof tones)[number] {
  return tones[((index % tones.length) + tones.length) % tones.length];
}

/** First letter of the first two words, e.g. "Anne Marie" → "AM", "Léa" → "L". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => Array.from(word)[0]?.toUpperCase() ?? "")
    .join("");
}

const sizes = {
  40: "size-10 border-3 text-16 [&:not(:first-child)]:-ml-2.5",
  30: "size-7.5 border-[2.25px] text-12 [&:not(:first-child)]:-ml-1.75",
} as const;

export type AvatarGroupProps = React.ComponentProps<"ul"> & {
  people: readonly { name: string }[];
  size?: keyof typeof sizes;
};

export function AvatarGroup({ people, size = 40, className, ...props }: AvatarGroupProps) {
  return (
    <ul className={cn("flex items-center", className)} {...props}>
      {people.map((person, i) => (
        <li
          // Names can repeat in a family; position is the stable identity here.
          // biome-ignore lint/suspicious/noArrayIndexKey: see above.
          key={i}
          title={person.name}
          aria-label={person.name}
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full border-avatar-ring font-body font-bold text-white",
            sizes[size],
            avatarTone(i),
          )}
        >
          <span aria-hidden>{initials(person.name)}</span>
        </li>
      ))}
    </ul>
  );
}
