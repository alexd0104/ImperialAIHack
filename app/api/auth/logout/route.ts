import { ok } from "@/lib/http";
import { SESSION_COOKIE } from "@/lib/session";

// Public in proxy.ts so signing out is idempotent even with an expired cookie.
export function POST() {
  const response = ok({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  );
  return response;
}
