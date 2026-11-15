// `pnpm db:indexes`: creates the indexes of TECHNICAL.md §6 in MONGODB_DB. Idempotent.
// Runs with plain Node (type stripping), so it imports only the dependency-free index list.
import { MongoClient } from "mongodb";
import { ensureIndexes } from "../lib/db/indexes.ts";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
if (!uri || !dbName) {
  console.error("✗ MONGODB_URI and MONGODB_DB must be set in .env.local");
  process.exit(1);
}

const client = new MongoClient(uri, { appName: "memorai-scripts", serverSelectionTimeoutMS: 8000 });
try {
  await client.connect();
  for (const name of await ensureIndexes(client.db(dbName))) console.log(`✓ ${name}`);
  console.log(`Indexes ready in ${dbName}.`);
} catch (error) {
  // Never print the URI: the driver error message does not include credentials.
  console.error(
    `✗ ${error instanceof Error ? `${error.name}: ${error.message}` : "unknown error"}`,
  );
  console.error("See TECHNICAL.md §10 (MongoServerSelectionError, auth failed).");
  process.exitCode = 1;
} finally {
  await client.close();
}
