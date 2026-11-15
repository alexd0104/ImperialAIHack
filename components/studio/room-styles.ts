import type { RoomStyle, Slot } from "@/lib/contracts";
import { copy } from "@/lib/copy";

// Objects are centred on (x, y) and sized by width (scale × 1194). The room SVGs draw no
// furniture, so each Slot rests its Object on a drawn surface: grass, the kitchen counter
// top (y 560–586) or the living-room floor (from y 614). Ids stay stable: saved Rooms use them.
// Room photos made by `pnpm rooms:make` (public/rooms/<name>.jpg). A style uses its photo when
// listed here, its drawn SVG otherwise, so a missing photo never leaves a Room blank.
const photoRooms: readonly string[] = ["garden", "kitchen", "living-room"];
const roomImage = (name: string) => `/rooms/${name}.${photoRooms.includes(name) ? "jpg" : "svg"}`;

export const roomStyles: Record<RoomStyle, { name: string; image: string; slots: Slot[] }> = {
  garden: {
    name: copy.studio.createHouse.rooms.garden,
    image: roomImage("garden"),
    slots: [
      // Photo surfaces: grass in front, grass under the chestnut tree, garden table top.
      { id: "bench", x: 0.58, y: 0.84, scale: 0.14 },
      { id: "tree", x: 0.84, y: 0.8, scale: 0.14 },
      { id: "table", x: 0.25, y: 0.665, scale: 0.12 },
    ],
  },
  kitchen: {
    name: copy.studio.createHouse.rooms.kitchen,
    image: roomImage("kitchen"),
    slots: [
      // Photo surfaces: back counter either side of the sink, front island.
      { id: "counter-left", x: 0.36, y: 0.57, scale: 0.12 },
      { id: "counter-right", x: 0.79, y: 0.585, scale: 0.1 },
      { id: "table", x: 0.5, y: 0.68, scale: 0.14 },
    ],
  },
  living: {
    name: copy.studio.createHouse.rooms.living,
    image: roomImage("living-room"),
    slots: [
      // Photo surfaces: fireplace mantel, console table, coffee table top.
      { id: "shelf", x: 0.13, y: 0.43, scale: 0.12 },
      { id: "side-table", x: 0.47, y: 0.5, scale: 0.12 },
      { id: "coffee-table", x: 0.74, y: 0.71, scale: 0.14 },
    ],
  },
};
