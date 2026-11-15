import { HouseBundle, type HouseMode } from "@/lib/contracts";

// The one place the House UI gets its bundle from (client side).

export async function fetchHouseBundle(
  token: string,
  mode: HouseMode,
  fetchImpl: typeof fetch = fetch,
): Promise<HouseBundle | null> {
  try {
    const response = await fetchImpl(`/api/h/${encodeURIComponent(token)}/bundle?mode=${mode}`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { data?: unknown };
    const parsed = HouseBundle.safeParse(body.data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Fire-and-forget: a lost Heart or view event must never disturb the person watching. */
export function sendHouseEvent(
  token: string,
  type: "heart" | "view_started" | "view_completed",
  memoryId: string,
): void {
  fetch(`/api/h/${encodeURIComponent(token)}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, memoryId }),
    keepalive: true,
  }).catch(() => {});
}
