import type { SearchHit } from "./types";

// Archive search, shared by the server (lib/lore.ts builds the index) and the browser (the ⌘K menu
// loads the prebuilt /search-index.json and runs runSearch locally: the site is static).

export type IndexEntry = SearchHit & {
  /** Lowercased text the query is matched against. */
  text: string;
  /** Lowercased names, for ranking exact and prefix matches first. */
  names: string[];
  date?: string;
};

export type SearchIndex = Record<SearchHit["type"], IndexEntry[]>;

/** How many hits of each kind the ⌘K menu shows (companies: all of them). */
const SEARCH_LIMITS: Record<SearchHit["type"], number> = { company: Infinity, person: 5, investor: 5, place: 5, story: Infinity, event: 8, quote: 4 };
const SEARCH_ORDER: SearchHit["type"][] = ["company", "person", "investor", "place", "story", "event", "quote"];

/** Exact name, then name prefix, then a word in the name starting with the query, then anything else. */
function rankOf(e: IndexEntry, q: string) {
  if (e.names.some((n) => n === q)) return 0;
  if (e.names.some((n) => n.startsWith(q))) return 1;
  if (e.names.some((n) => n.includes(` ${q}`) || n.includes(`-${q}`))) return 2;
  return 3;
}

/**
 * Search across the archive. The index is built once per archive load (see `fromArchive`), so a
 * query is a scan over a few thousand precomputed lowercase strings: well under a millisecond.
 */
// What people type for names the archive spells out.
const SEARCH_SYNONYMS: Record<string, string[]> = { yc: ["y combinator"], ycombinator: ["y combinator"], a16z: ["andreessen horowitz"] };

const isWordChar = (c?: string) => !!c && /[\p{L}\p{N}]/u.test(c);

/** Short queries only match at the start of a word: "yc" must not find Honeycomb. */
function matchesTerm(text: string, term: string) {
  if (term.length > 3) return text.includes(term);
  for (let i = text.indexOf(term); i >= 0; i = text.indexOf(term, i + 1)) if (!isWordChar(text[i - 1])) return true;
  return false;
}

export function runSearch(index: SearchIndex, q: string): SearchHit[] {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  const terms = [query, ...(SEARCH_SYNONYMS[query] ?? [])];
  const out: SearchHit[] = [];
  for (const type of SEARCH_ORDER) {
    const limit = SEARCH_LIMITS[type];
    const ranked = type === "event" || type === "quote";
    const matches: IndexEntry[] = [];
    for (const e of index[type]) {
      if (!terms.some((t) => matchesTerm(e.text, t))) continue;
      matches.push(e);
      // Events and quotes keep their chronological order; stop as soon as there are enough.
      if (ranked && matches.length >= limit) break;
    }
    const sorted = ranked ? matches : matches.map((e, i) => ({ e, i, r: Math.min(...terms.map((t) => rankOf(e, t))) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.e);
    for (const { text: _t, names: _n, date: _d, ...hit } of sorted.slice(0, limit)) out.push(hit);
  }
  // Someone who is both a founder and an angel is one result.
  const people = new Set(out.filter((h) => h.type === "person").map((h) => h.title));
  return out.filter((h) => h.type !== "investor" || !people.has(h.title));
}

