// Funding-rounds feed: filter state (as URL search params), filtering, facets, sorting and CSV.
// Pure functions with no server imports: /rounds runs them in the browser over every round, and
// /api/v1/rounds runs the same ones on the server, so a filtered view's URL maps 1:1 onto the API.
import { categoryLabel, countryName, isSecondaryStage, slugifyName, stageLabel, stageRank } from "./directory";
import type { RoundRow } from "./types";

export type RoundSortKey = "date" | "amount" | "valuation" | "company" | "stage";
export const ROUND_SORTS: { id: RoundSortKey; label: string }[] = [
  { id: "date", label: "Date" },
  { id: "amount", label: "Amount (USD)" },
  { id: "valuation", label: "Valuation" },
  { id: "company", label: "Company" },
  { id: "stage", label: "Stage" },
];
const DESC_FIRST: RoundSortKey[] = ["date", "amount", "valuation", "stage"];

export type RoundFilters = {
  q: string;
  stage: string[];
  category: string[];
  country: string[];
  company: string[];
  /** Investor slugs that took part (led or followed). */
  investor: string[];
  /** Investor slugs that led the round. */
  led: string[];
  yearMin?: number;
  yearMax?: number;
  /** In millions of US dollars; rounds without a stated USD amount drop out once a bound is set. */
  amountMin?: number;
  amountMax?: number;
  sort: RoundSortKey;
  dir: "asc" | "desc";
};

export type RoundFacet = "stage" | "category" | "country" | "company" | "investor" | "led";
const FACETS: RoundFacet[] = ["stage", "category", "country", "company", "investor", "led"];
const NUMBER_KEYS = { yearMin: "year_min", yearMax: "year_max", amountMin: "amount_min", amountMax: "amount_max" } as const;

export const DEFAULT_ROUND_FILTERS: RoundFilters = {
  q: "",
  stage: [],
  category: [],
  country: [],
  company: [],
  investor: [],
  led: [],
  sort: "date",
  dir: "desc",
};

type ParamsLike = { get(key: string): string | null };
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g;

export function parseRoundFilters(params: ParamsLike): RoundFilters {
  const list = (key: string) =>
    (params.get(key) ?? "")
      .split(",")
      .map((s) => s.replace(CONTROL, "").trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 50);
  const num = (key: string) => {
    const v = params.get(key);
    if (v === null || v.trim() === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  };
  const sort = params.get("sort") as RoundSortKey | null;
  const valid = sort && ROUND_SORTS.some((s) => s.id === sort) ? sort : DEFAULT_ROUND_FILTERS.sort;
  const dir = params.get("dir");
  const f: RoundFilters = {
    ...DEFAULT_ROUND_FILTERS,
    q: (params.get("q") ?? "").replace(CONTROL, "").slice(0, 100),
    sort: valid,
    dir: dir === "asc" || dir === "desc" ? dir : DESC_FIRST.includes(valid) ? "desc" : "asc",
  };
  for (const facet of FACETS) f[facet] = list(facet);
  f.country = f.country.map((c) => c.toUpperCase());
  for (const [field, key] of Object.entries(NUMBER_KEYS)) f[field as keyof typeof NUMBER_KEYS] = num(key);
  return f;
}

export function serializeRoundFilters(f: RoundFilters): string {
  const p = new URLSearchParams();
  if (f.q.trim()) p.set("q", f.q.trim());
  for (const facet of FACETS) if (f[facet].length) p.set(facet, f[facet].join(","));
  for (const [field, key] of Object.entries(NUMBER_KEYS)) {
    const v = f[field as keyof typeof NUMBER_KEYS];
    if (v !== undefined) p.set(key, String(v));
  }
  if (f.sort !== DEFAULT_ROUND_FILTERS.sort || f.dir !== DEFAULT_ROUND_FILTERS.dir) {
    p.set("sort", f.sort);
    p.set("dir", f.dir);
  }
  return p.toString().replace(/%2C/g, ",");
}

/** The values a round holds for a facet. */
export function roundFacetValues(r: RoundRow, facet: RoundFacet): string[] {
  const slug = (n: string) => r.investorSlugs?.[n] ?? slugifyName(n);
  switch (facet) {
    case "stage":
      return [r.stage];
    case "category":
      return r.categories;
    case "country":
      return r.country ? [r.country] : [];
    case "company":
      return [r.company];
    case "investor":
      return [...new Set([...r.leads, ...r.investors].map(slug))];
    case "led":
      return r.leads.map(slug);
  }
}

const ordered = (a?: number, b?: number): [number | undefined, number | undefined] =>
  a !== undefined && b !== undefined && a > b ? [b, a] : [a, b];
const inRange = (v: number | undefined, a?: number, b?: number) => {
  const [min, max] = ordered(a, b);
  return (min === undefined || (v !== undefined && v >= min)) && (max === undefined || (v !== undefined && v <= max));
};

const haystacks = new WeakMap<RoundRow, string>();
function haystack(r: RoundRow) {
  let h = haystacks.get(r);
  if (h === undefined) {
    h = [r.companyName, r.company, r.round, r.title, stageLabel(r.stage), ...r.leads, ...r.investors].join(" \u0000 ").toLowerCase();
    haystacks.set(r, h);
  }
  return h;
}

/** Rounds matching every filter, except `skip` (used to count that facet's options). */
export function filterRounds(rows: RoundRow[], f: RoundFilters, skip?: RoundFacet): RoundRow[] {
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter((r) => {
    if (words.length && !words.every((w) => haystack(r).includes(w))) return false;
    for (const facet of FACETS) {
      if (facet === skip || !f[facet].length) continue;
      const have = roundFacetValues(r, facet);
      if (!f[facet].some((w) => have.includes(w))) return false;
    }
    if (!inRange(Number(r.date.slice(0, 4)), f.yearMin, f.yearMax)) return false;
    if (!inRange(r.amountUsd === undefined ? undefined : r.amountUsd / 1e6, f.amountMin, f.amountMax)) return false;
    return true;
  });
}

export function roundFacetCounts(rows: RoundRow[], f: RoundFilters, facet: RoundFacet): Map<string, number> {
  const counts = new Map<string, number>();
  for (const r of filterRounds(rows, f, facet)) for (const v of roundFacetValues(r, facet)) counts.set(v, (counts.get(v) ?? 0) + 1);
  return counts;
}

function sortValue(r: RoundRow, key: RoundSortKey): string | number | undefined {
  switch (key) {
    case "date":
      return r.date;
    case "amount":
      return r.amountUsd;
    case "valuation":
      return r.valuationUsd;
    case "company":
      return r.companyName.toLowerCase();
    case "stage":
      return stageRank(r.stage);
  }
}

/** Sorted copy; rounds without a value for the key go last; ties fall back to newest first. */
export function sortRounds(rows: RoundRow[], key: RoundSortKey, dir: "asc" | "desc"): RoundRow[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    const tie = b.date.localeCompare(a.date) || a.companyName.localeCompare(b.companyName);
    if (va === undefined || vb === undefined) return va === vb ? tie : va === undefined ? 1 : -1;
    const cmp = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb));
    return cmp * sign || tie;
  });
}

export function nextRoundSort(f: RoundFilters, key: RoundSortKey): Pick<RoundFilters, "sort" | "dir"> {
  return f.sort === key ? { sort: key, dir: f.dir === "asc" ? "desc" : "asc" } : { sort: key, dir: DESC_FIRST.includes(key) ? "desc" : "asc" };
}

/** Totals of a view: disclosed USD excludes secondary sales and tender offers (no money goes into the company). */
export function roundTotals(rows: RoundRow[]) {
  const primary = rows.filter((r) => !isSecondaryStage(r.stage));
  return {
    rounds: rows.length,
    companies: new Set(rows.map((r) => r.company)).size,
    sized: primary.filter((r) => r.amountUsd).length,
    usd: primary.reduce((s, r) => s + (r.amountUsd ?? 0), 0),
  };
}

export type RoundChip = { key: string; label: string; remove: (f: RoundFilters) => RoundFilters };

export function roundChips(f: RoundFilters, label: (facet: RoundFacet, value: string) => string): RoundChip[] {
  const chips: RoundChip[] = [];
  if (f.q.trim()) chips.push({ key: "q", label: `“${f.q.trim()}”`, remove: (x) => ({ ...x, q: "" }) });
  const prefix: Record<RoundFacet, string> = { stage: "", category: "", country: "", company: "", investor: "With ", led: "Led by " };
  for (const facet of FACETS)
    for (const v of f[facet])
      chips.push({ key: `${facet}:${v}`, label: `${prefix[facet]}${label(facet, v)}`, remove: (x) => ({ ...x, [facet]: x[facet].filter((y) => y !== v) }) });
  const range = (a: number | undefined, b: number | undefined, fmt: (n: number) => string) => {
    const [min, max] = ordered(a, b);
    return min !== undefined && max !== undefined ? `${fmt(min)}–${fmt(max)}` : min !== undefined ? `≥ ${fmt(min)}` : `≤ ${fmt(max!)}`;
  };
  const money = (n: number) => (n >= 1000 ? `$${+(n / 1000).toFixed(2)}B` : `$${n}M`);
  if (f.yearMin !== undefined || f.yearMax !== undefined)
    chips.push({ key: "year", label: range(f.yearMin, f.yearMax, String), remove: (x) => ({ ...x, yearMin: undefined, yearMax: undefined }) });
  if (f.amountMin !== undefined || f.amountMax !== undefined)
    chips.push({ key: "amount", label: `Amount ${range(f.amountMin, f.amountMax, money)}`, remove: (x) => ({ ...x, amountMin: undefined, amountMax: undefined }) });
  return chips;
}

export const clearRoundFilters = (f: RoundFilters): RoundFilters => ({ ...DEFAULT_ROUND_FILTERS, sort: f.sort, dir: f.dir });

/** Facet value → label, for chips and option lists. Investor names come from the rows themselves. */
export function roundLabeler(rows: RoundRow[]) {
  const investors = new Map<string, string>();
  const companies = new Map<string, string>();
  for (const r of rows) {
    companies.set(r.company, r.companyName);
    for (const n of [...r.leads, ...r.investors]) {
      const s = r.investorSlugs?.[n] ?? slugifyName(n);
      if (!investors.has(s)) investors.set(s, n);
    }
  }
  return (facet: RoundFacet, v: string): string => {
    switch (facet) {
      case "stage":
        return stageLabel(v);
      case "category":
        return categoryLabel(v);
      case "country":
        return countryName(v);
      case "company":
        return companies.get(v) ?? v;
      default:
        return investors.get(v) ?? v;
    }
  };
}

// ---------------------------------------------------------------------------------------------
// CSV

const cell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  // Quote anything with a delimiter; neutralise spreadsheet formulas (=, +, -, @ at the start).
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export const ROUND_CSV_COLUMNS = [
  "date",
  "company",
  "company_slug",
  "round",
  "stage",
  "amount_usd",
  "amount",
  "currency",
  "valuation_usd",
  "lead_investors",
  "investors",
  "categories",
  "country",
  "sources",
  "url",
] as const;

/** RFC 4180 CSV of rounds; lists are separated with "; ", source URLs with spaces. */
export function roundsCsv(rows: RoundRow[], origin = ""): string {
  const lines = [ROUND_CSV_COLUMNS.join(",")];
  for (const r of rows)
    lines.push(
      [
        r.date,
        r.companyName,
        r.company,
        r.round,
        stageLabel(r.stage),
        r.amountUsd,
        r.amount,
        r.currency,
        r.valuationUsd,
        r.leads.join("; "),
        r.investors.filter((n) => !r.leads.includes(n)).join("; "),
        r.categories.map(categoryLabel).join("; "),
        r.country,
        [...new Set(r.sources.map((s) => s.url))].join(" "),
        `${origin}/${r.company}#${r.id}`,
      ]
        .map(cell)
        .join(","),
    );
  return lines.join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------------------------------------
// The /rounds feed

/** Rounds rendered with the page (the newest), and added per "Show more". */
export const ROUNDS_PAGE = 60;

/** Hover cards clamp titles to two lines and quotes to three: longer text never shows. */
const clip = (s: string | undefined, n: number) => (s && s.length > n ? s.slice(0, n) : s);

/**
 * Rounds as the feed ships them to the browser, which filters all of them: marks without provenance,
 * investor slugs only where they differ from slugifyName (the default link), source text clipped to
 * what a hover card shows. Absent fields are left out rather than set to undefined.
 */
export function feedRows(rows: RoundRow[]): RoundRow[] {
  const mark = (l?: RoundRow["icon"]) => l && (l.variant ? { src: l.src, variant: l.variant } : { src: l.src });
  return rows.map(({ icon, iconDark, investorSlugs, sources, ...r }) => {
    const slugs = Object.entries(investorSlugs ?? {}).filter(([name, slug]) => slug !== slugifyName(name));
    const row: RoundRow = {
      ...r,
      sources: sources.map(({ url, type, host, title, quote, publishedAt }) => ({
        url,
        type,
        host,
        ...(publishedAt && { publishedAt }),
        ...(title && { title: clip(title, 120) }),
        ...(quote && { quote: clip(quote, 160) }),
      })),
    };
    if (slugs.length) row.investorSlugs = Object.fromEntries(slugs);
    if (icon) row.icon = mark(icon);
    if (iconDark) row.iconDark = mark(iconDark);
    for (const k of Object.keys(row) as (keyof RoundRow)[]) if (row[k] === undefined) delete row[k];
    return row;
  });
}
