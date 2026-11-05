import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { investorRows } from "@/lib/lore";
import { isLive } from "@/lib/store";

// Every investor, for the /investors page's filters: fetched after load so the page's HTML carries only
// the rows it shows. Prerendered from the snapshot; read per request from the live database.
async function rows() {
  return JSON.stringify(await investorRows());
}

async function cachedRows() {
  "use cache";
  cacheLife("max");
  return rows();
}

export async function GET() {
  if (isLive()) await connection();
  return new Response(await (isLive() ? rows() : cachedRows()), { headers: { "Content-Type": "application/json" } });
}
