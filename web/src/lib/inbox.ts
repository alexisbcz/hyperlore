import { Redis } from "@upstash/redis";

// Where visitors' company requests and corrections go: the local DocumentDB during development,
// Upstash Redis once deployed. Company requests are also posted to Discord when
// DISCORD_WEBHOOK_URL is set. With none configured, the forms say they're closed.

export type CompanyRequest = { key: string; name: string; domain: string; votes: number };
export type Correction = { event: string; claim: string; source: string; contact: string };

const hasRedis = () => Boolean(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL);

const hasStore = () => Boolean(process.env.MONGO_URL) || hasRedis();

export const inboxOpen = () => hasStore() || Boolean(process.env.DISCORD_WEBHOOK_URL);

async function mongo() {
  const { db } = await import("./db");
  return db();
}

/** Adds a vote for the company and posts it to Discord; returns true if this is its first request. */
export async function addRequest(req: Omit<CompanyRequest, "votes">, note: string): Promise<boolean> {
  if (!hasStore()) {
    await notifyDiscord(req, note, true);
    return true;
  }
  const isNew = await storeRequest(req, note);
  // Stored already, so a Discord failure shouldn't fail the visitor's request.
  await notifyDiscord(req, note, isNew).catch((err) => console.error("Discord webhook failed:", err));
  return isNew;
}

async function notifyDiscord(req: Omit<CompanyRequest, "votes">, note: string, isNew: boolean) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return;
  const fields = [
    req.domain && { name: "Domain", value: req.domain, inline: true },
    note && { name: "Note", value: note.slice(0, 1024) },
  ].filter(Boolean);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      embeds: [{ title: `${isNew ? "New company request" : "Another vote"}: ${req.name}`.slice(0, 256), fields }],
    }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Discord webhook returned ${res.status}`);
}

async function storeRequest(req: Omit<CompanyRequest, "votes">, note: string): Promise<boolean> {
  const at = new Date().toISOString();
  if (process.env.MONGO_URL) {
    const res = await (await mongo()).collection<{ _id: string }>("requests").updateOne(
      { _id: req.key },
      {
        $setOnInsert: { name: req.name, domain: req.domain, status: "queued", created_at: at },
        $inc: { votes: 1 },
        ...(note && { $push: { notes: note } }),
      },
      { upsert: true },
    );
    return res.upsertedCount > 0;
  }
  const redis = Redis.fromEnv();
  const isNew = (await redis.hsetnx(`request:${req.key}`, "name", req.name)) === 1;
  if (isNew) await redis.hset(`request:${req.key}`, { domain: req.domain, created_at: at, status: "queued" });
  if (note) await redis.rpush(`request:${req.key}:notes`, note);
  await redis.zincrby("requests", 1, req.key);
  return isNew;
}

/** The most-voted queued requests, or null when requests aren't stored anywhere (Discord only). */
export async function topRequests(limit = 10): Promise<CompanyRequest[] | null> {
  if (!hasStore()) return null;
  if (process.env.MONGO_URL) {
    const docs = await (await mongo()).collection("requests").find({ status: "queued" }).sort({ votes: -1 }).limit(limit).toArray();
    return docs.map((d) => ({ key: String(d._id), name: d.name, domain: d.domain, votes: d.votes }));
  }
  const redis = Redis.fromEnv();
  const ranked = await redis.zrange<string[]>("requests", 0, limit - 1, { rev: true, withScores: true });
  const out: CompanyRequest[] = [];
  for (let i = 0; i < ranked.length; i += 2) {
    const key = ranked[i];
    const info = await redis.hgetall<{ name: string; domain: string }>(`request:${key}`);
    out.push({ key, name: info?.name ?? key, domain: info?.domain ?? "", votes: Number(ranked[i + 1]) });
  }
  return out;
}

export async function addCorrection(c: Correction) {
  const record = { ...c, status: "open", created_at: new Date().toISOString() };
  if (process.env.MONGO_URL) {
    await (await mongo()).collection("corrections").insertOne(record);
    return;
  }
  await Redis.fromEnv().rpush("corrections", JSON.stringify(record));
}
