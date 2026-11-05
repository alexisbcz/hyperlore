import { retrieve } from "@/lib/ask";

// Retrieval only: no model runs on the server, so answering costs nothing. The summary, if the visitor
// turns it on, is written in their browser (see components/ask-worker.ts).
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = params.get("q")?.trim().slice(0, 300);
  if (!q) return Response.json({ error: "Missing q" }, { status: 400 });
  const result = await retrieve(q, params.get("company") ?? undefined);
  return Response.json(result, { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } });
}
