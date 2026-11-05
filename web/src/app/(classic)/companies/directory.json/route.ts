import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { directoryRows } from "@/lib/directory";
import { listCompanies } from "@/lib/lore";
import { isLive } from "@/lib/store";

// Every company, for the /companies directory's filters and the rows past the first page: fetched after
// load so the page's HTML carries only the rows it renders. Prerendered from the snapshot; read per
// request from the live database.
async function rows() {
  return JSON.stringify(directoryRows(await listCompanies()));
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
