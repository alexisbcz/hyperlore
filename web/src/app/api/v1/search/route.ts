import { search } from "@/lib/lore";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return Response.json({ query: q, results: await search(q.slice(0, 100)) });
}
