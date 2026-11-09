import { getComparison, listCompanies } from "@/lib/lore";

// /compare/data/<slug>.json: one company's side of a comparison (summary, rounds, key events).
export async function generateStaticParams() {
  return (await listCompanies()).map((c) => ({ slug: `${c.slug}.json` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const [item] = await getComparison([(await params).slug.replace(/\.json$/, "")]);
  return Response.json(item ?? null);
}
