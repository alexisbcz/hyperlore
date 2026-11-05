import { getCompany } from "@/lib/lore";

export async function GET(_req: Request, { params }: RouteContext<"/api/v1/companies/[slug]">) {
  const lore = await getCompany((await params).slug);
  if (!lore) return Response.json({ error: "Unknown company" }, { status: 404 });
  const { logo, icon, logos, ...rest } = lore;
  return Response.json({
    ...rest,
    logo: logo?.src,
    icon: icon?.src,
    logos: logos.map((l) => ({ date: l.date, kind: l.kind, variant: l.variant, src: l.src, source: l.sourceUrl })),
  });
}
