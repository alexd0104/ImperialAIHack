// Ambience bed library (P9): six short generated loops in public/beds/, committed once
// (`pnpm beds:make`). Pure module: the bundle builder, the tagger and the script share it.

export const BEDS = [
  {
    id: "beach",
    keywords: ["wave", "sea", "ocean", "beach", "shore", "surf", "seagull"],
    prompt: "gentle waves on a sandy beach, distant seagulls, calm, seamless loop",
  },
  {
    id: "crowd-laughter",
    keywords: ["laugh", "crowd", "people", "party", "chatter", "cheer", "children", "voices"],
    prompt: "warm family laughter and soft chatter in a room, friendly, seamless loop",
  },
  {
    id: "fireplace",
    keywords: ["fire", "fireplace", "crackl", "hearth", "log"],
    prompt: "quiet crackling fireplace, warm and steady, seamless loop",
  },
  {
    id: "garden-birds",
    keywords: ["bird", "garden", "tweet", "leaves", "wind", "park", "forest"],
    prompt: "birds singing softly in a sunny garden, light breeze, seamless loop",
  },
  {
    id: "kitchen",
    keywords: ["kitchen", "cook", "dish", "pan", "cutlery", "plate", "pot", "stove"],
    prompt: "calm home kitchen, soft clinking of dishes and a simmering pot, seamless loop",
  },
  {
    id: "rain",
    keywords: ["rain", "storm", "drizzle", "thunder", "drip"],
    prompt: "soft steady rain on a window, cosy, seamless loop",
  },
] as const;

export type BedId = (typeof BEDS)[number]["id"];

export function isBedId(id: unknown): id is BedId {
  return BEDS.some((b) => b.id === id);
}

/** Static, committed file: no token needed (it is not family media). */
export function bedUrl(id: BedId): string {
  return `/beds/${id}.mp3`;
}

/** Best bed for a scene's sound events, or undefined when nothing matches (silence is fine). */
export function pickBed(soundEvents: readonly string[] | undefined): BedId | undefined {
  if (!soundEvents?.length) return undefined;
  const text = soundEvents.join(" ").toLowerCase();
  let best: { id: BedId; score: number } | undefined;
  for (const bed of BEDS) {
    const score = bed.keywords.filter((k) => text.includes(k)).length;
    if (score > 0 && (!best || score > best.score)) best = { id: bed.id, score };
  }
  return best?.id;
}
