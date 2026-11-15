import { copy } from "@/lib/copy";

export const objectLibrary = [
  "watering-can",
  "flower",
  "sun-hat",
  "teapot",
  "mug",
  "apple",
  "record",
  "radio",
  "camera",
] as const;
export function objectLabel(name: (typeof objectLibrary)[number]) {
  return copy.studio.createStory.objects[name];
}
