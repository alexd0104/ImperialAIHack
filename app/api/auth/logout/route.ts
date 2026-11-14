import { SESSION_COOKIE } from "@/lib/session";

// Public in proxy.ts so signing out is idempotent even with an expired cookie.
// TODO(F2): switch to ok() from lib/http.ts once F2 is merged.
export function POST() {
  const response = Response.json({ data: { ok: true } });
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`,
  );
  return response;
}
