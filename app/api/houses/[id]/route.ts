import "server-only";
import { DeletedResponse, IdParams, UpdateHouseRequest } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { fail, ok, parseJson } from "@/lib/http";
import { deleteHouse, findHouse, houseDetail, updateHouse } from "../_house-ops";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const params = IdParams.safeParse(await context.params);
  if (!params.success) return fail("validation_failed", copy.studio.care.invalid, 422);
  try {
    const house = await findHouse(params.data.id);
    if (!house) return fail("not_found", copy.studio.care.missingHouse);
    return ok(await houseDetail(house));
  } catch {
    return fail("internal", copy.studio.care.loadError);
  }
}

export async function PATCH(request: Request, context: Context) {
  const params = IdParams.safeParse(await context.params);
  const input = await parseJson(request, UpdateHouseRequest);
  if (!params.success || !input.success)
    return fail("validation_failed", copy.studio.care.invalid, 422);
  try {
    const house = await updateHouse(params.data.id, input.data);
    if (!house) return fail("not_found", copy.studio.care.missingHouse);
    const { token: _token, ...rest } = house;
    return ok(rest);
  } catch {
    return fail("internal", copy.studio.care.saveError);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const params = IdParams.safeParse(await context.params);
  if (!params.success) return fail("validation_failed", copy.studio.care.invalid, 422);
  try {
    if (!(await deleteHouse(params.data.id)))
      return fail("not_found", copy.studio.care.missingHouse);
    return ok(DeletedResponse.parse({ deleted: true }));
  } catch {
    return fail("internal", copy.studio.care.deleteError);
  }
}
