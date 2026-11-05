import { cacheLife } from "next/cache";
import { companyName, getCompany, listCompanies } from "@/lib/lore";
import { categoryLabel, countryName, statusLabel } from "@/lib/directory";

// Shared by every style experiment under /lab, so they all draw exactly the same data.

export type LabLore = {
  slug: string;
  name: string;
  summary?: string;
  tagline?: string;
  website?: string;
  icon?: string;
  founded?: string;
  founders: { name: string; slug?: string; photo?: string }[];
  hq?: string;
  categories: string[];
  status: string;
  employees?: number;
  formerNames: string[];
  raisedUsd: number;
  valuation?: { usd: number; round: string; date: string };
  investors: number;
  sources: number;
  events: {
    id: string;
    date: string;
    kind: string;
    title: string;
    summary?: string;
    inferred: boolean;
    sources: { url: string; host: string; type: string }[];
  }[];
  funding: { date: string; round: string; amountUsd?: number; valuationUsd?: number; leads: string[]; source?: string }[];
  people: { name: string; slug?: string; role?: string; blurb?: string; photo?: string }[];
  quotes: { id: string; person: string; text: string; date?: string; link: string }[];
  similar: { slug: string; name: string; summary?: string; icon?: string }[];
};

/** Companies with an overview, for the lab's company picker. */
export async function labCompanies() {
  "use cache";
  cacheLife("max");
  return (await listCompanies()).filter((c) => c.summary).map((c) => ({ slug: c.slug, name: c.name }));
}

export { companyName };

/** The company reduced to what the trial draws, so the client payload stays small. */
export async function labCompany(slug: string): Promise<LabLore | null> {
  "use cache";
  cacheLife("max");
  const lore = await getCompany(slug);
  if (!lore) return null;
  const valued = lore.funding.findLast((r) => r.valuationUsd);
  return {
    slug: lore.slug,
    name: lore.name,
    summary: lore.summary,
    tagline: lore.tagline && lore.tagline !== lore.summary ? lore.tagline : undefined,
    website: lore.website,
    icon: lore.icon?.src,
    founded: lore.founded,
    founders: lore.founders.map((f) => ({ name: f.name, slug: f.slug, photo: f.photo?.src })),
    hq: lore.city && lore.country ? `${lore.city}, ${countryName(lore.country)}` : lore.hq,
    categories: lore.categories.map(categoryLabel),
    status: lore.status === "acquired" && lore.acquiredBy ? `Acquired by ${lore.acquiredBy}` : lore.status === "active" ? "Active, private" : statusLabel(lore.status),
    employees: lore.employees?.count,
    formerNames: lore.formerNames,
    raisedUsd: lore.raisedUsd,
    valuation: valued && { usd: valued.valuationUsd!, round: valued.round, date: valued.date },
    investors: lore.investors.length,
    sources: Object.keys(lore.sources).length,
    events: lore.events.map((e) => ({
      id: e.id,
      date: e.date,
      kind: e.kind,
      title: e.title,
      summary: e.summary,
      inferred: e.confidence === "inferred",
      sources: e.sources.map((s) => ({ url: s.url, host: s.host, type: s.type })),
    })),
    funding: lore.funding.map((r) => ({
      date: r.date,
      round: r.round,
      amountUsd: r.amountUsd,
      valuationUsd: r.valuationUsd,
      leads: r.leads,
      source: r.sources[0]?.url,
    })),
    people: lore.keyPeople.map((p) => ({ name: p.name, slug: p.slug, role: p.role, blurb: p.blurb, photo: p.photo?.src })),
    quotes: lore.quotes.slice(0, 6).map((q) => ({ id: q.id, person: q.person, text: q.text, date: q.date, link: q.link })),
    similar: lore.similar.map((c) => ({ slug: c.slug, name: c.name, summary: c.summary, icon: c.icon?.src })),
  };
}
