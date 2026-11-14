// No `import "server-only"`: proxy.ts imports this module. It only uses Web Crypto,
// so it runs in both the Node and edge runtimes, and it never exposes the secret.

export const SESSION_COOKIE = "mh_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const SESSION_SECRET_MIN_LENGTH = 32;

const encoder = new TextEncoder();

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

// Constant-time so the comparison does not leak how many leading characters matched.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** A short secret makes forged cookies guessable, so both issuing and verifying refuse it. */
export function isUsableSecret(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.length >= SESSION_SECRET_MIN_LENGTH;
}

/** Token format: `<expiresAtMs>.<base64url HMAC-SHA256(expiresAtMs)>`. */
export async function createSessionToken(secret: string, now = Date.now()): Promise<string> {
  if (!isUsableSecret(secret)) {
    throw new Error(`SESSION_SECRET must be at least ${SESSION_SECRET_MIN_LENGTH} characters`);
  }
  const expiresAt = String(now + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expiresAt}.${await hmac(secret, `session:${expiresAt}`)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  // Fail closed: without a usable secret nobody is signed in, even with a well-signed cookie.
  if (!token || !isUsableSecret(secret)) return false;
  const [expiresAt, signature, extra] = token.split(".");
  if (!expiresAt || !signature || extra !== undefined || !/^\d+$/.test(expiresAt)) return false;
  if (Number(expiresAt) <= now) return false;
  return timingSafeEqual(signature, await hmac(secret, `session:${expiresAt}`));
}

/** Compares HMACs of both values, so neither the content nor the length of the password leaks. */
export async function passwordMatches(candidate: string, expected: string, secret: string) {
  return timingSafeEqual(
    await hmac(secret, `password:${candidate}`),
    await hmac(secret, `password:${expected}`),
  );
}

// TECHNICAL.md §4.1. The House reads its own token-scoped routes; /api/files does its
// own check (session or House token) in its handler, since the House has no session.
const PUBLIC_PATHS = [
  "/studio/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/h",
  "/api/files",
];
const GUARDED_PATHS = ["/studio", "/api"];

function under(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function needsSession(pathname: string): boolean {
  if (PUBLIC_PATHS.some((base) => under(pathname, base))) return false;
  return GUARDED_PATHS.some((base) => under(pathname, base));
}

/** Only same-origin Studio paths, so `?next=` cannot become an open redirect. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next?.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/studio";
  return under(next.split(/[?#]/)[0] ?? "", "/studio") ? next : "/studio";
}
