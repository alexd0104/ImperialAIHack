import "server-only";
import { type Db, MongoClient } from "mongodb";

// One client per process. Next dev hot reload re-evaluates modules, so the cache lives
// on globalThis; otherwise every save would open a new connection pool to Atlas.
declare global {
  var __mhMongo: { uri: string; client: Promise<MongoClient> } | undefined;
}

// Env is read when a query runs, never at import time, so builds and CI need no DB.
function readEnv(): { uri: string; dbName: string } {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;
  if (!uri || !dbName) throw new Error("MONGODB_URI and MONGODB_DB must be set (.env.local)");
  return { uri, dbName };
}

export function getMongoClient(): Promise<MongoClient> {
  const { uri } = readEnv();
  if (globalThis.__mhMongo?.uri !== uri) {
    const client = new MongoClient(uri, {
      appName: "memorai",
      ignoreUndefined: true,
      // Fail fast (TECHNICAL.md §10): a blocked IP should surface in seconds, not 30 s.
      serverSelectionTimeoutMS: 8000,
    })
      .connect()
      .catch((error: unknown) => {
        // Do not cache a failed connection: the next request retries.
        globalThis.__mhMongo = undefined;
        throw error;
      });
    globalThis.__mhMongo = { uri, client };
  }
  // biome-ignore lint/style/noNonNullAssertion: set just above.
  return globalThis.__mhMongo!.client;
}

export async function getDb(): Promise<Db> {
  const { dbName } = readEnv();
  return (await getMongoClient()).db(dbName);
}

/** For scripts and tests; the server keeps its client for the process lifetime. */
export async function closeMongo(): Promise<void> {
  const cached = globalThis.__mhMongo;
  globalThis.__mhMongo = undefined;
  if (cached) await (await cached.client).close();
}
