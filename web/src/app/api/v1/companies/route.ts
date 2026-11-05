import { filterCompanies, parseFilters, sortCompanies } from "@/lib/directory";
import { listCompanies } from "@/lib/lore";

// Same query parameters as the /companies page, so a filtered view's URL maps 1:1 onto the API:
// q, category, country, city, status, stage, investor, lead=1, founder, kind, has (comma-separated lists),
// founded_min/max (year), raised_min/max and valuation_min/max (millions of USD), sort, dir, plus limit/offset.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const filters = parseFilters(params);
  const all = await listCompanies();
  const matched = sortCompanies(filterCompanies(all, filters), filters.sort, filters.dir);
  // Whole numbers only; limit=0 returns just the counts. Missing or invalid values fall back to the defaults.
  const int = (key: string) => {
    const v = params.get(key);
    const n = v === null || v.trim() === "" ? NaN : Math.floor(Number(v));
    return Number.isFinite(n) ? n : undefined;
  };
  const offset = Math.max(0, int("offset") ?? 0);
  const limit = Math.min(500, Math.max(0, int("limit") ?? 500));
  return Response.json({
    total: all.length,
    count: matched.length,
    offset,
    limit,
    companies: matched
      .slice(offset, offset + limit)
      .map(({ logo, icon, ...c }) => ({ ...c, logo: logo?.src, icon: icon?.src, url: `/${c.slug}` })),
  });
}
