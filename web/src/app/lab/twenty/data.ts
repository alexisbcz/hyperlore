import { cacheLife } from "next/cache";
import { BUILD } from "@/lib/build";
import {
  archiveStats,
  getCompany,
  getInvestor,
  getPerson,
  getStory,
  latestEvents,
  listCategories,
  listCompanies,
  listInvestors,
  listPlaces,
  listRounds,
  listStories,
  peopleRows,
  investorSlug,
  positionDates,
  primaryVideo,
} from "@/lib/lore";
import { categoryLabel, countryName, isSecondaryStage, stageLabel, stageRank, statusLabel } from "@/lib/directory";
import type { CompanySummary, Mark } from "@/lib/types";

// Everything the Twenty variant draws, reduced to plain rows so the client tables stay small.
// Read from the archive snapshot once per deployment, like the other lab experiments.

export const T = "";

export type Logo = { src: string; dark?: boolean };
const logo = (m?: Mark): Logo | undefined => (m ? { src: m.src, ...(m.variant === "dark" && { dark: true }) } : undefined);

const clip = (s: string | undefined, n: number) => (s && s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export type CompanyRow = {
  slug: string;
  name: string;
  logo?: Logo;
  summary?: string;
  founded?: string;
  city?: string;
  country?: string;
  categories: string[];
  status: string;
  raisedUsd: number;
  valuationUsd?: number;
  stage?: string;
  lastRoundDate?: string;
  lastRoundUsd?: number;
  rounds: number;
  investors: number;
  leads: { name: string; slug: string }[];
  founders: { name: string; slug?: string; photo?: string }[];
  events: number;
  sources: number;
  quotes: number;
  lastEvent?: string;
  employees?: number;
  website?: string;
};

const companyRow = (c: CompanySummary): CompanyRow => ({
  slug: c.slug,
  name: c.name,
  logo: logo(c.icon ?? c.logo),
  summary: clip(c.summary ?? c.tagline, 150),
  founded: c.founded,
  city: c.city,
  country: c.country,
  categories: c.categories.map(categoryLabel),
  status: c.status,
  raisedUsd: c.raisedUsd,
  valuationUsd: c.valuationUsd,
  stage: c.lastRound?.stage,
  lastRoundDate: c.lastRound?.date,
  lastRoundUsd: c.lastRound?.amountUsd,
  rounds: c.rounds,
  investors: c.investors.length,
  leads: c.investors.filter((i) => i.lead).slice(0, 3).map((i) => ({ name: i.name, slug: i.slug })),
  founders: c.founders.slice(0, 3).map((f) => ({ name: f.name, slug: f.slug, photo: f.photo?.src })),
  events: c.events,
  sources: c.sources,
  quotes: c.quotes,
  lastEvent: c.lastEvent,
  employees: c.employees?.count,
  website: c.website,
});

async function companyRowsCached(build: string): Promise<CompanyRow[]> {
  "use cache";
  void build;
  cacheLife("max");
  return (await listCompanies()).filter((c) => c.hasOverview || c.events > 2).map(companyRow);
}

/** Counts for the navigation drawer. */
async function navCountsCached(build: string) {
  "use cache";
  void build;
  cacheLife("max");
  const [companies, rounds, investors, people, places, stories, categories] = await Promise.all([
    companyRows(),
    listRounds(),
    listInvestors(),
    peopleRows(),
    listPlaces(),
    listStories(),
    listCategories(),
  ]);
  return {
    companies: companies.length,
    rounds: rounds.length,
    investors: investors.length,
    people: people.length,
    places: places.length,
    stories: stories.length,
    categories: categories.length,
  };
}

export type RoundTableRow = {
  id: string;
  company: string;
  companyName: string;
  logo?: Logo;
  date: string;
  round: string;
  stage: string;
  amountUsd?: number;
  amount?: number;
  currency?: string;
  valuationUsd?: number;
  leads: { name: string; slug: string }[];
  investors: number;
  categories: string[];
  country?: string;
  source?: string;
  secondary: boolean;
};

async function roundRowsCached(build: string): Promise<RoundTableRow[]> {
  "use cache";
  void build;
  cacheLife("max");
  return (await listRounds()).map((r) => ({
    id: r.id,
    company: r.company,
    companyName: r.companyName,
    logo: logo(r.icon),
    date: r.date,
    round: r.round,
    stage: r.stage,
    amountUsd: r.amountUsd,
    amount: r.amount,
    currency: r.currency,
    valuationUsd: r.valuationUsd,
    leads: r.leads.map((n) => ({ name: n, slug: r.investorSlugs?.[n] ?? investorSlug(n) })),
    investors: new Set([...r.leads, ...r.investors]).size,
    categories: r.categories.map(categoryLabel),
    country: r.country,
    source: r.sources[0]?.url,
    secondary: isSecondaryStage(r.stage),
  }));
}

export type InvestorRow = {
  slug: string;
  name: string;
  summary?: string;
  companies: number;
  leads: number;
  rounds: number;
  stages: string[];
  portfolio: string[];
  firstDate?: string;
  lastDate?: string;
};

async function investorTableRowsCached(build: string): Promise<InvestorRow[]> {
  "use cache";
  void build;
  cacheLife("max");
  return (await listInvestors()).map((i) => {
    const dates = i.stakes.map((s) => s.date).sort();
    return {
      slug: i.slug,
      name: i.name,
      summary: clip(i.summary, 140),
      companies: i.companies.length,
      leads: i.leads,
      rounds: i.stakes.length,
      stages: [...(i.stages ?? [])].sort((a, b) => stageRank(a) - stageRank(b)).map(stageLabel),
      portfolio: i.companies.slice(0, 6),
      firstDate: dates[0],
      lastDate: dates.at(-1),
    };
  });
}

export type PersonRow = {
  slug: string;
  name: string;
  photo?: string;
  summary?: string;
  roles: string[];
  companies: string[];
};

async function personTableRowsCached(build: string): Promise<PersonRow[]> {
  "use cache";
  void build;
  cacheLife("max");
  return (await peopleRows()).map((p) => ({
    slug: p.slug,
    name: p.name,
    photo: p.photo?.src,
    summary: clip(p.summary, 140),
    roles: p.roles ?? [],
    companies: p.companies ?? [],
  }));
}

/** Slug → display name and logo, so people and investors tables can render company chips. */
export async function companyLookup(): Promise<Record<string, { name: string; logo?: Logo }>> {
  "use cache";
  cacheLife("max");
  return Object.fromEntries((await listCompanies()).map((c) => [c.slug, { name: c.name, logo: logo(c.icon ?? c.logo) }]));
}

async function categoryRowsCached(build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return (await listCategories()).map((c) => ({
    slug: c.slug,
    id: c.id,
    label: c.label,
    count: c.companies.length,
    raisedUsd: c.companies.reduce((s, x) => s + x.raisedUsd, 0),
    top: c.companies
      .toSorted((a, b) => b.raisedUsd - a.raisedUsd)
      .slice(0, 5)
      .map((x) => ({ slug: x.slug, name: x.name, logo: logo(x.icon ?? x.logo) })),
  }));
}

async function placeRowsCached(build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return (await listPlaces()).map((p) => ({
    slug: p.slug,
    name: p.name,
    city: p.city,
    country: p.country,
    address: p.address,
    opened: p.opened,
    summary: clip(p.summary, 160),
    companies: p.companies,
    events: p.events.length,
    people: p.people.length,
  }));
}

async function storyRowsCached(build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return (await listStories())
    .map((s) => ({ slug: s.slug, title: s.title, summary: clip(s.summary, 200), companies: s.companies, updatedAt: s.updatedAt, words: s.markdown.split(/\s+/).length }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

async function storyCached(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return getStory(slug);
}

async function dashboardCached(build: string) {
  "use cache";
  void build;
  cacheLife("max");
  const [stats, events, rounds, investors, companies] = await Promise.all([archiveStats(), latestEvents(14), roundRows(), investorTableRows(), companyRows()]);
  const recent = rounds
    .filter((r) => r.amountUsd && !r.secondary)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12);
  const names = Object.fromEntries(companies.map((c) => [c.slug, { name: c.name, logo: c.logo }]));
  return {
    stats,
    events: events.map((e) => ({
      id: e.id,
      company: e.company,
      companyName: names[e.company]?.name ?? e.company,
      logo: names[e.company]?.logo,
      date: e.date,
      kind: e.kind,
      title: e.title,
      sources: e.sources.length,
    })),
    recent,
    investors: investors.slice(0, 10),
    raised: companies.toSorted((a, b) => b.raisedUsd - a.raisedUsd).slice(0, 10),
    byStatus: ["active", "public", "acquired", "closed"].map((s) => ({ id: s, label: statusLabel(s), count: companies.filter((c) => c.status === s).length })),
  };
}

/** One company's full record, reduced to what the record page draws. */
async function companyRecordCached(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  const lore = await getCompany(slug);
  if (!lore) return null;
  const valued = lore.funding.findLast((r) => r.valuationUsd);
  return {
    slug: lore.slug,
    name: lore.name,
    logo: logo(lore.icon ?? lore.logo),
    summary: lore.summary,
    tagline: lore.tagline && lore.tagline !== lore.summary ? lore.tagline : undefined,
    website: lore.website,
    legalName: lore.legalName,
    founded: lore.founded,
    hq: lore.city && lore.country ? `${lore.city}, ${countryName(lore.country)}` : lore.hq,
    country: lore.country,
    categories: lore.categories.map(categoryLabel),
    status: lore.status,
    acquiredBy: lore.acquiredBy,
    acquirerSlug: lore.acquirerSlug,
    stocks: lore.stocks,
    employees: lore.employees,
    formerNames: lore.formerNames,
    raisedUsd: lore.raisedUsd,
    valuation: valued && { usd: valued.valuationUsd!, round: valued.round, date: valued.date },
    links: lore.links,
    facts: lore.facts,
    founders: lore.founders.map((f) => ({ name: f.name, slug: f.slug, photo: f.photo?.src })),
    investors: lore.investors,
    overview: lore.overview && { markdown: lore.overview.markdown, updatedAt: lore.overview.updatedAt },
    // Excerpts are long and only the classic page's hover cards use them.
    sources: Object.fromEntries(Object.entries(lore.sources).map(([u, { excerpt: _, ...s }]) => [u, s])),
    events: lore.events.map((e) => ({
      id: e.id,
      date: e.date,
      kind: e.kind,
      title: e.title,
      summary: e.summary,
      inferred: e.confidence === "inferred",
      sources: e.sources.map((s) => ({ url: s.url, host: s.host, type: s.type, quote: s.quote })),
    })),
    funding: lore.funding.map((r) => ({
      date: r.date,
      round: r.round,
      stage: r.stage,
      amountUsd: r.amountUsd,
      amount: r.amount,
      currency: r.currency,
      valuationUsd: r.valuationUsd,
      leads: r.leads.map((n) => ({ name: n, slug: r.investorSlugs?.[n] ?? investorSlug(n) })),
      investors: r.investors.filter((i) => !r.leads.includes(i)),
      source: r.sources[0]?.url,
      sourceHost: r.sources[0]?.host,
    })),
    people: lore.keyPeople.map((p) => ({ name: p.name, slug: p.slug, role: p.role, blurb: clip(p.blurb, 160), photo: p.photo?.src, founder: p.founder })),
    quotes: lore.quotes.map((q) => ({ id: q.id, person: q.person, text: q.text, date: q.date, link: q.link, context: q.context })),
    logos: lore.logos.map((l) => ({ id: l.id, src: l.src, date: l.date, kind: l.kind, dark: l.variant === "dark", description: l.description, sourceUrl: l.sourceUrl })),
    similar: lore.similar.slice(0, 8).map((c) => ({ slug: c.slug, name: c.name, summary: clip(c.summary, 90), logo: logo(c.icon), shared: c.sharedCategories.map(categoryLabel) })),
    places: lore.places.map((p) => ({ slug: p.slug, name: p.name, city: p.city, opened: p.opened })),
  };
}

export type CompanyRecord = NonNullable<Awaited<ReturnType<typeof companyRecord>>>;

async function investorRecordCached(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  const inv = await getInvestor(slug);
  if (!inv) return null;
  const [rounds, names] = await Promise.all([roundRows(), companyLookup()]);
  const stakes = inv.stakes.toSorted((a, b) => b.date.localeCompare(a.date));
  const byKey = new Map(rounds.map((r) => [`${r.company}|${r.date}|${r.round}`, r]));
  return {
    slug: inv.slug,
    name: inv.name,
    summary: inv.summary,
    leads: inv.leads,
    companies: inv.companies.map((c) => ({ slug: c, name: names[c]?.name ?? c, logo: names[c]?.logo })),
    stages: (inv.stages ?? []).toSorted((a, b) => stageRank(a) - stageRank(b)).map(stageLabel),
    stakes: stakes.map((s) => {
      const r = byKey.get(`${s.company}|${s.date}|${s.round}`);
      return {
        company: s.company,
        companyName: names[s.company]?.name ?? s.company,
        logo: names[s.company]?.logo,
        date: s.date,
        round: s.round,
        stage: s.stage ?? "other",
        lead: s.lead,
        amountUsd: r?.amountUsd,
        valuationUsd: r?.valuationUsd,
        source: r?.source,
      };
    }),
  };
}

async function personRecordCached(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  const p = await getPerson(slug);
  if (!p) return null;
  const [names, rows] = await Promise.all([companyLookup(), personTableRows()]);
  const row = rows.find((r) => r.slug === slug);
  return {
    slug: p.slug,
    name: p.name,
    photo: p.photo?.src,
    photoSource: p.photo?.sourceUrl,
    aliases: p.aliases,
    summary: p.summary,
    links: p.links,
    roles: row?.roles ?? [],
    companies: (row?.companies ?? []).map((c) => ({ slug: c, name: names[c]?.name ?? c, logo: names[c]?.logo })),
    positions: (p.positions ?? []).map((r) => ({ ...r, companyName: names[r.company]?.name ?? r.company, logo: names[r.company]?.logo, dates: positionDates(r) })),
    events: p.events.map((e) => ({
      id: e.id,
      company: e.company,
      companyName: names[e.company]?.name ?? e.company,
      date: e.date,
      kind: e.kind,
      title: e.title,
      summary: e.summary,
      inferred: e.confidence === "inferred",
      sources: e.sources.map((s) => ({ url: s.url, host: s.host, type: s.type })),
    })),
    quotes: p.quotes.map((q) => ({ id: q.id, company: q.company, companyName: names[q.company]?.name ?? q.company, text: q.text, date: q.date, link: q.link, context: q.context })),
    backed: p.backed && { slug: p.backed.slug, companies: p.backed.companies.length },
    sources: Object.values(p.sources),
  };
}

/** The interview a company's page quotes most, for og:video beside the share video. */
async function companyVideoCached(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return primaryVideo({ company: slug });
}

// Every loader is cached for the life of a deployment, keyed by its ID: cache entries survive deploys,
// so without it a new snapshot would keep serving the previous one (and cached 404s for new slugs).
export const companyRows = () => companyRowsCached(BUILD);
export const navCounts = () => navCountsCached(BUILD);
export const roundRows = () => roundRowsCached(BUILD);
export const investorTableRows = () => investorTableRowsCached(BUILD);
export const personTableRows = () => personTableRowsCached(BUILD);
export const categoryRows = () => categoryRowsCached(BUILD);
export const placeRows = () => placeRowsCached(BUILD);
export const storyRows = () => storyRowsCached(BUILD);
export const story = (slug: string) => storyCached(slug, BUILD);
export const dashboard = () => dashboardCached(BUILD);
export const companyRecord = (slug: string) => companyRecordCached(slug, BUILD);
export const investorRecord = (slug: string) => investorRecordCached(slug, BUILD);
export const personRecord = (slug: string) => personRecordCached(slug, BUILD);
export const companyVideo = (slug: string) => companyVideoCached(slug, BUILD);
