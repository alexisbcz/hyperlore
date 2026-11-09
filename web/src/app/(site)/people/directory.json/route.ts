import { cacheLife } from "next/cache";
import { peopleRows } from "@/lib/lore";
import { isLive } from "@/lib/store";

// Everyone, for the /people page's filters: fetched after load so the page's HTML carries only the
// cards it shows. Prerendered from the snapshot; read per request from the live database.
async function rows() {
  return JSON.stringify(await peopleRows());
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
