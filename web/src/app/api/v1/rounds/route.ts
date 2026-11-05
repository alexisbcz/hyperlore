import { listRounds } from "@/lib/lore";
import { filterRounds, parseRoundFilters, roundTotals, roundsCsv, sortRounds } from "@/lib/rounds";
import { SITE_URL } from "@/lib/og";

// Same query parameters as the /rounds page: q, stage, category, country, company, investor, led
// (comma-separated lists; investors by slug), year_min/max, amount_min/max (millions of USD),
// sort (date|amount|valuation|company|stage), dir, plus limit/offset and format=csv.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const filters = parseRoundFilters(params);
  const all = await listRounds();
  const matched = sortRounds(filterRounds(all, filters), filters.sort, filters.dir);
  if (params.get("format") === "csv")
    return new Response(roundsCsv(matched, SITE_URL), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="hyperlore-rounds.csv"' },
    });
  const int = (key: string) => {
    const v = params.get(key);
    const n = v === null || v.trim() === "" ? NaN : Math.floor(Number(v));
    return Number.isFinite(n) ? n : undefined;
  };
  const offset = Math.max(0, int("offset") ?? 0);
  const limit = Math.min(500, Math.max(0, int("limit") ?? 100));
  return Response.json({
    total: all.length,
    count: matched.length,
    totals: roundTotals(matched),
    offset,
    limit,
    rounds: matched.slice(offset, offset + limit).map(({ icon, iconDark, investorSlugs, ...r }) => ({
      ...r,
      icon: icon?.src,
      investors: r.investors.map((name) => ({ name, slug: investorSlugs?.[name], lead: r.leads.includes(name) })),
      leads: r.leads.map((name) => ({ name, slug: investorSlugs?.[name] })),
      url: `/${r.company}#${r.id}`,
    })),
  });
}
