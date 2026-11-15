import type { NextRequest } from "next/server";
import { BundleQuery } from "@/lib/contracts";
import { loadHouseBundle } from "@/lib/house/load-bundle";
import { fail, ok } from "@/lib/http";

// GET /api/h/:token/bundle?mode=together|alone → HouseBundle (TECHNICAL.md §4.3).
export async function GET(request: NextRequest, ctx: RouteContext<"/api/h/[token]/bundle">) {
  const { token } = await ctx.params;
  const query = BundleQuery.safeParse({
    mode: request.nextUrl.searchParams.get("mode") ?? undefined,
  });
  if (!query.success) return fail("validation_failed", "mode must be together or alone");

  try {
    const bundle = await loadHouseBundle(token, query.data.mode);
    if (!bundle) return fail("not_found", "House not found");
    const response = ok(bundle);
    // Freshly published Stories must show on the next load (C3).
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    // DB unreachable: retryable, and the cause never reaches the House.
    return fail("upstream_failed", "House temporarily unavailable");
  }
}
