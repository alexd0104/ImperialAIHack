import type { RoomStyle, Slot } from "@/lib/contracts";
import { copy } from "@/lib/copy";

// Objects are centred on (x, y) and sized by width (scale × 1194). The room SVGs draw no
// furniture, so each Slot rests its Object on a drawn surface: grass, the kitchen counter
// top (y 560–586) or the living-room floor (from y 614). Ids stay stable: saved Rooms use them.
export const roomStyles: Record<RoomStyle, { name: string; image: string; slots: Slot[] }> = {
  garden: {
    name: copy.studio.createHouse.rooms.garden,
    image: "/rooms/garden.svg",
    slots: [
      { id: "bench", x: 0.22, y: 0.68, scale: 0.18 },
      { id: "tree", x: 0.71, y: 0.42, scale: 0.24 },
      { id: "table", x: 0.5, y: 0.78, scale: 0.15 },
    ],
  },
  kitchen: {
    name: copy.studio.createHouse.rooms.kitchen,
    image: "/rooms/kitchen.svg",
    slots: [
      { id: "counter-left", x: 0.22, y: 0.565, scale: 0.18 },
      { id: "counter-right", x: 0.76, y: 0.565, scale: 0.18 },
      { id: "table", x: 0.5, y: 0.58, scale: 0.16 },
    ],
  },
  living: {
    name: copy.studio.createHouse.rooms.living,
    image: "/rooms/living-room.svg",
    slots: [
      { id: "shelf", x: 0.2, y: 0.71, scale: 0.18 },
      { id: "side-table", x: 0.79, y: 0.675, scale: 0.18 },
      { id: "coffee-table", x: 0.5, y: 0.79, scale: 0.18 },
    ],
  },
};
