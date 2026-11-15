// `pnpm db:ping`: checks your Atlas connection end to end (connect, insert, read, delete one
// document in a scratch collection). Prints the DB name, never the URI.
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB;
if (!uri || !dbName) {
  console.error("✗ MONGODB_URI and MONGODB_DB must be set in .env.local");
  process.exit(1);
}

const client = new MongoClient(uri, { appName: "memorai-scripts", serverSelectionTimeoutMS: 8000 });
try {
  const started = Date.now();
  await client.connect();
  const collection = client.db(dbName).collection("_ping");
  const { insertedId } = await collection.insertOne({ at: new Date() });
  const read = await collection.findOne({ _id: insertedId });
  const { deletedCount } = await collection.deleteOne({ _id: insertedId });
  if (!read || deletedCount !== 1) throw new Error("insert/read/delete did not round-trip");
  console.log(`✓ ${dbName}: connect + insert + read + delete OK in ${Date.now() - started} ms`);
} catch (error) {
  console.error(
    `✗ ${error instanceof Error ? `${error.name}: ${error.message}` : "unknown error"}`,
  );
  console.error("See TECHNICAL.md §10 (MongoServerSelectionError, auth failed).");
  process.exitCode = 1;
} finally {
  await client.close();
}
