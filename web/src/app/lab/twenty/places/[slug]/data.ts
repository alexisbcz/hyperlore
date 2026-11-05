import { cacheLife } from "next/cache";
import { BUILD } from "@/lib/build";
import { companyName, getPlace, listCompanies } from "@/lib/lore";
import type { Logo } from "../../data";

// One place, reduced to what the Twenty place page draws. Keyed by deployment like ../../data.ts.

async function placeRecordCached(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  const [place, companies] = await Promise.all([getPlace(slug), listCompanies()]);
  if (!place) return null;
  const marks = new Map(companies.map((c) => [c.slug, c]));
  const logo = (s: string): Logo | undefined => {
    const m = marks.get(s)?.icon ?? marks.get(s)?.logo;
    return m ? { src: m.src, ...(m.variant === "dark" && { dark: true }) } : undefined;
  };
  return {
    slug: place.slug,
    name: place.name,
    city: place.city,
    country: place.country,
    address: place.address,
    coordinates: place.coordinates,
    opened: place.opened,
    summary: place.summary,
    history: place.history,
    links: place.links,
    photo: place.photo && { src: place.photo.src, sourceUrl: place.photo.sourceUrl, author: place.photo.author, licence: place.photo.licence },
    sources: Object.fromEntries(Object.entries(place.sources).map(([u, { excerpt: _, ...s }]) => [u, s])),
    companies: place.companies.map((c) => ({ slug: c, name: marks.get(c)?.name ?? companyName(c), logo: logo(c) })),
    people: place.peopleRefs.map((p) => ({ slug: p.slug, name: p.name, photo: p.photo?.src })),
    events: place.timeline.map((e) => ({
      id: e.id,
      date: e.date,
      kind: e.kind,
      title: e.title,
      summary: e.summary,
      inferred: e.confidence === "inferred",
      sources: e.sources.map((s) => ({ url: s.url, host: s.host, type: s.type })),
      company: e.company,
      companyName: marks.get(e.company)?.name ?? companyName(e.company),
    })),
  };
}

export const placeRecord = (slug: string) => placeRecordCached(slug, BUILD);
