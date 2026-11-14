// Per-IP throttle for Studio sign-in (B1). In-memory is enough: one Node process serves
// the hackathon demo, and a restart only hands out a few extra guesses.

export type ThrottleOptions = {
  /** Wrong passwords answered normally; the last of them starts the first lockout. */
  freeAttempts?: number;
  /** First lockout; doubles with every further wrong password. */
  baseLockMs?: number;
  maxLockMs?: number;
  /** An IP with no attempt for this long (and not locked) starts fresh. */
  idleResetMs?: number;
  /** Hard cap on tracked IPs so a flood of spoofed addresses cannot grow memory. */
  maxEntries?: number;
  now?: () => number;
};

type Entry = { failures: number; lockedUntil: number; lastSeen: number };

export type ThrottleCheck = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function createLoginThrottle(options: ThrottleOptions = {}) {
  const {
    freeAttempts = 5,
    baseLockMs = 5_000,
    maxLockMs = 5 * 60_000,
    idleResetMs = 15 * 60_000,
    maxEntries = 1_000,
    now = Date.now,
  } = options;
  const entries = new Map<string, Entry>();

  const expired = (entry: Entry, t: number) =>
    t - entry.lastSeen > idleResetMs && t >= entry.lockedUntil;

  function live(key: string, t: number): Entry | undefined {
    const entry = entries.get(key);
    if (entry && expired(entry, t)) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  function makeRoom(t: number) {
    for (const [key, entry] of entries) if (expired(entry, t)) entries.delete(key);
    // Map keeps insertion order and every failure re-inserts, so the first key is the stalest.
    while (entries.size >= maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }

  return {
    check(key: string): ThrottleCheck {
      const t = now();
      const entry = live(key, t);
      if (!entry || t >= entry.lockedUntil) return { allowed: true };
      return { allowed: false, retryAfterSeconds: Math.ceil((entry.lockedUntil - t) / 1000) };
    },
    recordFailure(key: string) {
      const t = now();
      const previous = live(key, t);
      entries.delete(key);
      if (!previous) makeRoom(t);
      const failures = (previous?.failures ?? 0) + 1;
      const over = failures - freeAttempts + 1;
      const lockedUntil = over > 0 ? t + Math.min(baseLockMs * 2 ** (over - 1), maxLockMs) : 0;
      entries.set(key, { failures, lockedUntil, lastSeen: t });
    },
    recordSuccess(key: string) {
      entries.delete(key);
    },
    clear() {
      entries.clear();
    },
    get size() {
      return entries.size;
    },
  };
}

export type LoginThrottle = ReturnType<typeof createLoginThrottle>;

/** Shared by the login route; tests call `clear()` between cases. */
export const loginThrottle = createLoginThrottle();

/** First `x-forwarded-for` hop; one shared bucket when there is none (e.g. local dev). */
export function clientKey(request: Request): string {
  const first = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || "unknown";
}
