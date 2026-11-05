import type { MetadataRoute } from "next";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { listCategories, listCompanies, listInvestors, listPeople, listPlaces, listStories } from "@/lib/lore";
import { SITE_URL } from "@/lib/og";
import { isLive } from "@/lib/store";

// Live: per request. Snapshot: built once per deployment. Without the cache, reading the snapshot is
// uncached I/O, and whether the build could prerender the sitemap depended on a worker having it loaded.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isLive()) return cachedEntries();
  await connection();
  return entries();
}

async function cachedEntries() {
  "use cache";
  cacheLife("max");
  return entries();
}

async function entries(): Promise<MetadataRoute.Sitemap> {
  const [companies, people, investors, places, stories, categories] = await Promise.all([
    listCompanies(),
    listPeople(),
    listInvestors(),
    listPlaces(),
    listStories(),
    listCategories(),
  ]);
  const url = (path: string) => `${SITE_URL}${path}`;
  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    ...["/companies", "/rounds", "/portfolios/yc", "/portfolios/a16z", "/portfolios/kima", "/portfolios/frst", "/benchmarks", "/ideas", "/compare", "/stats", "/categories", "/people", "/investors", "/places", "/stories", "/developers"].map((p) => ({ url: url(p), changeFrequency: "weekly" as const, priority: 0.6 })),
    // Companies with a written overview are the core pages; the rest only appear in stories so far.
    ...companies.map((c) => ({
      url: url(`/${c.slug}`),
      ...(c.lastEvent && /^\d{4}-\d{2}-\d{2}$/.test(c.lastEvent) && { lastModified: c.lastEvent }),
      changeFrequency: "weekly" as const,
      priority: c.summary ? 0.9 : 0.4,
      ...(c.logo && { images: [url(c.logo.src)] }),
    })),
    ...categories.map((c) => ({ url: url(`/categories/${c.slug}`), changeFrequency: "weekly" as const, priority: 0.5 })),
    ...stories.map((s) => ({ url: url(`/stories/${s.slug}`), lastModified: s.updatedAt, priority: 0.8 })),
    ...people.map((p) => ({ url: url(`/people/${p.slug}`), priority: 0.5, ...(p.photo && { images: [url(p.photo.src)] }) })),
    ...places.map((p) => ({ url: url(`/places/${p.slug}`), priority: 0.5, ...(p.photo && { images: [url(p.photo.src)] }) })),
    ...investors.map((i) => ({ url: url(`/investors/${i.slug}`), priority: 0.3 })),
  ];
}
