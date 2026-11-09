import { getCompany, listCompanies } from "@/lib/lore";

// /api/v1/companies/<slug>.json: the param carries the extension so the static file has one (GitHub
// Pages picks the Content-Type from it).
export async function generateStaticParams() {
  return (await listCompanies()).map((c) => ({ slug: `${c.slug}.json` }));
}

export async function GET(_req: Request, { params }: RouteContext<"/api/v1/companies/[slug]">) {
  const lore = await getCompany((await params).slug.replace(/\.json$/, ""));
  if (!lore) return Response.json({ error: "Unknown company" }, { status: 404 });
  const { logo, icon, logos, ...rest } = lore;
  return Response.json({
    ...rest,
    logo: logo?.src,
    icon: icon?.src,
    logos: logos.map((l) => ({ date: l.date, kind: l.kind, variant: l.variant, src: l.src, source: l.sourceUrl })),
  });
}
