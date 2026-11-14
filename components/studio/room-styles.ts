import type { RoomStyle, Slot } from "@/lib/contracts";
import { copy } from "@/lib/copy";

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
      { id: "counter-left", x: 0.24, y: 0.62, scale: 0.18 },
      { id: "counter-right", x: 0.72, y: 0.62, scale: 0.18 },
      { id: "table", x: 0.5, y: 0.8, scale: 0.18 },
    ],
  },
  living: {
    name: copy.studio.createHouse.rooms.living,
    image: "/rooms/living-room.svg",
    slots: [
      { id: "shelf", x: 0.23, y: 0.48, scale: 0.18 },
      { id: "side-table", x: 0.76, y: 0.65, scale: 0.18 },
      { id: "coffee-table", x: 0.5, y: 0.79, scale: 0.18 },
    ],
  },
};
