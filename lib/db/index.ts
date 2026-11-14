import "server-only";

export { closeMongo, getDb, getMongoClient } from "./client";
export {
  db,
  deleteHouseDocuments,
  findHouseByToken,
  type NewEntity,
  type TypedCollection,
} from "./collections";
export { ensureIndexes, INDEXES } from "./indexes";
export { fromDoc, toDoc, toObjectId } from "./mapping";
