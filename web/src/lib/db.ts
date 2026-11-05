import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as { mongo?: Promise<MongoClient> };

// One client per process; dev hot reloads would otherwise open a new pool each time.
export async function db() {
  globalForMongo.mongo ??= new MongoClient(process.env.MONGO_URL!).connect();
  return (await globalForMongo.mongo).db("hyperlore");
}
