import { z } from "zod";
import {
  createSessionToken,
  passwordMatches,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  SESSION_SECRET_MIN_LENGTH,
} from "@/lib/session";

// TODO(F2): move to lib/contracts/ and switch to ok()/fail() from lib/http.ts once F2 is merged.
const LoginRequest = z.object({ password: z.string().min(1).max(200) });

function fail(status: number, code: string, message: string, retryable: boolean) {
  return Response.json({ error: { code, message, retryable } }, { status });
}

function isHttps(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  return (forwarded ?? new URL(request.url).protocol.replace(":", "")) === "https";
}

export async function POST(request: Request) {
  const password = process.env.STUDIO_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret || secret.length < SESSION_SECRET_MIN_LENGTH) {
    return fail(500, "not_configured", "Studio sign-in is not configured.", false);
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = LoginRequest.safeParse(body);
  if (!parsed.success) {
    return fail(400, "bad_request", "A password is required.", false);
  }

  if (!(await passwordMatches(parsed.data.password, password, secret))) {
    return fail(401, "invalid_password", "That password is not right.", true);
  }

  const response = Response.json({ data: { ok: true } });
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
