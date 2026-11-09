import { listRounds } from "@/lib/lore";
import { roundTotals, sortRounds } from "@/lib/rounds";

// Every funding round, newest first, prebuilt (the site is static: filter client-side). CSV: /api/v1/rounds.csv
// No params: this tells static export (output: "export") to prerender the handler.
export const generateStaticParams = () => [{}];

export async function GET() {
  const all = sortRounds(await listRounds(), "date", "desc");
  return Response.json({
    total: all.length,
    count: all.length,
    totals: roundTotals(all),
    rounds: all.map(({ icon, iconDark, investorSlugs, ...r }) => ({
      ...r,
      icon: icon?.src,
      investors: r.investors.map((name) => ({ name, slug: investorSlugs?.[name], lead: r.leads.includes(name) })),
      leads: r.leads.map((name) => ({ name, slug: investorSlugs?.[name] })),
      url: `/${r.company}#${r.id}`,
    })),
  });
}
