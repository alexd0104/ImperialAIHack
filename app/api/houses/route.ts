import "server-only";
import { CreateHouseRequest, House } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";
import { createMockHouse, creationId } from "./_mock-store";

export async function POST(request: Request) {
  const input = await parseJson(request, CreateHouseRequest);
  const id = creationId(request);
  if (!input.success || !id)
    return fail("validation_failed", copy.studio.createHouse.invalidHouse, 422);
  try {
    const house = await createMockHouse(id, input.data);
    if (house.firstName !== input.data.firstName)
      return fail("conflict", copy.studio.createHouse.conflict);
    // Private House links are only exposed by the dedicated link endpoint.
    return ok(House.omit({ token: true }).parse(house), 201);
  } catch {
    return fail("internal", copy.studio.createHouse.saveError);
  }
}
