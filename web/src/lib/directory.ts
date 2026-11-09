// Company directory: stage names, filter state (as URL search params), filtering, facets and sorting.
// Pure functions with no server imports: the /companies page runs them in the browser over the full
// list, and the public API runs the same ones on the server.
import type { CompanyStatus, CompanySummary } from "./types";

// ---------------------------------------------------------------------------------------------
// Rounds and stages

export const STAGES = [
  { id: "pre-seed", label: "Pre-seed" },
  { id: "angel", label: "Angel" },
  { id: "seed", label: "Seed" },
  ..."abcdefghij".split("").map((l) => ({ id: `series-${l}`, label: `Series ${l.toUpperCase()}` })),
  { id: "growth", label: "Growth / late" },
  { id: "ipo", label: "IPO" },
  { id: "strategic", label: "Strategic" },
  { id: "crowdfunding", label: "Crowdfunding" },
  { id: "grant", label: "Grant" },
  { id: "debt", label: "Debt" },
  { id: "secondary", label: "Secondary" },
  { id: "tender", label: "Tender offer" },
  { id: "other", label: "Other" },
] as const;

const STAGE_ORDER = new Map<string, number>(STAGES.map((s, i) => [s.id, i]));
export const stageLabel = (id: string) => STAGES.find((s) => s.id === id)?.label ?? id;
export const stageRank = (id?: string) => (id ? (STAGE_ORDER.get(id) ?? 99) : -1);

const STAGE_IDS = new Set<string>(STAGES.map((s) => s.id));

/**
 * A round's stage id. The funding event's stated `details.stage` comes first (every event carries
 * one since the data cleanup); "unknown" or an unlisted value falls back to reading the free-text
 * round name ("Series B1 (reported)", "seed extension", "Tender offer").
 */
export function roundStage(round: string, stated?: unknown): string {
  if (typeof stated === "string") {
    const s = stated.trim().toLowerCase().replace(/[\s_]+/g, "-");
    if (STAGE_IDS.has(s)) return s;
  }
  const r = round.toLowerCase();
  if (/\bipo\b|initial public offering/.test(r)) return "ipo";
  if (/tender/.test(r)) return "tender";
  if (/secondary|buyback/.test(r)) return "secondary";
  const series = r.match(/series\s*([a-j])\b|series\s*([a-j])\d/);
  if (series) return `series-${series[1] ?? series[2]}`;
  if (/pre-?seed|accelerator/.test(r)) return "pre-seed";
  if (/seed/.test(r)) return "seed";
  if (/crowdfund/.test(r)) return "crowdfunding";
  if (/\bgrant\b/.test(r)) return "grant";
  if (/angel|family/.test(r)) return "angel";
  if (/growth|late stage|late-stage/.test(r)) return "growth";
  if (/strategic/.test(r)) return "strategic";
  if (/debt|loan|convertible|credit/.test(r)) return "debt";
  return "other";
}

/** The stage of a round as passed around the UI. */
export const stageOf = (r: { stage?: string; round: string }) => r.stage ?? roundStage(r.round);

/** Sales of existing shares (secondaries, tender offers): no money goes into the company. */
export const isSecondaryStage = (stage: string) => stage === "secondary" || stage === "tender";

// ---------------------------------------------------------------------------------------------
// Statuses and places

export const STATUSES: { id: CompanyStatus; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "public", label: "Public" },
  { id: "acquired", label: "Acquired" },
  { id: "closed", label: "Closed" },
];
export const statusLabel = (s: string) => STATUSES.find((x) => x.id === s)?.label ?? s;

let regionNames: Intl.DisplayNames | undefined;
let codesByName: Map<string, string> | undefined;
/** The ISO code for a country stored by name (places), or undefined. */
export function countryCode(name?: string) {
  if (!name) return undefined;
  if (/^[A-Za-z]{2}$/.test(name)) return canonicalRegion(name.toUpperCase());
  if (!codesByName) {
    codesByName = new Map();
    for (let a = 65; a <= 90; a++)
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        const n = countryName(code);
        // ICU names retired codes too (FX "France", VD "Vietnam", SU "Russia"): keep the current one.
        if (n !== code) codesByName.set(n.toLowerCase(), canonicalRegion(code));
      }
  }
  return codesByName.get(name.toLowerCase());
}

/** The current ISO code for a retired one (FX → FR, UK → GB, BU → MM); others unchanged. */
function canonicalRegion(code: string) {
  try {
    return new Intl.Locale(`und-${code}`).region ?? code;
  } catch {
    return code;
  }
}

export function countryName(code?: string) {
  if (!code) return "";
  try {
    regionNames ??= new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

// ---------------------------------------------------------------------------------------------
// Filter state ⇄ URL search params

export const HAS_OPTIONS = [
  { id: "overview", label: "Written overview" },
  { id: "quotes", label: "Quotes" },
  { id: "video", label: "Video or podcast" },
  { id: "funding", label: "Funding rounds" },
  { id: "valuation", label: "Known valuation" },
  { id: "logo", label: "Logo history" },
] as const;

export type SortKey =
  | "name"
  | "founded"
  | "hq"
  | "status"
  | "raised"
  | "lastRound"
  | "valuation"
  | "investors"
  | "events"
  | "sources"
  | "lastActivity";

export type CompanyFilters = {
  q: string;
  category: string[];
  country: string[];
  city: string[];
  status: string[];
  stage: string[];
  investor: string[];
  /** Only count investors that led a round. */
  lead: boolean;
  founder: string[];
  kind: string[];
  has: string[];
  foundedMin?: number;
  foundedMax?: number;
  /** In millions of US dollars. */
  raisedMin?: number;
  raisedMax?: number;
  valuationMin?: number;
  valuationMax?: number;
  sort: SortKey;
  dir: "asc" | "desc";
  view: "table" | "grid";
};

// URL key for each field; lists are comma-separated so shared links stay short.
const LIST_KEYS = {
  category: "category",
  country: "country",
  city: "city",
  status: "status",
  stage: "stage",
  investor: "investor",
  founder: "founder",
  kind: "kind",
  has: "has",
} as const;
const NUMBER_KEYS = {
  foundedMin: "founded_min",
  foundedMax: "founded_max",
  raisedMin: "raised_min",
  raisedMax: "raised_max",
  valuationMin: "valuation_min",
  valuationMax: "valuation_max",
} as const;

const SORT_KEYS: SortKey[] = [
  "name",
  "founded",
  "hq",
  "status",
  "raised",
  "lastRound",
  "valuation",
  "investors",
  "events",
  "sources",
  "lastActivity",
];
/** Columns whose natural first click is "biggest / newest first". */
export const DESC_FIRST: SortKey[] = ["raised", "lastRound", "valuation", "investors", "events", "sources", "lastActivity"];

export const DEFAULT_FILTERS: CompanyFilters = {
  q: "",
  category: [],
  country: [],
  city: [],
  status: [],
  stage: [],
  investor: [],
  lead: false,
  founder: [],
  kind: [],
  has: [],
  sort: "events",
  dir: "desc",
  view: "table",
};

type ParamsLike = { get(key: string): string | null };

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g;

export function parseFilters(params: ParamsLike): CompanyFilters {
  // Hand-edited or hostile URLs: bounded lists of bounded ids, no control characters.
  const list = (key: string) =>
    (params.get(key) ?? "")
      .split(",")
      .map((s) => s.replace(CONTROL, "").trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 50);
  // Every range is a year or an amount: a negative bound means nothing, so it is ignored.
  const num = (key: string) => {
    const v = params.get(key);
    if (v === null || v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const sort = params.get("sort") as SortKey | null;
  const f: CompanyFilters = {
    ...DEFAULT_FILTERS,
    q: (params.get("q") ?? "").replace(CONTROL, "").slice(0, 100),
    lead: params.get("lead") === "1",
    sort: sort && SORT_KEYS.includes(sort) ? sort : DEFAULT_FILTERS.sort,
    dir: params.get("dir") === "asc" ? "asc" : params.get("dir") === "desc" ? "desc" : DEFAULT_FILTERS.dir,
    view: params.get("view") === "grid" ? "grid" : "table",
  };
  for (const [field, key] of Object.entries(LIST_KEYS)) f[field as keyof typeof LIST_KEYS] = list(key);
  f.country = f.country.map((c) => c.toUpperCase());
  for (const [field, key] of Object.entries(NUMBER_KEYS)) f[field as keyof typeof NUMBER_KEYS] = num(key);
  // Sorting by a column without a direction: use that column's natural order.
  if (sort && !params.get("dir")) f.dir = DESC_FIRST.includes(f.sort) ? "desc" : "asc";
  return f;
}

export function serializeFilters(f: CompanyFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  for (const [field, key] of Object.entries(LIST_KEYS)) {
    const v = f[field as keyof typeof LIST_KEYS];
    if (v.length) p.set(key, v.join(","));
  }
  if (f.lead) p.set("lead", "1");
  for (const [field, key] of Object.entries(NUMBER_KEYS)) {
    const v = f[field as keyof typeof NUMBER_KEYS];
    if (v !== undefined) p.set(key, String(v));
  }
  if (f.sort !== DEFAULT_FILTERS.sort || f.dir !== DEFAULT_FILTERS.dir) {
    p.set("sort", f.sort);
    p.set("dir", f.dir);
  }
  if (f.view !== "table") p.set("view", f.view);
  // Commas are legal in a query string; keep them readable in shared links.
  return p.toString().replace(/%2C/g, ",");
}

// ---------------------------------------------------------------------------------------------
// Filtering and facets

export type Facet = "category" | "country" | "city" | "status" | "stage" | "investor" | "founder" | "kind" | "has";

const founderKey = (f: { name: string; slug?: string }) => f.slug ?? slugifyName(f.name);
export const slugifyName = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** The values a company holds for a facet. */
export function facetValues(c: CompanySummary, facet: Facet, lead = false): string[] {
  switch (facet) {
    case "category":
      return c.categories;
    case "country":
      return c.country ? [c.country] : [];
    case "city":
      return c.city ? [c.city] : [];
    case "status":
      return [c.status];
    case "stage":
      return c.lastRound ? [c.lastRound.stage] : [];
    case "investor":
      return (lead ? c.investors.filter((i) => i.lead) : c.investors).map((i) => i.slug);
    case "founder":
      return c.founders.map(founderKey);
    case "kind":
      return c.kinds;
    case "has":
      return [
        c.hasOverview && "overview",
        c.quotes > 0 && "quotes",
        c.videos > 0 && "video",
        c.rounds > 0 && "funding",
        c.valuationUsd && "valuation",
        c.logo && "logo",
      ].filter((x): x is string => !!x);
  }
}

const FACETS: Facet[] = ["category", "country", "city", "status", "stage", "investor", "founder", "kind", "has"];

/** `has` and `kind` narrow ("has quotes AND a video"); other facets are any-of within the facet. */
const ALL_OF: Facet[] = ["has", "kind"];

function haystack(c: CompanySummary) {
  return [
    c.name,
    c.slug,
    c.summary,
    c.tagline,
    c.legalName,
    c.hq,
    c.city,
    countryName(c.country),
    ...c.categories,
    ...c.founders.map((f) => f.name),
    ...c.investors.map((i) => i.name),
  ]
    .filter(Boolean)
    .join(" \u0000 ")
    .toLowerCase();
}

/** An inverted range (founded 2020–2010) means the same years: compare against the sorted bounds. */
const ordered = (min?: number, max?: number): [number | undefined, number | undefined] =>
  min !== undefined && max !== undefined && min > max ? [max, min] : [min, max];
const inRange = (v: number | undefined, a?: number, b?: number) => {
  const [min, max] = ordered(a, b);
  return (min === undefined || (v !== undefined && v >= min)) && (max === undefined || (v !== undefined && v <= max));
};

/** Companies matching every filter, except `skip` (used to count options of that facet). */
export function filterCompanies(list: CompanySummary[], f: CompanyFilters, skip?: Facet): CompanySummary[] {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter((c) => {
    if (words.length) {
      const text = haystack(c);
      if (!words.every((w) => text.includes(w))) return false;
    }
    for (const facet of FACETS) {
      if (facet === skip) continue;
      const wanted = f[facet];
      if (!wanted.length) continue;
      const have = facetValues(c, facet, f.lead);
      if (ALL_OF.includes(facet) ? !wanted.every((w) => have.includes(w)) : !wanted.some((w) => have.includes(w))) return false;
    }
    const year = c.founded ? Number(c.founded.slice(0, 4)) : undefined;
    if (!inRange(year, f.foundedMin, f.foundedMax)) return false;
    const m = (usd?: number) => (usd ? usd / 1e6 : usd === 0 ? 0 : undefined);
    if (!inRange(m(c.raisedUsd), f.raisedMin, f.raisedMax)) return false;
    if (!inRange(m(c.valuationUsd), f.valuationMin, f.valuationMax)) return false;
    return true;
  });
}

/** Option → number of companies it would show, given every other active filter. */
export function facetCounts(list: CompanySummary[], f: CompanyFilters, facet: Facet): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of filterCompanies(list, f, ALL_OF.includes(facet) ? undefined : facet)) {
    for (const v of new Set(facetValues(c, facet, f.lead))) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return counts;
}

// ---------------------------------------------------------------------------------------------
// Sorting

function sortValue(c: CompanySummary, key: SortKey): string | number | undefined {
  switch (key) {
    case "name":
      return c.name.toLowerCase();
    case "founded":
      return c.founded;
    case "hq":
      return c.city ? `${countryName(c.country)} ${c.city}`.toLowerCase() : c.hq?.toLowerCase();
    case "status":
      return c.status;
    case "raised":
      return c.raisedUsd || undefined;
    case "lastRound":
      return c.lastRound?.date;
    case "valuation":
      return c.valuationUsd;
    case "investors":
      return c.investors.length;
    case "events":
      return c.events;
    case "sources":
      return c.sources;
    case "lastActivity":
      return c.lastEvent;
  }
}

/** Sorted copy; companies without a value for the column always go last. */
export function sortCompanies(list: CompanySummary[], key: SortKey, dir: "asc" | "desc"): CompanySummary[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...list].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === undefined || vb === undefined) return va === vb ? a.name.localeCompare(b.name) : va === undefined ? 1 : -1;
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return cmp * sign || a.name.localeCompare(b.name);
  });
}

/** Active filters as removable chips. */
export function activeChips(
  f: CompanyFilters,
  label: (facet: Facet, value: string) => string,
): { key: string; label: string; remove: (f: CompanyFilters) => CompanyFilters }[] {
  const chips: { key: string; label: string; remove: (f: CompanyFilters) => CompanyFilters }[] = [];
  if (f.q.trim()) chips.push({ key: "q", label: `“${f.q.trim()}”`, remove: (x) => ({ ...x, q: "" }) });
  const prefix: Record<Facet, string> = {
    category: "",
    country: "",
    city: "",
    status: "",
    stage: "Last round: ",
    investor: "Backed by ",
    founder: "Founder: ",
    kind: "Has ",
    has: "Has ",
  };
  for (const facet of FACETS) {
    for (const v of f[facet]) {
      chips.push({
        key: `${facet}:${v}`,
        label: `${prefix[facet]}${label(facet, v)}`,
        remove: (x) => ({ ...x, [facet]: x[facet].filter((y) => y !== v) }),
      });
    }
  }
  if (f.lead) chips.push({ key: "lead", label: "Lead investor only", remove: (x) => ({ ...x, lead: false }) });
  const range = (a: number | undefined, b: number | undefined, fmt: (n: number) => string) => {
    const [min, max] = ordered(a, b);
    return min !== undefined && max !== undefined ? `${fmt(min)}–${fmt(max)}` : min !== undefined ? `≥ ${fmt(min)}` : `≤ ${fmt(max!)}`;
  };
  const money = (n: number) => (n >= 1000 ? `$${+(n / 1000).toFixed(2)}B` : `$${n}M`);
  if (f.foundedMin !== undefined || f.foundedMax !== undefined)
    chips.push({
      key: "founded",
      label: `Founded ${range(f.foundedMin, f.foundedMax, String)}`,
      remove: (x) => ({ ...x, foundedMin: undefined, foundedMax: undefined }),
    });
  if (f.raisedMin !== undefined || f.raisedMax !== undefined)
    chips.push({
      key: "raised",
      label: `Raised ${range(f.raisedMin, f.raisedMax, money)}`,
      remove: (x) => ({ ...x, raisedMin: undefined, raisedMax: undefined }),
    });
  if (f.valuationMin !== undefined || f.valuationMax !== undefined)
    chips.push({
      key: "valuation",
      label: `Valued ${range(f.valuationMin, f.valuationMax, money)}`,
      remove: (x) => ({ ...x, valuationMin: undefined, valuationMax: undefined }),
    });
  return chips;
}

export const clearFilters = (f: CompanyFilters): CompanyFilters => ({ ...DEFAULT_FILTERS, sort: f.sort, dir: f.dir, view: f.view });

// ---------------------------------------------------------------------------------------------
// Categories

const CATEGORY_ACRONYMS: Record<string, string> = { ai: "AI", saas: "SaaS", api: "API", b2b: "B2B", hr: "HR", ml: "ML", crm: "CRM", devtools: "Devtools" };
/** "spend-management" → "Spend management", "ai" → "AI". */
export const categoryLabel = (c: string) =>
  c
    .replace(/[-_]+/g, " ")
    .split(/(\s+|\/)/)
    .map((w, i) => (Object.hasOwn(CATEGORY_ACRONYMS, w) ? CATEGORY_ACRONYMS[w] : undefined) ?? (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join("");

/** URL slug of a category as stored on profiles ("cross-border payments" → "cross-border-payments"). */
export const categorySlug = (c: string) => slugifyName(c);

/** Investors rendered with the /investors page (the default order's first), and added per "Show more". */
export const INVESTORS_PAGE = 50;

/** People rendered with the /people page (the first by name), and added per "Show more". */
export const PEOPLE_PAGE = 60;

/** Most companies /compare puts side by side (shared by the server page and the client pickers). */
export const MAX_COMPARE = 4;

/** Companies rendered with the /companies page (in its default order); the rest arrive with the full list. */
export const DIRECTORY_PAGE = 30;

/**
 * Company summaries as the directory ships them to the browser: only the fields it shows, filters or
 * searches on. Marks lose their provenance and dark twins (the table draws the light icon), and the
 * logo only needs to exist (the "has logo" filter).
 */
export function directoryRows(companies: CompanySummary[]): CompanySummary[] {
  return companies.map(({ logo, logoDark: _ld, icon, iconDark: _id, employees: _e, website: _w, ...c }) => {
    const row: CompanySummary = { ...c };
    if (logo) row.logo = { src: logo.src };
    if (icon) row.icon = icon.variant ? { src: icon.src, variant: icon.variant } : { src: icon.src };
    for (const k of Object.keys(row) as (keyof CompanySummary)[]) if (row[k] === undefined) delete row[k];
    return row;
  });
}
