import { categoryLabel, categorySlug, countryName, isSecondaryStage, roundStage, stageOf } from "./directory";
import { type Archive, type Doc, archive as loadArchive, fromArchive } from "./store";
import { isYC } from "./format";
import type {
  Category,
  CompanySummary,
  DirectoryInvestor,
  DirectoryPerson,
  FundingRound,
  Investor,
  KeyPerson,
  Logo,
  Mark,
  LoreEvent,
  Overview,
  Person,
  PersonRef,
  Photo,
  Place,
  Position,
  Quote,
  RoundRow,
  SearchHit,
  SimilarCompany,
  SourceInfo,
  SourceRef,
  Story,
} from "./types";

export const COMPANY_NAMES: Record<string, string> = {
  vercel: "Vercel",
  resend: "Resend",
  supabase: "Supabase",
  linear: "Linear",
  tangled: "Tangled",
  contextdev: "Context.dev",
  mistral: "Mistral AI",
  railway: "Railway",
  letterboxd: "Letterboxd",
  corgi: "Corgi",
  gradium: "Gradium",
  dust: "Dust",
  photoroom: "Photoroom",
  hcompany: "H Company",
  cloudflare: "Cloudflare",
  ovhcloud: "OVHcloud",
  delve: "Delve",
  shadow: "Shadow",
  e2b: "E2B",
  daytona: "Daytona",
  flyio: "Fly.io",
  zernio: "Zernio",
  legora: "Legora",
  boat: "boat",
  arena: "Are.na",
  goodreads: "Goodreads",
  storygraph: "The StoryGraph",
  pinboard: "Pinboard",
  notion: "Notion",
  figma: "Figma",
  posthog: "PostHog",
  stripe: "Stripe",
  anthropic: "Anthropic",
  netlify: "Netlify",
  render: "Render",
  aikido: "Aikido Security",
  robovision: "Robovision",
  collibra: "Collibra",
  revolut: "Revolut",
  ramp: "Ramp",
  brex: "Brex",
  mercury: "Mercury",
  wise: "Wise",
  monzo: "Monzo",
  klarna: "Klarna",
  nubank: "Nubank",
  qonto: "Qonto",
  plaid: "Plaid",
  chime: "Chime",
  n26: "N26",
  coinbase: "Coinbase",
  robinhood: "Robinhood",
  affirm: "Affirm",
  sofi: "SoFi",
  obsidian: "Obsidian",
  duolingo: "Duolingo",
  openclassrooms: "OpenClassrooms",
  "360learning": "360Learning",
  coursera: "Coursera",
  udemy: "Udemy",
  udacity: "Udacity",
  "khan-academy": "Khan Academy",
  quizlet: "Quizlet",
  babbel: "Babbel",
  kahoot: "Kahoot!",
  // Companies that so far appear only in cross-company stories.
  modal: "Modal",
  blaxel: "Blaxel",
  upstash: "Upstash",
  baseten: "Baseten",
  together: "Together AI",
  codesandbox: "CodeSandbox",
  runloop: "Runloop",
  openai: "OpenAI",
  freestyle: "Freestyle",
  agent37: "Agent37",
  northflank: "Northflank",
  nodeops: "NodeOps",
  aws: "AWS",
  google: "Google",
  docker: "Docker",
  perplexity: "Perplexity",
};

// Official sites, for structured data ("sameAs") and the infobox.
export const COMPANY_SITES: Record<string, string> = {
  vercel: "vercel.com", resend: "resend.com", supabase: "supabase.com", linear: "linear.app", tangled: "tangled.org",
  contextdev: "context.dev", mistral: "mistral.ai", railway: "railway.com", letterboxd: "letterboxd.com",
  corgi: "corgi.insure", gradium: "gradium.ai", dust: "dust.tt", photoroom: "photoroom.com", hcompany: "hcompany.ai",
  cloudflare: "cloudflare.com", ovhcloud: "ovhcloud.com", delve: "delve.co", shadow: "shadow.tech", e2b: "e2b.dev",
  daytona: "daytona.io", flyio: "fly.io", legora: "legora.com", boat: "boat.dev", zernio: "zernio.com",
  arena: "are.na", goodreads: "goodreads.com", storygraph: "thestorygraph.com", pinboard: "pinboard.in",
  notion: "notion.com", figma: "figma.com", posthog: "posthog.com",
  stripe: "stripe.com", anthropic: "anthropic.com", openai: "openai.com", netlify: "netlify.com", render: "render.com",
  aikido: "aikido.dev", robovision: "robovision.ai", collibra: "collibra.com",
};

// Names a company went by, to tell its own founding apart from its founders' earlier companies.
const ALIASES: Record<string, string[]> = {
  vercel: ["vercel", "zeit"],
  resend: ["resend", "zeebbu", "klotty"],
  contextdev: ["context.dev", "brand.dev"],
  mistral: ["mistral"],
  railway: ["railway"],
  letterboxd: ["letterboxd"],
  hcompany: ["h company", "holistic"],
  ovhcloud: ["ovh"],
  shadow: ["shadow", "blade"],
  legora: ["legora", "leya"],
  boat: ["boat", "ascii", "ariana", "dedale"],
  zernio: ["zernio", "late"],
};

// Display names for the names in ALIASES that aren't the current one.
const FORMER_NAMES: Record<string, string[]> = {
  vercel: ["ZEIT"],
  resend: ["Zeebbu", "Klotty"],
  contextdev: ["Brand.dev"],
  hcompany: ["Holistic AI"],
  ovhcloud: ["OVH"],
  shadow: ["Blade"],
  legora: ["Leya"],
  aikido: ["Doomsday"],
  boat: ["Dedale AI", "Ariana", "Ascii"],
  zernio: ["Late"],
};

// The same investor appears under several names across rounds and reports.
const INVESTOR_ALIASES: Record<string, string> = {
  a16z: "andreessen-horowitz",
  "01a": "01-advisors",
  "01advisors": "01-advisors",
  sequoia: "sequoia-capital",
  "y-combinator-yc": "y-combinator",
  yc: "y-combinator",
  // GGV Capital's US team renamed itself Notable Capital in 2024.
  "ggv-capital": "notable-capital",
  ggv: "notable-capital",
};

/**
 * Investor name and alias slugs → the investor entity's slug, from `kind: "investor"` entities and their
 * `aliases`. Rebuilt whenever a new archive object loads (see `archive()` below), so agents' new
 * aliases group rounds without a code change.
 */
let entityAliases = new Map<string, string>();
let aliasesFrom: Archive | undefined;
function refreshInvestorAliases(a: Archive) {
  if (aliasesFrom === a) return;
  const map = new Map<string, string>();
  for (const e of a.entities) {
    if (e.kind !== "investor") continue;
    const target = String(e.slug ?? e._id);
    for (const n of [e.name, ...(Array.isArray(e.aliases) ? e.aliases : [])]) {
      const k = typeof n === "string" ? slugify(n) : "";
      if (k && k !== target && !map.has(k)) map.set(k, target);
    }
  }
  entityAliases = map;
  aliasesFrom = a;
}

/** The archive, with the investor alias table kept in step with it. */
async function archive(): Promise<Archive> {
  const a = await loadArchive();
  refreshInvestorAliases(a);
  return a;
}

export const slugify = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const investorSlug = (name: string) => {
  const s = slugify(name);
  const direct = INVESTOR_ALIASES[s] ?? entityAliases.get(s) ?? s;
  return INVESTOR_ALIASES[direct] ?? direct;
};

export const isDarkVariant = (logo: { src: string; variant?: string; description?: string }) =>
  logo.variant
    ? logo.variant === "dark"
    : /dark/i.test(logo.src) || /white (logo|wordmark|mark)|for dark backgrounds/i.test(logo.description ?? "");

export const companyName = (slug: string) => COMPANY_NAMES[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1);

const IMAGE_EXT = /\.(svg|png|jpe?g|webp|gif|ico)$/i;

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const contains = (haystack: unknown, needle: string) =>
  typeof haystack === "string" && haystack.toLowerCase().includes(needle.toLowerCase());

export function host(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function toPhoto(e: Doc): Photo | undefined {
  const p = e.photo as Record<string, string> | undefined;
  if (!p?.local_path) return undefined;
  return {
    src: `/${p.local_path.replace(/^data\//, "")}`,
    sourceUrl: p.source_url,
    origin: p.origin,
    licence: p.licence,
    author: p.author,
  };
}

function toSourceInfo(d: Doc): SourceInfo {
  const url = String(d.url);
  return {
    url,
    // Links to ycombinator.com are stored as website/blog/article; give them YC's mark.
    type: isYC(url) ? "yc" : String(d.type),
    host: host(url),
    title: str(d.title),
    author: str(d.author),
    publishedAt: str(d.published_at),
    excerpt: str(d.excerpt)?.slice(0, 280),
  };
}

export async function findSources(urls: string[]): Promise<Record<string, SourceInfo>> {
  const wanted = new Set(urls);
  const { sources } = await archive();
  return Object.fromEntries(sources.filter((d) => wanted.has(String(d.url))).map((d) => [String(d.url), toSourceInfo(d)]));
}

async function enrich(raw: Doc[]): Promise<LoreEvent[]> {
  const refs = (e: Doc) => (Array.isArray(e.sources) ? (e.sources as { url: string; quote?: string }[]) : []);
  const byUrl = await findSources(raw.flatMap((e) => refs(e).map((s) => s.url)));
  return raw.map((e) => ({
    id: e._id,
    company: String(e.company),
    date: String(e.date),
    kind: String(e.kind),
    title: String(e.title),
    summary: str(e.summary),
    details: (e.details as Record<string, unknown>) ?? undefined,
    confidence: e.confidence === "inferred" ? "inferred" : "sourced",
    sources: refs(e).map(
      (s): SourceRef => ({
        url: s.url,
        quote: s.quote,
        type: byUrl[s.url]?.type ?? "other",
        title: byUrl[s.url]?.title,
        host: host(s.url),
        publishedAt: byUrl[s.url]?.publishedAt,
      }),
    ),
  }));
}

export type EventQuery = {
  company?: string;
  kinds?: string[];
  from?: string;
  to?: string;
  query?: string;
  limit?: number;
  newestFirst?: boolean;
};

export async function findEvents({ company, kinds, from, to, query, limit, newestFirst }: EventQuery) {
  const { events } = await archive();
  // Dates are YYYY[-MM[-DD]] strings, so lexical comparison is chronological.
  const matches = events
    .filter(
      (e) =>
        (!company || e.company === company) &&
        (!kinds?.length || kinds.includes(String(e.kind))) &&
        (!from || String(e.date) >= from) &&
        (!to || String(e.date) <= `${to}￿`) &&
        (!query || contains(e.title, query) || contains(e.summary, query)),
    )
    .sort((a, b) => String(a.date).localeCompare(String(b.date)) * (newestFirst ? -1 : 1));
  return enrich(matches.slice(0, limit ?? 1000));
}

export function toFunding(events: LoreEvent[]): FundingRound[] {
  return events
    .filter((e) => e.kind === "funding")
    .map((e) => {
      const d = e.details ?? {};
      const list = (v: unknown) => (Array.isArray(v) ? v.map(String).filter((s) => !s.startsWith("~")) : []);
      const names = [...list(d.lead_investors), ...list(d.investors)];
      const round = String(d.round ?? e.title);
      const amountUsd = typeof d.amount_usd === "number" ? d.amount_usd : undefined;
      return {
        investorSlugs: Object.fromEntries(names.map((n) => [n, investorSlug(n)])),
        date: e.date,
        round,
        stage: roundStage(round, d.stage),
        ...(amountUsd === undefined && nativeAmount(d)),
        amountUsd,
        valuationUsd: typeof d.valuation_usd === "number" ? d.valuation_usd : undefined,
        leads: list(d.lead_investors),
        investors: list(d.investors),
        sources: e.sources,
      };
    });
}

/**
 * The amount in the currency the source states, for rounds without a USD figure: `details.amount` +
 * `details.currency`, or an `amount_eur`-style key. Shown as is; never converted.
 */
function nativeAmount(d: Record<string, unknown>): { amount?: number; currency?: string } {
  if (typeof d.amount === "number" && typeof d.currency === "string" && /^[a-z]{3}$/i.test(d.currency) && d.currency.toUpperCase() !== "USD")
    return { amount: d.amount, currency: d.currency.toUpperCase() };
  for (const [k, v] of Object.entries(d)) {
    const m = k.match(/^amount_([a-z]{3})$/);
    if (m && m[1] !== "usd" && typeof v === "number") return { amount: v, currency: m[1].toUpperCase() };
  }
  return {};
}

export async function findFunding(company: string) {
  return toFunding(await findEvents({ company, kinds: ["funding"] }));
}

export async function findQuotes({
  company,
  person,
  query,
  limit,
}: {
  company?: string;
  person?: string;
  query?: string;
  limit?: number;
}): Promise<Quote[]> {
  const { quotes } = await archive();
  return quotes
    .filter(
      (q) =>
        (!company || q.company === company) &&
        (!person || contains(q.person, person)) &&
        (!query || contains(q.text, query) || contains(q.context, query)),
    )
    .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")))
    .slice(0, limit ?? 500)
    .map((q) => {
      const url = String(q.url);
      return {
        id: q._id,
        company: String(q.company),
        person: String(q.person),
        text: String(q.text),
        date: str(q.date),
        url,
        link: str(q.deep_link) ?? (q.timestamp_s ? `${url}${url.includes("?") ? "&" : "?"}t=${q.timestamp_s}s` : url),
        context: str(q.context),
      };
    });
}

export async function findLogos(company?: string, kinds = ["logo", "wordmark"]): Promise<Logo[]> {
  const { assets } = await archive();
  return assets
    .filter((a) => (!company || a.company === company) && kinds.includes(String(a.kind)))
    .filter((a) => typeof a.local_path === "string" && IMAGE_EXT.test(a.local_path))
    .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")))
    .map((a) => ({
      id: a._id,
      company: String(a.company),
      kind: String(a.kind),
      variant: a.variant === "light" || a.variant === "dark" ? a.variant : undefined,
      date: str(a.date),
      src: `/assets/${String(a.local_path).replace(/^data\/assets\//, "")}`,
      sourceUrl: String(a.source_url),
      description: str(a.description),
    }));
}

export async function getOverview(company: string): Promise<Overview | null> {
  const { pages } = await archive();
  const page = pages.find((p) => p.company === company && p.slug === "overview");
  if (!page) return null;
  return {
    title: String(page.title),
    summary: str(page.summary),
    markdown: String(page.markdown),
    updatedAt: String(page.updated_at),
    citations: Number(page.citations ?? 0),
  };
}

async function personSlugs(): Promise<Map<string, string>> {
  const { entities } = await archive();
  const map = new Map<string, string>();
  for (const p of entities.filter((e) => e.kind === "person")) {
    for (const n of [p.name, ...((p.aliases as string[]) ?? [])]) map.set(String(n).toLowerCase(), p._id);
  }
  return map;
}

/** Person name (lowercased, aliases included) → photo, for avatars next to founders and quotes. */
export async function personPhotos(): Promise<Record<string, Photo>> {
  const { entities } = await archive();
  const out: Record<string, Photo> = {};
  for (const p of entities.filter((e) => e.kind === "person")) {
    const photo = toPhoto(p);
    if (photo) for (const n of [p.name, ...((p.aliases as string[]) ?? [])]) out[String(n).toLowerCase()] = photo;
  }
  return out;
}

function founding(slug: string, events: LoreEvent[]) {
  const names = ALIASES[slug] ?? [slug];
  const foundings = events.filter((e) => e.kind === "founding");
  return foundings.find((e) => names.some((n) => e.title.toLowerCase().includes(n))) ?? foundings[0];
}

function foundersOf(events: LoreEvent[], slugs: Map<string, string>, photos: Record<string, Photo> = {}): PersonRef[] {
  const names = new Set<string>();
  for (const e of events.filter((e) => e.kind === "founding")) {
    const d = e.details ?? {};
    for (const n of [...(Array.isArray(d.founders) ? d.founders : []), d.founder]) if (typeof n === "string") names.add(n);
  }
  return [...names].map((name) => ({ name, slug: slugs.get(name.toLowerCase()), photo: photos[name.toLowerCase()] }));
}

// ---------------------------------------------------------------------------------------------
// Company profiles: Crunchbase-style fields on `kind: "company"` entities, with fallbacks
// derived from events when a profile hasn't been written yet.

type CompanyProfile = {
  website?: string;
  legal_name?: string;
  tagline?: string;
  hq?: { city?: string; country?: string } | string;
  categories?: string[];
  status?: string;
  employees?: { count?: number; as_of?: string; source?: string; basis?: string };
  stock?: string;
  stocks?: string[];
  acquired_by?: string;
  acquired_on?: string;
  parent?: string;
  founded?: string;
  former_names?: unknown[];
  /** Field name → the URL that states it (some profiles call it `sources`). */
  field_sources?: Record<string, unknown>;
  sources?: Record<string, unknown>;
};

/** Company slug → its entity (name, summary, profile), when one exists. */
async function companyEntities(): Promise<Map<string, Doc & { profile?: CompanyProfile }>> {
  const { entities } = await archive();
  return new Map(entities.filter((e) => e.kind === "company").map((e) => [String(e.slug ?? e._id), e]));
}

const US_STATES = new Set(
  "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split(
    " ",
  ),
);

// Cities seen in founding events without a country.
const CITY_COUNTRY: Record<string, string> = {
  "san francisco": "US", "new york": "US", "new york city": "US", "los angeles": "US", seattle: "US", boston: "US",
  austin: "US", "palo alto": "US", "mountain view": "US", "menlo park": "US", "san jose": "US", chicago: "US",
  paris: "FR", lyon: "FR", roubaix: "FR", london: "GB", berlin: "DE", munich: "DE", stockholm: "SE", ghent: "BE",
  brussels: "BE", antwerp: "BE", amsterdam: "NL", singapore: "SG", toronto: "CA", dublin: "IE", zagreb: "HR",
  copenhagen: "DK", helsinki: "FI", oslo: "NO", madrid: "ES", barcelona: "ES", lisbon: "PT", zurich: "CH",
  "tel aviv": "IL", bangalore: "IN", bengaluru: "IN", sydney: "AU", auckland: "NZ", wellington: "NZ", tokyo: "JP",
};

let countryCodes: Map<string, string> | undefined;
function countryCode(name?: string): string | undefined {
  if (!name) return undefined;
  const n = name.trim();
  if (/^[A-Z]{2}$/.test(n)) return US_STATES.has(n) ? "US" : n;
  if (!countryCodes) {
    countryCodes = new Map([
      ["usa", "US"], ["us", "US"], ["u.s.", "US"], ["united states of america", "US"], ["uk", "GB"],
      ["england", "GB"], ["scotland", "GB"], ["wales", "GB"], ["holland", "NL"],
    ]);
    const names = new Intl.DisplayNames(["en"], { type: "region" });
    for (let a = 65; a <= 90; a++)
      for (let b = 65; b <= 90; b++) {
        const code = String.fromCharCode(a, b);
        try {
          const label = names.of(code);
          // ICU names retired codes too (FX "France", VD "Vietnam"): map to the current one.
          if (label && label !== code) countryCodes.set(label.toLowerCase(), new Intl.Locale(`und-${code}`).region ?? code);
        } catch {}
      }
  }
  return countryCodes.get(n.toLowerCase());
}

/** "San Francisco, CA" / "Ghent, Belgium" / "Singapore (remote)" → city and ISO country. */
export function parseHq(hq: string): { city?: string; country?: string } {
  const parts = hq
    .replace(/\(.*?\)/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!parts.length) return {};
  const city = parts[0];
  const known = CITY_COUNTRY[city.toLowerCase()];
  // A lone country name ("Belgium") is a country, not a city; a lone city-state ("Singapore") is both.
  const onlyCountry = parts.length === 1 && !known && countryCode(city);
  const country = (parts.length > 1 ? countryCode(parts.at(-1)) : undefined) ?? known ?? countryCode(city);
  return { city: onlyCountry ? undefined : city, country };
}

const ENDED = /abandon|terminat|called off|blocked|cancel/i;
const LISTED = /prices (its )?IPO|IPO priced|IPO on the|starts trading|begins trading|direct listing/i;

/** Status from the timeline: its own acquisition (not a founder's earlier company's), or a listing. */
function deriveStatus(slug: string, name: string, own: LoreEvent[], funding: FundingRound[]) {
  const names = [...new Set([name.toLowerCase(), ...(ALIASES[slug] ?? [slug])])];
  const self = (t: string) => names.some((n) => t.toLowerCase().includes(n));
  const sale = own.filter((e) => e.kind === "acquired" && self(e.title)).at(-1);
  if (sale && !ENDED.test(sale.title)) {
    const by =
      str(sale.details?.acquirer) ??
      str(sale.details?.acquired_by) ??
      sale.title.match(/acquired by ([^,(;:]+)/i)?.[1] ??
      sale.title.match(/^(.+?) (?:agrees to |completes )?(?:acquires?|buys)\b/i)?.[1];
    return { status: "acquired" as const, acquiredBy: by?.trim() };
  }
  if (funding.some((r) => stageOf(r) === "ipo") || own.some((e) => LISTED.test(e.title))) return { status: "public" as const };
  return { status: "active" as const };
}

// Agents tag freely; fold spellings and near-synonyms so facets don't fragment.
const CATEGORY_SYNONYMS: Record<string, string> = {
  "mobile-banking": "neobank",
  "credit-cards": "cards",
  "corporate-cards": "cards",
  investments: "investing",
  "money-transfer": "cross-border-payments",
  "expense-management": "spend-management",
  "ai-agents": "agents",
  "note-taking": "productivity",
  "developer-tools": "devtools",
  api: "devtools",
  bnpl: "buy-now-pay-later",
  // One shelf per subject: the narrow tags live on in the records, not on the site.
  mooc: "online-learning",
  "online-degrees": "online-learning",
  education: "edtech",
  martech: "marketing",
  adtech: "advertising",
  "social-media": "social",
  "online-communities": "community",
  forum: "community",
  "mobile-apps": "mobile",
  trading: "brokerage",
  "workflow-automation": "automation",
  "autonomous-systems": "autonomy",
  "consumer-internet": "consumer",
  "consumer-apps": "consumer",
  "consumer-subscription": "consumer",
  lodging: "hospitality",
  "file-sync": "cloud-storage",
  gtm: "sales",
  "ai-infrastructure": "infrastructure",
  "data-infrastructure": "data",
  "business-banking": "banking",
  acquiring: "payments",
  "payment-processing": "payments",
  messaging: "communication",
  blockchain: "crypto",
  stablecoins: "crypto",
  carpooling: "mobility",
  bus: "mobility",
  "code-editor": "devtools",
  "fair-code": "open-source",
  "direct-debit": "payments",
  "retail-media": "advertising",
  "game-based-learning": "edtech",
  lms: "edtech",
  assessment: "edtech",
  "language-learning": "edtech",
  "vocational-training": "corporate-learning",
  apprenticeship: "corporate-learning",
  "practice-management": "healthtech",
  telehealth: "healthtech",
  "consumer-finance": "consumer-credit",
  "photo-sharing": "social",
  "music-recognition": "music",
  "data-licensing": "data",
  audiobooks: "podcasts",
  "browser-automation": "browser",
  "low-code": "no-code",
  "foreign-exchange": "cross-border-payments",
  "cross-border": "e-commerce",
  "virtual-reality": "augmented-reality",
  logistics: "e-commerce",
  delivery: "gig-economy",
  biotech: "healthtech",
  quantum: "hardware",
  "real-estate": "saas",
  classifieds: "marketplace",
  gifting: "e-commerce",
};
function normalizeCategory(c: unknown) {
  const slug = String(c).trim().toLowerCase().replace(/[\s_]+/g, "-");
  return CATEGORY_SYNONYMS[slug] ?? slug;
}

const STATUS_VALUES = new Set(["active", "acquired", "closed", "public"]);
const VIDEO = /youtube\.com|youtu\.be|vimeo\.com/;

type SummaryContext = {
  events: LoreEvent[];
  quotes: Quote[];
  icons: Logo[];
  slugs: Map<string, string>;
  summary?: string;
  photos?: Record<string, Photo>;
  entity?: Doc & { profile?: CompanyProfile };
};

function summarize(slug: string, { events, quotes, icons, slugs, summary, photos = {}, entity }: SummaryContext): CompanySummary {
  const own = events.filter((e) => e.company === slug);
  const ownQuotes = quotes.filter((q) => q.company === slug);
  const start = founding(slug, own);
  const funding = toFunding(own);
  const usable = icons.filter((l) => l.company === slug && !isDarkVariant(l));
  const full = usable.filter((l) => l.kind !== "icon");
  const darks = icons.filter((l) => l.company === slug && isDarkVariant(l));
  const logo = full.at(-1) ?? usable.at(-1);
  const icon =
    usable.filter((l) => l.kind === "icon").at(-1) ??
    icons.filter((l) => l.company === slug && l.kind === "icon").at(-1);
  // The dark-theme twin of a light mark: same kind group, not older (no outdated logo in dark mode).
  const darkTwin = (light: Logo | undefined, pool: Logo[]) => {
    const d = pool.at(-1);
    return light && d && !isDarkVariant(light) && (d.date ?? "") >= (light.date ?? "") ? d : undefined;
  };
  const profile: CompanyProfile = (entity?.profile as CompanyProfile) ?? {};
  const name = COMPANY_NAMES[slug] ?? str(entity?.name) ?? companyName(slug);

  // HQ: the profile's structured place, else the free text on a founding event.
  const eventHq = own.map((e) => e.details?.hq).find((h): h is string => typeof h === "string");
  const profileHq = typeof profile.hq === "string" ? parseHq(profile.hq) : profile.hq;
  const parsed = eventHq ? parseHq(eventHq) : {};
  const city = str(profileHq?.city) ?? parsed.city;
  const country = str(profileHq?.country)?.toUpperCase() ?? parsed.country;

  const derived = deriveStatus(slug, name, own, funding);
  const status = STATUS_VALUES.has(String(profile.status)) ? (profile.status as CompanySummary["status"]) : profile.stock ? "public" : derived.status;

  const primary = funding.filter((r) => !isSecondaryStage(stageOf(r)));
  const last = (primary.length ? primary : funding).at(-1);
  const investors = new Map<string, { slug: string; name: string; lead: boolean }>();
  for (const r of funding)
    for (const n of [...r.leads, ...r.investors]) {
      const s = investorSlug(n);
      if (!s) continue;
      const prev = investors.get(s);
      investors.set(s, { slug: s, name: prev?.name ?? n, lead: !!prev?.lead || r.leads.includes(n) });
    }
  const media = new Set([
    ...ownQuotes.map((q) => q.url).filter((u) => VIDEO.test(u)),
    ...own.flatMap((e) => e.sources.filter((s) => s.type === "youtube" || s.type === "podcast" || VIDEO.test(s.url)).map((s) => s.url)),
  ]);
  const employees = profile.employees?.count
    ? { count: profile.employees.count, asOf: profile.employees.as_of, source: profile.employees.source }
    : undefined;

  return {
    slug,
    name,
    summary: summary ?? str(profile.tagline) ?? str(entity?.summary),
    hasOverview: !!summary,
    events: own.length,
    quotes: ownQuotes.length,
    videos: media.size,
    sources: new Set(own.flatMap((e) => e.sources.map((s) => s.url))).size,
    founded: start?.date ?? str(profile.founded) ?? own[0]?.date,
    founders: foundersOf(own, slugs, photos),
    hq: eventHq ?? ([city, countryName(country)].filter(Boolean).join(", ") || undefined),
    city,
    country,
    categories: Array.isArray(profile.categories) ? [...new Set(profile.categories.map(normalizeCategory))] : [],
    status,
    statusDerived: !STATUS_VALUES.has(String(profile.status)) && !profile.stock,
    website: str(profile.website) ?? (COMPANY_SITES[slug] ? `https://${COMPANY_SITES[slug]}` : undefined),
    legalName: str(profile.legal_name),
    tagline: str(profile.tagline),
    employees,
    stock: str(profile.stock),
    acquiredBy: str(profile.acquired_by) ?? (status === "acquired" ? derived.acquiredBy : undefined),
    raisedUsd: primary.reduce((sum, r) => sum + (r.amountUsd ?? 0), 0),
    valuationUsd: funding.filter((r) => r.valuationUsd).at(-1)?.valuationUsd,
    rounds: funding.length,
    lastRound: last && { round: last.round, stage: stageOf(last), date: last.date, amountUsd: last.amountUsd },
    investors: [...investors.values()],
    kinds: [...new Set(own.map((e) => e.kind))],
    lastEvent: own.at(-1)?.date,
    logo,
    // A wordmark squeezed into a square is unreadable: no icon means a monogram. White-only marks
    // (dark variant) still work: CompanyMark puts them on a dark tile.
    icon,
    logoDark: darkTwin(logo, darks.filter((l) => (logo?.kind === "icon") === (l.kind === "icon"))),
    iconDark: darkTwin(icon, darks.filter((l) => l.kind === "icon")),
  };
}

/** Every company's summary, computed once per archive load (the directory, search and most pages need it). */
export async function listCompanies(): Promise<CompanySummary[]> {
  return [...(await fromArchive(await archive(), "companies", buildCompanies))];
}

async function buildCompanies(): Promise<CompanySummary[]> {
  const [events, quotes, icons, slugs, entities, { pages }] = await Promise.all([
    // Every event: the default limit of 1000 would silently drop the newest ones.
    findEvents({ limit: Infinity }),
    findQuotes({ limit: Infinity }),
    findLogos(undefined, ["logo", "wordmark", "icon"]),
    personSlugs(),
    companyEntities(),
    archive(),
  ]);
  const summaries = new Map(pages.filter((p) => p.slug === "overview").map((p) => [String(p.company), str(p.summary)]));
  return [...new Set(events.map((e) => e.company))]
    .map((slug) =>
      summarize(slug, { events, quotes, icons, slugs, summary: summaries.get(slug), entity: entities.get(slug) }),
    )
    .sort((a, b) => b.events - a.events);
}

export async function getCompany(slug: string) {
  const [events, quotes, logos, icons, overview, slugs, photos, entities, all, { entities: docs }] = await Promise.all([
    findEvents({ company: slug }),
    findQuotes({ company: slug }),
    findLogos(slug),
    findLogos(slug, ["logo", "wordmark", "icon"]),
    getOverview(slug),
    personSlugs(),
    personPhotos(),
    companyEntities(),
    listCompanies(),
    archive(),
  ]);
  if (!events.length) return null;
  const entity = entities.get(slug);
  const profile: CompanyProfile = (entity?.profile as CompanyProfile) ?? {};
  const summary = summarize(slug, { events, quotes, icons, slugs, summary: overview?.summary, photos, entity });

  // Profile field → the URL that states it. Founded prefers the founding event's own source.
  const facts: Record<string, string> = {};
  for (const map of [profile.field_sources, profile.sources])
    if (map && typeof map === "object" && !Array.isArray(map))
      for (const [k, v] of Object.entries(map)) if (typeof v === "string" && /^https?:\/\//.test(v)) facts[k] ??= v;
  if (profile.employees?.source) facts.employees = profile.employees.source;
  const start = founding(slug, events);
  if (start && start.date === summary.founded && start.sources[0]) facts.founded = start.sources[0].url;
  else if (summary.founded !== str(profile.founded)) delete facts.founded;

  const citedUrls = [
    ...events.flatMap((e) => e.sources.map((s) => s.url)),
    ...[...(overview?.markdown.matchAll(/\{\{cite:([^}\s]+)\}\}/g) ?? [])].map((m) => m[1]),
    ...Object.values(facts),
  ];
  const sources = await findSources(citedUrls);
  const identity = events.filter((e) => ["rename", "domain", "logo", "rebrand"].includes(e.kind));
  const people = [...new Set([...summary.founders.map((f) => f.name), ...quotes.map((q) => q.person)])]
    .map((name) => ({ name, slug: slugs.get(name.toLowerCase()) }))
    .filter((p) => p.slug);

  return {
    ...summary,
    events,
    quotes,
    logos,
    overview,
    sources,
    identity,
    people,
    keyPeople: keyPeople(slug, summary, events, docs, slugs, photos),
    similar: similarCompanies(summary, all),
    funding: toFunding(events),
    formerNames: FORMER_NAMES[slug] ?? (Array.isArray(profile.former_names) ? profile.former_names.map(String) : []),
    /** Profile field (website, legal_name, hq, status, employees, …) → source URL. */
    facts,
    links: (entity?.links as Record<string, string> | undefined) ?? {},
    stocks: Array.isArray(profile.stocks) ? profile.stocks.map(String) : summary.stock ? [summary.stock] : [],
    acquiredOn: str(profile.acquired_on),
    parent: str(profile.parent),
    /** Archive pages for the acquirer and the parent company, when they have one. */
    acquirerSlug: companyIn(all, summary.acquiredBy),
    parentSlug: companyIn(all, str(profile.parent)),
    employeesBasis: str(profile.employees?.basis),
    photos,
    places: (await listPlaces()).filter((p) => p.companies.includes(slug)),
  };
}

const companyIn = (all: CompanySummary[], name?: string) =>
  name ? all.find((c) => c.slug === slugify(name) || c.name.toLowerCase() === name.toLowerCase())?.slug : undefined;

const FOUNDER_ROLE = /founder/i;

/** A person entity's dated positions (`roles: [{company, title, from, to, source}]`), oldest first. */
function positionsOf(p?: Doc): Position[] {
  if (!Array.isArray(p?.roles)) return [];
  return (p.roles as Record<string, unknown>[])
    .filter((r) => r && typeof r.company === "string" && typeof r.title === "string")
    .map((r) => ({
      company: String(r.company),
      title: String(r.title),
      from: str(r.from),
      to: str(r.to),
      source: typeof r.source === "string" && /^https?:\/\//.test(r.source) ? r.source : undefined,
    }))
    .sort((a, b) => (a.from ?? "").localeCompare(b.from ?? ""));
}

/** "2019–2023", "2023–", "–2021", or nothing when the source gives no dates. */
export function positionDates(p: Pick<Position, "from" | "to">) {
  if (!p.from && !p.to) return "";
  return `${p.from ? formatMonth(p.from) : ""}–${p.to ? formatMonth(p.to) : ""}`;
}

/** Founders, then people whose entity names a role at the company, then hires, then other linked people. */
function keyPeople(
  slug: string,
  summary: CompanySummary,
  events: LoreEvent[],
  docs: Doc[],
  slugs: Map<string, string>,
  photos: Record<string, Photo>,
): KeyPerson[] {
  const persons = new Map(docs.filter((d) => d.kind === "person").map((d) => [d._id, d]));
  const positionsAt = (p?: Doc) => positionsOf(p).filter((r) => r.company === slug);
  // The label under the name: the latest position here (with dates); the card lists them all.
  const roleAt = (p?: Doc) => {
    const latest = positionsAt(p).at(-1);
    return latest && [latest.title, positionDates(latest) && `(${positionDates(latest)})`].filter(Boolean).join(" ");
  };
  const out = new Map<string, KeyPerson>();
  const add = (name: string, extra: Partial<KeyPerson>) => {
    const personSlug = slugs.get(name.toLowerCase());
    const key = personSlug ?? name.toLowerCase();
    if (out.has(key)) return;
    const doc = personSlug ? persons.get(personSlug) : undefined;
    out.set(key, {
      name: doc ? String(doc.name) : name,
      slug: personSlug,
      photo: photos[name.toLowerCase()],
      founder: false,
      blurb: str(doc?.summary),
      ...extra,
      role: roleAt(doc) ?? extra.role,
      positions: positionsAt(doc),
    });
  };
  const many = summary.founders.length > 1;
  for (const f of summary.founders) add(f.name, { founder: true, role: many ? "Co-founder" : "Founder" });
  for (const p of persons.values())
    if (positionsAt(p).length) add(String(p.name), { founder: positionsAt(p).some((r) => FOUNDER_ROLE.test(r.title)) });
  for (const e of events.filter((e) => e.kind === "hire")) {
    const name = str(e.details?.person);
    if (!name) continue;
    const role = str(e.details?.role) ?? str(e.details?.title);
    add(name, { role: role ?? `Joined ${formatMonth(e.date)}`, blurb: e.title, event: e.id });
  }
  for (const p of persons.values())
    if (Array.isArray(p.companies) && p.companies.includes(slug)) add(String(p.name), {});
  return [...out.values()].slice(0, 18);
}

const formatMonth = (date: string) => {
  const [y, m] = date.split("-");
  return m ? `${new Date(Date.UTC(+y, +m - 1, 1)).toLocaleString("en", { month: "short", timeZone: "UTC" })} ${y}` : y;
};

/** Companies sharing categories (weighted) and investors with `c`, best first. */
function similarCompanies(c: CompanySummary, all: CompanySummary[], limit = 6): SimilarCompany[] {
  const cats = new Set(c.categories);
  const backers = new Map(c.investors.map((i) => [i.slug, i]));
  return all
    .filter((o) => o.slug !== c.slug)
    .map((o) => {
      const sharedCategories = o.categories.filter((x) => cats.has(x));
      const sharedInvestors = o.investors.filter((i) => backers.has(i.slug)).map((i) => ({ slug: i.slug, name: backers.get(i.slug)!.name }));
      // A shared niche category says more than a shared broad one ("ai" is on a third of profiles).
      const catScore = sharedCategories.reduce((s, x) => s + 1 + 2 / Math.max(1, all.filter((a) => a.categories.includes(x)).length), 0);
      return { o, sharedCategories, sharedInvestors, score: catScore * 2 + Math.min(sharedInvestors.length, 5) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.o.events - a.o.events)
    .slice(0, limit)
    .map(({ o, sharedCategories, sharedInvestors }) => ({
      slug: o.slug,
      name: o.name,
      summary: o.summary,
      icon: o.icon,
      iconDark: o.iconDark,
      status: o.status,
      sharedCategories,
      sharedInvestors,
    }));
}

/** Every category on a company profile, with its companies (most documented first). */
export async function listCategories(): Promise<Category[]> {
  const companies = await listCompanies();
  const bySlug = new Map<string, Category>();
  for (const c of companies)
    for (const id of c.categories) {
      const slug = categorySlug(id);
      if (!slug) continue;
      const cat = bySlug.get(slug) ?? { slug, id, label: categoryLabel(id), companies: [] };
      if (!cat.companies.includes(c)) cat.companies.push(c);
      bySlug.set(slug, cat);
    }
  return [...bySlug.values()].sort((a, b) => b.companies.length - a.companies.length || a.label.localeCompare(b.label));
}

export async function getCategory(slug: string) {
  return (await listCategories()).find((c) => c.slug === slug) ?? null;
}

export type CompanyLore = NonNullable<Awaited<ReturnType<typeof getCompany>>>;

export async function getEvent(id: string) {
  const { events } = await archive();
  const raw = events.find((e) => e._id === id);
  return raw ? (await enrich([raw]))[0] : null;
}

export async function latestEvents(limit = 8) {
  // Only fully dated events, so "latest" means something.
  const { events } = await archive();
  const dated = events
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(String(e.date)))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return enrich(dated.slice(0, limit));
}

/** Every funding round across companies, newest first, with its company's mark, categories and country. */
export async function listRounds(): Promise<RoundRow[]> {
  return [...(await fromArchive(await archive(), "rounds", buildRounds))];
}

/** A logo reduced to what a mark needs, for payloads that repeat it on every row. */
const markOnly = (l?: Mark): Mark | undefined => l && (l.variant ? { src: l.src, variant: l.variant } : { src: l.src });

async function buildRounds(): Promise<RoundRow[]> {
  const [events, companies] = await Promise.all([findEvents({ kinds: ["funding"], limit: Infinity, newestFirst: true }), listCompanies()]);
  const bySlug = new Map(companies.map((c) => [c.slug, c]));
  return events.map((e) => {
    const [r] = toFunding([e]);
    const c = bySlug.get(e.company);
    return {
      ...r,
      stage: r.stage ?? "other",
      // Hover cards show at most a few lines: keep the payload small.
      sources: r.sources.map((s) => ({ ...s, quote: s.quote?.slice(0, 280) })),
      id: e.id,
      company: e.company,
      companyName: c?.name ?? companyName(e.company),
      title: e.title,
      icon: markOnly(c?.icon),
      iconDark: markOnly(c?.iconDark),
      categories: c?.categories ?? [],
      country: c?.country,
    };
  });
}

/** Event kinds that make a company's story at a glance (funding has its own chart). */
const KEY_KINDS = ["founding", "rename", "rebrand", "pivot", "launch", "product", "acquisition", "acquired", "milestone", "open-source", "layoff", "controversy"];

export type ComparedCompany = {
  company: CompanySummary;
  rounds: RoundRow[];
  /** Key events, oldest first: id, date, kind and title only. */
  events: { id: string; date: string; kind: string; title: string }[];
};

/** Side-by-side data for 2–4 companies: their summaries, every round, and key events. */
export async function getComparison(slugs: string[]): Promise<ComparedCompany[]> {
  const [companies, rounds, { events }] = await Promise.all([listCompanies(), listRounds(), archive()]);
  const bySlug = new Map(companies.map((c) => [c.slug, c]));
  return [...new Set(slugs)]
    .filter((s) => bySlug.has(s))
    .slice(0, 4)
    .map((slug) => ({
      company: bySlug.get(slug)!,
      rounds: rounds.filter((r) => r.company === slug).sort((a, b) => a.date.localeCompare(b.date)),
      events: events
        .filter((e) => e.company === slug && KEY_KINDS.includes(String(e.kind)))
        .map((e) => ({ id: e._id, date: String(e.date), kind: String(e.kind), title: String(e.title) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }));
}

export async function listInvestors(): Promise<Investor[]> {
  return [...(await fromArchive(await archive(), "investors", buildInvestors))];
}

async function buildInvestors(): Promise<Investor[]> {
  const [rounds, { entities }] = await Promise.all([findEvents({ kinds: ["funding"], limit: Infinity }), archive()]);
  const bySlug = new Map<string, Investor>();
  for (const e of rounds) {
    for (const r of toFunding([e])) {
      for (const name of new Set([...r.leads, ...r.investors])) {
        const slug = investorSlug(name);
        if (!slug) continue;
        const inv = bySlug.get(slug) ?? { slug, name, stakes: [], companies: [], leads: 0, stages: [] };
        const lead = r.leads.includes(name);
        const stage = stageOf(r);
        inv.stakes.push({ company: e.company, round: r.round, date: r.date, lead, stage });
        if (!inv.companies.includes(e.company)) inv.companies.push(e.company);
        if (!inv.stages!.includes(stage)) inv.stages!.push(stage);
        if (lead) inv.leads++;
        bySlug.set(slug, inv);
      }
    }
  }
  for (const ent of entities.filter((e) => e.kind === "investor")) {
    const inv = bySlug.get(investorSlug(String(ent.slug ?? ent.name))) ?? bySlug.get(investorSlug(String(ent.name)));
    if (inv) {
      inv.summary = str(ent.summary);
      inv.name = String(ent.name);
    }
  }
  return [...bySlug.values()].sort(
    (a, b) => b.companies.length - a.companies.length || b.leads - a.leads || a.name.localeCompare(b.name),
  );
}

/** Every investor, trimmed to what the /investors filters and table use, in the default order. */
export async function investorRows(): Promise<DirectoryInvestor[]> {
  return (await listInvestors()).map((i) => ({
    slug: i.slug,
    name: i.name,
    companies: i.companies,
    leads: i.leads,
    stages: i.stages,
    stakes: i.stakes.map((x) => ({ company: x.company, lead: x.lead, stage: x.stage })),
  }));
}

export async function getInvestor(slug: string) {
  return (await listInvestors()).find((i) => i.slug === slug) ?? null;
}

export async function listPeople(): Promise<Person[]> {
  const { entities } = await archive();
  return entities
    .filter((e) => e.kind === "person")
    .sort((a, b) => String(a.name).localeCompare(String(b.name)))
    .map((p) => ({
      slug: p._id,
      name: String(p.name),
      aliases: (p.aliases as string[]) ?? [],
      summary: str(p.summary),
      links: (p.links as Record<string, string>) ?? {},
      sources: ((p.sources as { url: string }[]) ?? []).map((s) => s.url),
      photo: toPhoto(p),
      positions: positionsOf(p),
    }));
}

/** People with the roles and companies the archive links them to, for the /people filters. */
export async function listPeopleDirectory(): Promise<Person[]> {
  const [people, investors, { events, quotes }] = await Promise.all([listPeople(), listInvestors(), archive()]);
  const bySlug = new Map(people.map((p) => [p.slug, { roles: new Set<string>(), companies: new Set<string>() }]));
  const byName = new Map<string, string>();
  for (const p of people) for (const n of [p.name, ...p.aliases]) byName.set(n.toLowerCase(), p.slug);
  const link = (name: unknown, company: string, role?: string) => {
    const entry = bySlug.get(byName.get(String(name).toLowerCase()) ?? "");
    if (!entry) return;
    entry.companies.add(company);
    if (role) entry.roles.add(role);
  };
  for (const e of events.filter((e) => e.kind === "founding")) {
    const d = (e.details as Record<string, unknown>) ?? {};
    for (const n of [...(Array.isArray(d.founders) ? d.founders : []), d.founder]) if (typeof n === "string") link(n, String(e.company), "founder");
  }
  const investorBySlug = new Map(investors.map((i) => [i.slug, i]));
  for (const p of people) {
    const backed = [p.name, ...p.aliases].map((n) => investorBySlug.get(investorSlug(n))).find(Boolean);
    if (backed) for (const c of backed.companies) link(p.name, c, "investor");
  }
  for (const q of quotes) link(q.person, String(q.company));
  for (const p of people) for (const r of p.positions ?? []) link(p.name, r.company, FOUNDER_ROLE.test(r.title) ? "founder" : undefined);
  const { entities } = await archive();
  for (const e of entities.filter((e) => e.kind === "person" && Array.isArray(e.companies)))
    for (const c of e.companies as unknown[]) bySlug.get(e._id)?.companies.add(String(c));
  return people.map((p) => {
    const { roles, companies } = bySlug.get(p.slug)!;
    // Linked to a company without founding or backing it: treat as staff (early employee, executive).
    if (!roles.size && companies.size) roles.add("employee");
    return { ...p, roles: [...roles] as Person["roles"], companies: [...companies] };
  });
}

/** Everyone, trimmed to what the /people filters and cards use. */
export async function peopleRows(): Promise<DirectoryPerson[]> {
  return (await listPeopleDirectory()).map((p) => ({
    slug: p.slug,
    name: p.name,
    aliases: p.aliases,
    summary: p.summary,
    roles: p.roles,
    companies: p.companies,
    ...(p.photo && { photo: { src: p.photo.src, sourceUrl: p.photo.sourceUrl } }),
  }));
}

export async function listPlaces(): Promise<Place[]> {
  const { entities } = await archive();
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  return entities
    .filter((e) => e.kind === "place")
    .map((p) => ({
      slug: p._id,
      name: String(p.name),
      city: str(p.city),
      country: str(p.country),
      address: str(p.address),
      coordinates: p.coordinates as Place["coordinates"],
      opened: str(p.opened),
      summary: str(p.summary),
      history: str(p.history),
      links: (p.links as Record<string, string>) ?? {},
      companies: arr(p.companies),
      events: arr(p.events),
      people: arr(p.people),
      photo: toPhoto(p),
    }))
    .sort((a, b) => b.companies.length + b.events.length - (a.companies.length + a.events.length) || a.name.localeCompare(b.name));
}

export async function getPlace(slug: string) {
  const place = (await listPlaces()).find((p) => p.slug === slug);
  if (!place) return null;
  const { events } = await archive();
  const own = await enrich(
    events.filter((e) => place.events.includes(e._id)).sort((a, b) => String(a.date).localeCompare(String(b.date))),
  );
  const cites = [...(place.history?.matchAll(/\{\{cite:([^}\s]+)\}\}/g) ?? [])].map((m) => m[1]);
  const people = (await listPeople()).filter((p) => place.people.includes(p.slug));
  return { ...place, timeline: own, sources: await findSources(cites), peopleRefs: people };
}

export async function listStories(): Promise<Story[]> {
  const { pages } = await archive();
  return pages
    .filter((p) => p.company === "story")
    .map((p) => ({
      slug: String(p.slug),
      title: String(p.title),
      summary: str(p.summary),
      markdown: String(p.markdown),
      companies: Array.isArray(p.companies) ? p.companies.map(String) : [],
      updatedAt: String(p.updated_at),
    }));
}

export async function getStory(slug: string) {
  const story = (await listStories()).find((s) => s.slug === slug);
  if (!story) return null;
  const cites = [...story.markdown.matchAll(/\{\{cite:([^}\s]+)\}\}/g)].map((m) => m[1]);
  return { ...story, sources: await findSources(cites) };
}

export async function getPerson(slug: string) {
  const person = (await listPeople()).find((p) => p.slug === slug);
  if (!person) return null;
  const names = [person.name, ...person.aliases.filter((a) => a.length > 3)];
  const [events, quotes, investors, sources] = await Promise.all([
    Promise.all(names.map((n) => findEvents({ query: n, limit: 60 }))).then((lists) =>
      [...new Map(lists.flat().map((e) => [e.id, e])).values()].sort((a, b) => a.date.localeCompare(b.date)),
    ),
    findQuotes({ person: person.name, limit: 40 }),
    listInvestors(),
    findSources([...person.sources, ...(person.positions ?? []).flatMap((r) => (r.source ? [r.source] : []))]),
  ]);
  const backed = investors.find((i) => investorSlug(i.name) === investorSlug(person.name));
  return { ...person, events, quotes, backed, sources };
}

import { runSearch, type IndexEntry, type SearchIndex } from "./search-core";

/** A compact company list for instant, in-browser matching in the ⌘K menu. */
export type CompanyIndexEntry = {
  slug: string;
  name: string;
  /** Former names and other spellings it is found under. */
  aka: string[];
  /** Display names it went by before (ZEIT for Vercel). */
  former: string[];
  summary?: string;
  icon?: Pick<Logo, "src" | "variant">;
  iconDark?: Pick<Logo, "src" | "variant">;
};

const lower = (...xs: unknown[]) =>
  xs
    .filter((x): x is string => typeof x === "string" && x.length > 0)
    .join(" \u0000 ")
    .toLowerCase();

async function buildSearchIndex(): Promise<SearchIndex> {
  const [companies, people, investors, places, stories, { events, quotes }] = await Promise.all([
    listCompanies(),
    listPeople(),
    listInvestors(),
    listPlaces(),
    listStories(),
    archive(),
  ]);
  const entry = (hit: SearchHit, names: unknown[], text: unknown[] = names, date?: string): IndexEntry => ({
    ...hit,
    names: names.filter((n): n is string => typeof n === "string").map((n) => n.toLowerCase()),
    text: lower(...text),
    date,
  });
  return {
    company: companies.map((c) => {
      const names = [c.name, c.slug, ...(ALIASES[c.slug] ?? []), ...(FORMER_NAMES[c.slug] ?? [])];
      return entry({ type: "company", title: c.name, subtitle: c.summary, href: `/${c.slug}` }, names);
    }),
    person: people.map((p) => entry({ type: "person", title: p.name, subtitle: p.summary, href: `/people/${p.slug}` }, [p.name, ...p.aliases])),
    investor: investors.map((i) =>
      entry(
        { type: "investor", title: i.name, subtitle: `Backed ${i.companies.map(companyName).join(", ")}`, href: `/investors/${i.slug}` },
        [i.name],
      ),
    ),
    place: places.map((p) =>
      entry(
        { type: "place", title: p.name, subtitle: [p.city, p.country].filter(Boolean).join(", "), href: `/places/${p.slug}` },
        [p.name],
        [p.name, p.city],
      ),
    ),
    story: stories.map((st) => entry({ type: "story", title: st.title, subtitle: st.summary, href: `/stories/${st.slug}` }, [st.title], [st.title, st.summary])),
    // Newest first, so the first matches are the ones shown.
    event: [...events]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .map((e) =>
        entry(
          { type: "event", title: String(e.title), subtitle: `${companyName(String(e.company))} · ${e.date}`, href: `/${e.company}#${e._id}` },
          [e.title],
          [e.title, e.summary],
          String(e.date),
        ),
      ),
    quote: [...quotes]
      .sort((a, b) => String(a.date ?? "").localeCompare(String(b.date ?? "")))
      .map((qt) => {
        const text = String(qt.text);
        return entry(
          {
            type: "quote",
            title: `“${text.slice(0, 110)}${text.length > 110 ? "…" : ""}”`,
            subtitle: `${qt.person} · ${companyName(String(qt.company))}`,
            href: `/${qt.company}#quotes`,
          },
          [],
          [qt.text, qt.context],
        );
      }),
  };
}

export const searchIndex = async () => fromArchive(await archive(), "search", buildSearchIndex);

/** Search across the archive (the ⌘K menu runs the same code in the browser over /search-index.json). */
export async function search(q: string): Promise<SearchHit[]> {
  return runSearch(await searchIndex(), q);
}

/** Every company, compact: what the ⌘K menu needs to match names instantly in the browser. */
export async function companyIndex(): Promise<CompanyIndexEntry[]> {
  const a = await archive();
  return fromArchive(a, "company-index", async () =>
    (await listCompanies())
      .map((c) => ({
        slug: c.slug,
        name: c.name,
        aka: [...new Set([...(FORMER_NAMES[c.slug] ?? []), ...(ALIASES[c.slug] ?? [])].map((n) => n.toLowerCase()))].filter((n) => n !== c.name.toLowerCase()),
        former: FORMER_NAMES[c.slug] ?? [],
        summary: c.summary?.slice(0, 140),
        icon: c.icon && { src: c.icon.src, variant: c.icon.variant },
        iconDark: c.iconDark && { src: c.iconDark.src, variant: c.iconDark.variant },
      }))
      .sort((x, y) => x.name.localeCompare(y.name)),
  );
}

export async function stats() {
  const { events, sources, quotes } = await archive();
  return {
    events: events.length,
    sources: sources.length,
    quotes: quotes.length,
    companies: new Set(events.map((e) => e.company)).size,
  };
}

/** Archive-wide numbers for /stats, all counted from the records (nothing estimated or converted). */
export async function archiveStats() {
  const a = await archive();
  return fromArchive(a, "stats", async () => {
    const [base, rounds, investors, people] = await Promise.all([stats(), listRounds(), listInvestors(), listPeople()]);
    const primary = rounds.filter((r) => !isSecondaryStage(r.stage));
    const byYear = new Map<number, { year: number; rounds: number; usd: number }>();
    for (const r of rounds) {
      const year = Number(r.date.slice(0, 4));
      const y = byYear.get(year) ?? { year, rounds: 0, usd: 0 };
      y.rounds++;
      if (!isSecondaryStage(r.stage)) y.usd += r.amountUsd ?? 0;
      byYear.set(year, y);
    }
    const byStage = new Map<string, number>();
    for (const r of rounds) byStage.set(r.stage, (byStage.get(r.stage) ?? 0) + 1);
    return {
      ...base,
      rounds: rounds.length,
      /** Primary rounds with a stated USD amount, and their sum (secondaries and tenders excluded). */
      roundsUsd: primary.filter((r) => r.amountUsd).length,
      totalUsd: primary.reduce((sum, r) => sum + (r.amountUsd ?? 0), 0),
      /** Rounds whose only stated amount is in another currency (counted, never converted). */
      roundsOtherCurrency: rounds.filter((r) => !r.amountUsd && r.amount && r.currency).length,
      valuations: rounds.filter((r) => r.valuationUsd).length,
      investors: investors.length,
      people: people.length,
      fundedCompanies: new Set(rounds.map((r) => r.company)).size,
      byYear: [...byYear.values()].sort((x, y) => x.year - y.year),
      byStage: [...byStage].map(([stage, count]) => ({ stage, count })).sort((x, y) => y.count - x.count),
    };
  });
}

export type PrimaryVideo = { id: string; url: string; title?: string };

/** The YouTube video quoted most on a page: shared as og:video so chat apps can play it inline. */
export async function primaryVideo(filter: { company?: string; person?: string }): Promise<PrimaryVideo | null> {
  const quotes = await findQuotes({ ...filter, limit: 500 });
  const counts = new Map<string, number>();
  for (const q of quotes) {
    const id = q.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)?.[1];
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const [id] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!id) return null;
  const url = `https://www.youtube.com/watch?v=${id}`;
  return { id, url, title: (await findSources([url]))[url]?.title };
}
