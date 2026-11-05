import { readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";

// The archive is small (hundreds of events, ~1k sources), so pages load it whole and query in memory.
// Locally it comes live from DocumentDB, where the agents write; deployed, from the snapshot
// published with `./hl export`.

export type Doc = Record<string, unknown> & { _id: string };

export type Archive = {
  events: Doc[];
  sources: Doc[];
  quotes: Doc[];
  assets: Doc[];
  entities: Doc[];
  pages: Doc[];
};

const COLLECTIONS = ["events", "sources", "quotes", "assets", "entities", "pages"] as const;

async function fromMongo(): Promise<Archive> {
  const { db } = await import("./db");
  const d = await db();
  const entries = await Promise.all(
    COLLECTIONS.map(async (c) => [c, (await d.collection(c).find({}).toArray()).map((x) => ({ ...x, _id: String(x._id) }))]),
  );
  return Object.fromEntries(entries) as Archive;
}

/**
 * Live data, shared across requests for a few seconds. React's cache() only dedupes inside a React
 * render, not in route handlers, where every lookup used to re-read all six collections (~100 ms each,
 * a dozen times per search). Agents write concurrently, so the copy is refreshed in the background
 * once it is older than LIVE_TTL_MS: requests never wait on Mongo except the very first one.
 */
const LIVE_TTL_MS = 10_000;
const live = globalThis as unknown as { hyperloreLive?: { at: number; data: Promise<Archive>; refreshing?: boolean } };

function fromMongoShared(): Promise<Archive> {
  const now = Date.now();
  const entry = live.hyperloreLive;
  if (!entry) {
    const data = fromMongo();
    live.hyperloreLive = { at: now, data };
    // A failed first load must not stick: the next request retries.
    data.catch(() => {
      if (live.hyperloreLive?.data === data) live.hyperloreLive = undefined;
    });
    return data;
  }
  if (now - entry.at > LIVE_TTL_MS && !entry.refreshing) {
    entry.refreshing = true;
    fromMongo()
      .then((data) => {
        live.hyperloreLive = { at: Date.now(), data: Promise.resolve(data) };
      })
      .catch(() => {
        entry.refreshing = false;
        entry.at = Date.now();
      });
  }
  return entry.data;
}

let snapshot: Promise<Archive> | undefined;

function fromSnapshot(): Promise<Archive> {
  snapshot ??= readFile(path.join(process.cwd(), "data/archive.json"), "utf8").then((s) => JSON.parse(s));
  return snapshot;
}

export const archive = cache((): Promise<Archive> => (process.env.MONGO_URL ? fromMongoShared() : fromSnapshot()));

/**
 * Memoise a value derived purely from one archive object (company summaries, the search index…).
 * Keyed on the object itself, so a refreshed archive recomputes and the old entries are collected.
 */
const derived = new WeakMap<Archive, Map<string, unknown>>();
export function fromArchive<T>(a: Archive, key: string, build: () => T): T {
  let m = derived.get(a);
  if (!m) derived.set(a, (m = new Map()));
  if (!m.has(key)) {
    const value = build();
    m.set(key, value);
    // A failed build (Mongo hiccup mid-way) is retried on the next call instead of being kept.
    if (value instanceof Promise) value.catch(() => m.get(key) === value && m.delete(key));
  }
  return m.get(key) as T;
}

/**
 * True when pages read the live database (local development, where agents write concurrently): those
 * render per request. The deployed snapshot never changes within a deployment, so pages built from it
 * are cached for good (`"use cache"` + `cacheLife("max")`) and prerendered at build.
 */
export const isLive = () => Boolean(process.env.MONGO_URL);
