import { cacheLife } from "next/cache";
import { listRounds } from "@/lib/lore";
import { feedRows } from "@/lib/rounds";
import { isLive } from "@/lib/store";

// Every round, for the /rounds page's filters: fetched after load so the page's HTML carries only the
// rows it shows. Prerendered from the snapshot; read per request from the live database.
async function rows() {
  return JSON.stringify(feedRows(await listRounds()));
}

async function cachedRows() {
  "use cache";
  cacheLife("max");
  return rows();
}

// No params: this tells static export (output: "export") to prerender the handler.
export const generateStaticParams = () => [{}];

export async function GET() {
  return new Response(await (isLive() ? rows() : cachedRows()), { headers: { "Content-Type": "application/json" } });
}
