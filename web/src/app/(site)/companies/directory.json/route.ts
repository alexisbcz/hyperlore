import { cacheLife } from "next/cache";
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

// No params: this tells static export (output: "export") to prerender the handler.
export const generateStaticParams = () => [{}];

export async function GET() {
  return new Response(await (isLive() ? rows() : cachedRows()), { headers: { "Content-Type": "application/json" } });
}
