import "server-only";

/**
 * Deterministic safety net for the family's free text (TECHNICAL.md §7.2).
 * Claude is the primary judge; this catches the obvious requests to add,
 * remove or change something even when Claude is down, in mock mode, or
 * misses one, so the Studio can always tell the family gently. It only
 * reports: free text never reaches a model except through the compiler.
 */

// Requests to put something that is not in the photo into it.
const ADD = /\b(add|adding|insert|paste|draw|put|bring in|photoshop|superimpose)\b/i;
// Requests to take something that is in the photo out of it.
const REMOVE = /\b(remove|erase|delete|take out|take away|get rid of|crop out|cut out|hide)\b/i;
// Requests to alter people, objects or places.
const CHANGE = /\b(replace|swap|change|turn\s+\w+(\s+\w+)?\s+into|transform)\b/i;
// Motion or expressions that would make a person do something they never did.
const ACT =
  /\bmake\s+(him|her|them|it|us|me|grandpa|grandma|granny|mum|mom|dad|[A-Z][a-z]+)\s+(smile|wave|dance|walk|run|talk|speak|sing|laugh|cry|kiss|hug|stand|sit|turn|look|wink|jump|younger|older|happier)\b/i;

// Things the family may legitimately ask for that sound like edits.
const ALLOWED_TOPIC =
  /\b(sound|sounds|noise|noises|ambience|ambient|birdsong|colou?r|colou?rs|colou?rise|colou?rize|scratch|scratches|dust|restore|sharpen|brighten)\b/i;
const NEGATION = /\b(don'?t|do not|never|no need to|without|nothing|not)\b/i;

const MAX_ITEMS = 5;
const MAX_ITEM_CHARS = 200;

/** Splits on sentences, lines, and "and/but" that start a new request. */
function clauses(text: string): string[] {
  return text
    .split(/[.!?;\n]+/)
    .flatMap((sentence) => sentence.split(/,?\s+(?:and|but|also|then)\s+(?=(?:please\s+)?\w)/i))
    .flatMap((part) => part.split(/,\s+/))
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function isEditRequest(clause: string): boolean {
  const verb = clause.match(ADD) ?? clause.match(REMOVE) ?? clause.match(CHANGE) ?? null;
  if (verb) {
    // "please don't add anything" is a wish we already honour, not a request to refuse.
    const before = clause.slice(0, verb.index ?? 0);
    if (NEGATION.test(before)) return false;
    // "add the sound of the waves" or "add colour" are handled by other steps.
    if (ALLOWED_TOPIC.test(clause) && !/\bmusic\b/i.test(clause)) return false;
    return true;
  }
  return ACT.test(clause);
}

/** Quotes (trimmed) of the free-text requests that ask to add, remove or change content. */
export function detectRefusedRequests(freeText: string | undefined): string[] {
  if (!freeText?.trim()) return [];
  return clauses(freeText)
    .filter(isEditRequest)
    .map((clause) => clause.slice(0, MAX_ITEM_CHARS));
}

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Model refusals first, then detected ones the model did not already cover.
 * Deduplicated loosely (one quote containing the other counts as the same).
 */
export function mergeRefusedRequests(fromModel: string[], detected: string[]): string[] {
  const merged: string[] = [];
  const seen: string[] = [];
  for (const raw of [...fromModel, ...detected]) {
    const item = raw.trim().slice(0, MAX_ITEM_CHARS);
    const key = normalise(item);
    if (!key) continue;
    if (seen.some((other) => other.includes(key) || key.includes(other))) continue;
    seen.push(key);
    merged.push(item);
    if (merged.length === MAX_ITEMS) break;
  }
  return merged;
}
