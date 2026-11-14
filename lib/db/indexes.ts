import type { CreateIndexesOptions, Db, IndexSpecification } from "mongodb";

// No `server-only` and type-only imports: `scripts/db-indexes.ts` runs this file with
// plain Node (type stripping), outside Next. TECHNICAL.md §6.

export const INDEXES: {
  collection: string;
  key: IndexSpecification;
  options?: CreateIndexesOptions;
}[] = [
  {
    collection: "houses",
    key: { token: 1 },
    // Partial: a House without a token yet must not collide with another on `null`.
    options: { unique: true, partialFilterExpression: { token: { $type: "string" } } },
  },
  { collection: "jobs", key: { status: 1 } },
  { collection: "events", key: { houseId: 1 } },
  { collection: "generation_cache", key: { key: 1 }, options: { unique: true } },
  { collection: "stories", key: { roomId: 1 } },
];

/** Idempotent: re-running with the same specs is a no-op in Mongo. */
export async function ensureIndexes(db: Db): Promise<string[]> {
  const names: string[] = [];
  for (const { collection, key, options } of INDEXES) {
    names.push(`${collection}.${await db.collection(collection).createIndex(key, options)}`);
  }
  return names;
}
