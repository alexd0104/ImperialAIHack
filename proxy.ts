import { type NextRequest, NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { needsSession, SESSION_COOKIE, verifySessionToken } from "@/lib/session";

function noindex<R extends Response>(response: R): R {
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (needsSession(pathname)) {
    const signedIn = await verifySessionToken(
      request.cookies.get(SESSION_COOKIE)?.value,
      process.env.SESSION_SECRET,
    );
    if (!signedIn) {
      if (pathname.startsWith("/api/")) {
        return noindex(fail("unauthorized", "Please sign in."));
      }
      const login = new URL("/studio/login", request.url);
      login.searchParams.set("next", `${pathname}${search}`);
      return noindex(NextResponse.redirect(login));
    }
  }

  return noindex(NextResponse.next());
}

export const config = {
  // Skip build assets so a missing session never blocks CSS/JS; everything else gets noindex.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
