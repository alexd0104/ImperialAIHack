import { Readable } from "node:stream";
import type { NextRequest } from "next/server";
import { findHouseByToken } from "@/lib/db";
import { fail } from "@/lib/http";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import {
  contentTypeFor,
  openReadStream,
  StoragePathError,
  statFile,
  storageSegments,
} from "@/lib/storage";
import { parseRange } from "@/lib/storage/range";

// Streams generated and uploaded files from STORAGE_DIR (never from public/, see
// TECHNICAL.md §10). proxy.ts leaves /api/files open because the House has no session,
// so access is checked here: a Studio session, or a House token (`?t=`) whose House owns
// the first path segment.

type Access = "ok" | "denied";

async function checkAccess(request: NextRequest, segments: string[]): Promise<Access> {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(session, process.env.SESSION_SECRET)) return "ok";

  const token = request.nextUrl.searchParams.get("t");
  if (!token) return "denied";

  // Demo mode runs offline with no DB (TECHNICAL.md §6), so the House id behind the demo
  // token cannot be looked up; the demo laptop only holds demo content. No default token:
  // demo access exists only when DEMO_HOUSE_TOKEN is set explicitly.
  const demoToken = process.env.DEMO_HOUSE_TOKEN;
  if (process.env.HOUSE_DEMO_MODE === "true" && demoToken && token === demoToken) {
    return "ok";
  }

  const house = await findHouseByToken(token);
  return house && house.id === segments[0] ? "ok" : "denied";
}

async function serve(
  request: NextRequest,
  ctx: RouteContext<"/api/files/[...path]">,
  head: boolean,
) {
  const { path: rawSegments } = await ctx.params;

  let segments: string[];
  try {
    segments = storageSegments(rawSegments);
  } catch (error) {
    if (error instanceof StoragePathError) return fail("validation_failed", "Invalid file path");
    throw error;
  }
  // A file always lives under a House folder: `<houseId>/<...>`.
  if (segments.length < 2) return fail("not_found", "File not found");

  let access: Access;
  try {
    access = await checkAccess(request, segments);
  } catch {
    // DB unreachable: retryable, and never leak the cause to the House.
    return fail("upstream_failed", "File temporarily unavailable");
  }
  if (access === "denied") return fail("unauthorized", "Not allowed");

  const info = await statFile(segments);
  if (!info) return fail("not_found", "File not found");

  const headers = new Headers({
    "Content-Type": contentTypeFor(segments.at(-1) ?? ""),
    "Accept-Ranges": "bytes",
    // Private: a token-scoped House file must not land in a shared cache. Short, so a
    // revoked House link stops working within minutes.
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
    // Stored files are media, never documents: an uploaded SVG/HTML cannot run script.
    "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'",
  });

  const range = parseRange(request.headers.get("range"), info.bytes);
  if (range === "unsatisfiable") {
    headers.set("Content-Range", `bytes */${info.bytes}`);
    return new Response(null, { status: 416, headers });
  }

  const status = range ? 206 : 200;
  const { start, end } = range ?? { start: 0, end: info.bytes - 1 };
  headers.set("Content-Length", String(info.bytes === 0 ? 0 : end - start + 1));
  if (range) headers.set("Content-Range", `bytes ${start}-${end}/${info.bytes}`);

  if (head || info.bytes === 0) return new Response(null, { status, headers });
  const body = Readable.toWeb(
    openReadStream(segments, { start, end }),
  ) as ReadableStream<Uint8Array>;
  return new Response(body, { status, headers });
}

export function GET(request: NextRequest, ctx: RouteContext<"/api/files/[...path]">) {
  return serve(request, ctx, false);
}

export function HEAD(request: NextRequest, ctx: RouteContext<"/api/files/[...path]">) {
  return serve(request, ctx, true);
}
