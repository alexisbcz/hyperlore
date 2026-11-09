import { sortCompanies } from "@/lib/directory";
import { listCompanies } from "@/lib/lore";

// Every company, prebuilt (the site is static: filter client-side, on the same fields the /companies
// page filters on).
// No params: this tells static export (output: "export") to prerender the handler.
export const generateStaticParams = () => [{}];

export async function GET() {
  const all = sortCompanies(await listCompanies(), "name", "asc");
  return Response.json({
    total: all.length,
    count: all.length,
    companies: all.map(({ logo, icon, ...c }) => ({ ...c, logo: logo?.src, icon: icon?.src, url: `/${c.slug}` })),
  });
}
