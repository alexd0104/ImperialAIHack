import { LoginRequest } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";
import {
  createSessionToken,
  isUsableSecret,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

function isHttps(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwarded ?? new URL(request.url).protocol.replace(":", "")) === "https";
}

export async function POST(request: Request) {
  const password = process.env.STUDIO_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !isUsableSecret(secret)) {
    // Not retryable: only fixing .env.local helps (see .env.example).
    return fail("internal", copy.auth.notConfigured, 500, false);
  }

  const body = await parseJson(request, LoginRequest);
  // 422 per docs/playbooks/add-api-route.md (well-formed request, invalid content).
  if (!body.success) return fail("validation_failed", body.message, 422);

  if (!(await passwordMatches(body.data.password, password, secret))) {
    // Retryable: the person can simply type the password again.
    return fail("unauthorized", copy.auth.wrongPassword, 401, true);
  }

  const response = ok({ ok: true });
  const cookie = [
    `${SESSION_COOKIE}=${await createSessionToken(secret)}`,
    "Path=/",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    "HttpOnly",
    "SameSite=Lax",
    // Follow the real protocol, not NODE_ENV: `pnpm demo` serves a production build over
    // plain http on a LAN IP, where browsers would silently drop a Secure cookie.
    ...(isHttps(request) ? ["Secure"] : []),
  ].join("; ");
  response.headers.append("Set-Cookie", cookie);
  return response;
}
