import { cacheLife } from "next/cache";
import { BUILD } from "@/lib/build";
import { getCategory, listCategories } from "@/lib/lore";
import { companyRows } from "../../data";

// One category: its companies as the Companies table's rows, plus the categories they also sit in.
// Keyed by deployment like ../../data.ts.

async function categoryRecordCached(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  const [category, all, rows] = await Promise.all([getCategory(slug), listCategories(), companyRows()]);
  if (!category) return null;
  const { companies } = category;
  const inCategory = new Set(companies.map((c) => c.slug));
  const related = all
    .filter((c) => c.slug !== slug)
    .map((c) => ({ slug: c.slug, label: c.label, n: c.companies.filter((x) => inCategory.has(x.slug)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .slice(0, 10);
  return {
    slug: category.slug,
    id: category.id,
    label: category.label,
    count: companies.length,
    raisedUsd: companies.reduce((s, c) => s + c.raisedUsd, 0),
    investors: new Set(companies.flatMap((c) => c.investors.map((i) => i.slug))).size,
    names: companies.slice(0, 6).map((c) => c.name),
    rows: rows.filter((r) => inCategory.has(r.slug)),
    related,
  };
}

export const categoryRecord = (slug: string) => categoryRecordCached(slug, BUILD);
