import "server-only";
import { ObjectId } from "mongodb";

// The boundary between API shapes (lib/contracts: string `id`, ISO date strings) and
// Mongo documents (`_id: ObjectId`, BSON Date). Foreign keys (houseId, roomId, …) stay
// strings in Mongo, so callers query them with the same string the API uses.

/** Fields stored as BSON Date, at any depth (e.g. `choice.chosenAt`). */
const DATE_KEYS = new Set([
  "createdAt",
  "updatedAt",
  "consentAt",
  "publishedAt",
  "at",
  "chosenAt",
  "lockedUntil",
  "falUrlExpiresAt",
]);

export type MongoDoc = { _id: ObjectId } & Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && value.constructor === Object;
}

/** Invalid ids never reach Mongo: callers treat `null` as "not found". */
export function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) && /^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : null;
}

function datesToBson(value: unknown, key?: string): unknown {
  if (key && DATE_KEYS.has(key) && typeof value === "string") return new Date(value);
  if (Array.isArray(value)) return value.map((v) => datesToBson(v));
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, datesToBson(v, k)]),
    );
  }
  return value;
}

function bsonToApi(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ObjectId) return value.toHexString();
  if (Array.isArray(value)) return value.map(bsonToApi);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, bsonToApi(v)]));
  }
  return value;
}

/** Fields of an entity (without `id`) → Mongo shape. Also used for `$set` patches. */
export function fieldsToDoc(fields: Record<string, unknown>): Record<string, unknown> {
  const { id: _ignored, ...rest } = fields;
  return datesToBson(rest) as Record<string, unknown>;
}

/** API entity → Mongo document. Throws on an id that is not an ObjectId. */
export function toDoc(entity: { id: string } & Record<string, unknown>): MongoDoc {
  const _id = toObjectId(entity.id);
  if (!_id) throw new Error(`Not an ObjectId: ${entity.id}`);
  return { _id, ...fieldsToDoc(entity) };
}

/** Mongo document → plain API object (still unvalidated: parse it with the contract). */
export function fromDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = doc;
  return { id: bsonToApi(_id), ...(bsonToApi(rest) as Record<string, unknown>) };
}
