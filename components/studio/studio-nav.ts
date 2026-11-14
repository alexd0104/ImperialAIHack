import { copy } from "@/lib/copy";

const words = copy.studio.nav;

export type StudioSection = "home" | "create" | "care";
export type BackLink = { href: string; label: string };

/** The create flow, in order: Memory bank → questions → sheet → review → place. */
export const FLOW_STEPS = 5;

const memoryRoute = /^\/studio\/memories\/([^/]+)(?:\/(questions|sheet|review))?$/;
const placeRoute = /^\/studio\/stories\/[^/]+\/place$/;

function clean(pathname: string) {
  return pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
}

/** Keeps the House the family is working on in links back to the Studio home. */
export function withHouse(href: string, houseId?: string | null) {
  return houseId ? `${href}?house=${encodeURIComponent(houseId)}` : href;
}

/** Which header link is the current page; null on sign-in (no header there). */
export function activeSection(pathname: string): StudioSection | null {
  const path = clean(pathname);
  if (path === "/studio") return "home";
  if (path === "/studio/care") return "care";
  if (path.startsWith("/studio/login")) return null;
  return path.startsWith("/studio/") ? "create" : null;
}

/**
 * The logical parent of a Studio screen. Not history.back(): a deep link has no history,
 * so every inner screen names where "back" goes.
 */
export function studioParent(
  pathname: string,
  context: { houseId?: string | null; storyId?: string | null } = {},
): BackLink | null {
  const path = clean(pathname);
  const home = { href: withHouse("/studio", context.houseId), label: words.backTo.home };
  const memory = memoryRoute.exec(path);
  if (memory) {
    const base = `/studio/memories/${memory[1]}`;
    switch (memory[2]) {
      case "questions":
        return { href: base, label: words.backTo.bank };
      case "sheet":
        return { href: `${base}/questions`, label: words.backTo.questions };
      case "review":
        return { href: `${base}/sheet`, label: words.backTo.sheet };
      default:
        return context.storyId
          ? { href: `/studio/stories/${context.storyId}/place`, label: words.backTo.story }
          : home;
    }
  }
  if (path === "/studio" || path.startsWith("/studio/login") || !path.startsWith("/studio/"))
    return null;
  // care, house/new, stories/new, stories/[id]/memories/new and place all return home.
  return home;
}

/** "Step n of 5" on the create flow, null elsewhere. */
export function flowStep(pathname: string): number | null {
  const path = clean(pathname);
  if (placeRoute.test(path)) return 5;
  const memory = memoryRoute.exec(path);
  if (!memory) return null;
  return { questions: 2, sheet: 3, review: 4 }[memory[2] ?? ""] ?? 1;
}

/** The memory id when on a Memory bank page (its parent needs the Story id). */
export function bankMemoryId(pathname: string): string | null {
  const memory = memoryRoute.exec(clean(pathname));
  return memory && !memory[2] ? (memory[1] ?? null) : null;
}

export function stepLabel(step: number) {
  return words.step.replace("{n}", String(step)).replace("{total}", String(FLOW_STEPS));
}
