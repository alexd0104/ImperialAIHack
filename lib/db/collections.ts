import "server-only";
import { type Collection, type Filter, ObjectId } from "mongodb";
import type { z } from "zod";
import {
  Asset,
  Event,
  GenerationCacheEntry,
  House,
  Job,
  LabRun,
  Memory,
  Room,
  Scene,
  Story,
} from "@/lib/contracts";
import { getDb } from "./client";
import { fieldsToDoc, fromDoc, type MongoDoc, toDoc, toObjectId } from "./mapping";

// Typed access to every collection (TECHNICAL.md §6). Everything that leaves this module
// is parsed with its contract, so a malformed document fails loudly here, not in the UI.
//
// Filters are written in the Mongo shape: foreign keys are plain strings, dates are
// `Date`. Example: `await db.stories.find({ roomId })`.

export type NewEntity<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export type TypedCollection<T extends { id: string }> = {
  name: string;
  /** Raw driver collection, for atomic updates (job lease) and aggregations. */
  raw(): Promise<Collection<MongoDoc>>;
  /** Validates, assigns a new ObjectId unless `id` is given, inserts, returns the entity. */
  insert(input: NewEntity<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findOne(filter: Filter<MongoDoc>): Promise<T | null>;
  find(
    filter?: Filter<MongoDoc>,
    options?: { sort?: Record<string, 1 | -1>; limit?: number },
  ): Promise<T[]>;
  /** `$set` of the given fields; returns the updated entity or null if not found. */
  update(id: string, fields: Partial<Omit<T, "id">>): Promise<T | null>;
  deleteById(id: string): Promise<boolean>;
  deleteMany(filter: Filter<MongoDoc>): Promise<number>;
};

function typedCollection<T extends { id: string }>(
  name: string,
  schema: z.ZodType<T>,
): TypedCollection<T> {
  const raw = async () => (await getDb()).collection<MongoDoc>(name);
  const parse = (doc: Record<string, unknown> | null) => (doc ? schema.parse(fromDoc(doc)) : null);

  return {
    name,
    raw,
    async insert(input) {
      const entity = schema.parse({ ...input, id: input.id ?? new ObjectId().toHexString() });
      await (await raw()).insertOne(toDoc(entity));
      return entity;
    },
    async findById(id) {
      const _id = toObjectId(id);
      return _id ? parse(await (await raw()).findOne({ _id })) : null;
    },
    async findOne(filter) {
      return parse(await (await raw()).findOne(filter));
    },
    async find(filter = {}, options = {}) {
      let cursor = (await raw()).find(filter);
      if (options.sort) cursor = cursor.sort(options.sort);
      if (options.limit) cursor = cursor.limit(options.limit);
      return (await cursor.toArray()).map((doc) => schema.parse(fromDoc(doc)));
    },
    async update(id, fields) {
      const _id = toObjectId(id);
      if (!_id) return null;
      const doc = await (await raw()).findOneAndUpdate(
        { _id },
        { $set: fieldsToDoc(fields as Record<string, unknown>) },
        { returnDocument: "after" },
      );
      return parse(doc);
    },
    async deleteById(id) {
      const _id = toObjectId(id);
      return _id ? (await (await raw()).deleteOne({ _id })).deletedCount === 1 : false;
    },
    async deleteMany(filter) {
      return (await (await raw()).deleteMany(filter)).deletedCount;
    },
  };
}

export const db = {
  houses: typedCollection("houses", House),
  rooms: typedCollection("rooms", Room),
  stories: typedCollection("stories", Story),
  memories: typedCollection("memories", Memory),
  assets: typedCollection("assets", Asset),
  scenes: typedCollection("scenes", Scene),
  jobs: typedCollection("jobs", Job),
  events: typedCollection("events", Event),
  generationCache: typedCollection("generation_cache", GenerationCacheEntry),
  /** Creation-method lab (v2, F7); not tied to a House. */
  labRuns: typedCollection("lab_runs", LabRun),
};

/** A House by its private link token, unless revoked. */
export function findHouseByToken(token: string): Promise<House | null> {
  return db.houses.findOne({ token, tokenRevoked: { $ne: true } });
}

/** GDPR cascade, DB half (storage half: `deleteHouseFolder`). */
export async function deleteHouseDocuments(houseId: string): Promise<void> {
  const byHouse = { houseId };
  await Promise.all([
    db.rooms.deleteMany(byHouse),
    db.stories.deleteMany(byHouse),
    db.memories.deleteMany(byHouse),
    db.assets.deleteMany(byHouse),
    db.scenes.deleteMany(byHouse),
    db.jobs.deleteMany(byHouse),
    db.events.deleteMany(byHouse),
  ]);
  await db.houses.deleteById(houseId);
}
