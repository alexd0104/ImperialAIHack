import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge must know our custom scale names, otherwise `text-18` and `text-ink`
// look like the same group and one silently drops the other.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["12", "13", "14", "15", "16", "17", "18", "20", "22", "28", "32", "40", "44"] },
      ],
      shadow: [
        {
          shadow: ["card", "polaroid", "object", "round-button", "heart", "house-control", "knob"],
        },
      ],
      rounded: [{ rounded: ["card", "screen"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
