import { copy } from "@/lib/copy";
import { slotBox } from "@/lib/house/layout";

// Figma "Empty Spot": a soft warm patch where a future Story will sit. Not interactive.
export function EmptySlot({ slot }: { slot: { x: number; y: number; scale: number } }) {
  const box = slotBox(slot, 0.35);
  return (
    <span
      role="img"
      aria-label={copy.house.emptySlot}
      data-testid="empty-slot"
      className="pointer-events-none absolute rounded-full bg-radial from-surface/70 via-surface/30 to-transparent to-70%"
      style={{ left: box.left, top: box.top + box.height, width: box.width, height: box.height }}
    />
  );
}
