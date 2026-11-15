import "server-only";
import { Job } from "@/lib/contracts";
import { db } from "@/lib/db/collections";
import { fieldsToDoc, fromDoc, toObjectId } from "@/lib/db/mapping";
import type { CacheRepo, JobRepo } from "./types";

const ACTIVE = { status: { $in: ["queued", "running"] } };

function free(now: Date) {
  return {
    $or: [
      { lockedUntil: null },
      { lockedUntil: { $exists: false } },
      { lockedUntil: { $lt: now } },
    ],
  };
}

/** MongoDB implementation of the engine's job store (TECHNICAL.md §5.2). */
export const mongoJobRepo: JobRepo = {
  get: (id) => db.jobs.findById(id),

  async acquireLease(id, now, until) {
    const _id = toObjectId(id);
    if (!_id) return null;
    const doc = await (await db.jobs.raw()).findOneAndUpdate(
      { _id, ...free(new Date(now)) },
      { $set: { lockedUntil: new Date(until) } },
      { returnDocument: "after" },
    );
    return doc ? Job.parse(fromDoc(doc)) : null;
  },

  async save(job, lease) {
    const _id = toObjectId(job.id);
    if (!_id) return false;
    const { steps, current, status, updatedAt } = job;
    const res = await (await db.jobs.raw()).updateOne(
      { _id, lockedUntil: new Date(lease) },
      { $set: fieldsToDoc({ steps, current, status, updatedAt }) },
    );
    return res.matchedCount === 1;
  },

  async release(id, lease, notBefore) {
    const _id = toObjectId(id);
    if (!_id) return;
    await (await db.jobs.raw()).updateOne(
      { _id, lockedUntil: new Date(lease) },
      { $set: { lockedUntil: notBefore ? new Date(notBefore) : null } },
    );
  },

  async countRunningFal() {
    // A job has at most one running step, so counting jobs counts requests.
    return (await db.jobs.raw()).countDocuments({
      ...ACTIVE,
      steps: { $elemMatch: { status: "running", falRequestId: { $exists: true } } },
    });
  },

  async spentUsd(falKeyLabel) {
    const [row] = await (await db.jobs.raw())
      .aggregate<{ total: number }>([
        { $match: { falKeyLabel } },
        { $unwind: "$steps" },
        { $group: { _id: null, total: { $sum: { $ifNull: ["$steps.costUsd", 0] } } } },
      ])
      .toArray();
    return row?.total ?? 0;
  },

  async listAdvanceable(now, limit) {
    const docs = await (await db.jobs.raw())
      .find({ ...ACTIVE, ...free(new Date(now)) }, { projection: { _id: 1 } })
      .sort({ createdAt: 1 })
      .limit(limit)
      .toArray();
    return docs.map((doc) => doc._id.toHexString());
  },
};

export const mongoCacheRepo: CacheRepo = {
  get: (key) => db.generationCache.findOne({ key }),
  async put(entry) {
    const { key, ...rest } = entry;
    await (await db.generationCache.raw()).updateOne(
      { key },
      { $set: fieldsToDoc(rest) },
      { upsert: true },
    );
  },
};
