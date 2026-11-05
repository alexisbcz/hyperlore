export type SourceRef = {
  url: string;
  quote?: string;
  type: string;
  title?: string;
  host: string;
  publishedAt?: string;
};

/** A source as shown in reference lists and citation hover cards. */
export type SourceInfo = {
  url: string;
  type: string;
  host: string;
  title?: string;
  author?: string;
  publishedAt?: string;
  excerpt?: string;
};

export type LoreEvent = {
  id: string;
  company: string;
  date: string;
  kind: string;
  title: string;
  summary?: string;
  details?: Record<string, unknown>;
  confidence: "sourced" | "inferred";
  sources: SourceRef[];
};

export type Quote = {
  id: string;
  company: string;
  person: string;
  text: string;
  date?: string;
  url: string;
  link: string;
  context?: string;
};

export type Logo = {
  id: string;
  company: string;
  kind: string;
  variant?: "light" | "dark";
  date?: string;
  src: string;
  sourceUrl: string;
  description?: string;
};

/** What a company mark draws (the rest of a Logo is provenance): kept small for payloads that repeat it. */
export type Mark = Pick<Logo, "src" | "variant">;

export type FundingRound = {
  date: string;
  round: string;
  /** Normalised stage id: `details.stage` when the event states one, else derived from the round name. */
  stage?: string;
  /** Amount in the currency the source states, when it isn't USD (never converted). */
  amount?: number;
  /** ISO 4217 code of `amount`. */
  currency?: string;
  amountUsd?: number;
  valuationUsd?: number;
  leads: string[];
  investors: string[];
  /** Investor name → its /investors/<slug> (aliases resolved on the server). A name missing here
   *  links to slugifyName(name). */
  investorSlugs?: Record<string, string>;
  sources: SourceRef[];
};

export type PersonRef = { name: string; slug?: string; photo?: Photo };

export type CompanyStatus = "active" | "acquired" | "closed" | "public";

/** A company's latest round, with the free-text round name normalised to a stage. */
export type LastRound = { round: string; stage: string; date: string; amountUsd?: number };

export type CompanyInvestor = { slug: string; name: string; lead: boolean };

export type CompanySummary = {
  slug: string;
  name: string;
  summary?: string;
  /** The company has a written overview page (the rest only appear in stories so far). */
  hasOverview: boolean;
  events: number;
  quotes: number;
  /** Distinct YouTube and podcast URLs among its quotes and event sources. */
  videos: number;
  sources: number;
  founded?: string;
  founders: PersonRef[];
  /** Free-text HQ as recorded (profile city/country, or a founding event's details.hq). */
  hq?: string;
  city?: string;
  /** ISO 3166-1 alpha-2. */
  country?: string;
  categories: string[];
  status: CompanyStatus;
  /** True when the status is deduced from events rather than set on the company's profile. */
  statusDerived: boolean;
  website?: string;
  legalName?: string;
  tagline?: string;
  employees?: { count: number; asOf?: string; source?: string };
  stock?: string;
  acquiredBy?: string;
  /** Primary capital disclosed across rounds (secondaries and tender offers excluded). */
  raisedUsd: number;
  valuationUsd?: number;
  rounds: number;
  lastRound?: LastRound;
  investors: CompanyInvestor[];
  /** Event kinds present in its timeline. */
  kinds: string[];
  lastEvent?: string;
  logo?: Mark;
  icon?: Mark;
  /** White-on-dark counterparts of logo/icon, shown in the dark theme when at least as recent. */
  logoDark?: Mark;
  iconDark?: Mark;
};

export type Overview = {
  title: string;
  summary?: string;
  markdown: string;
  updatedAt: string;
  citations: number;
};

export type InvestorStake = { company: string; round: string; date: string; lead: boolean; stage?: string };

export type Investor = {
  slug: string;
  name: string;
  summary?: string;
  stakes: InvestorStake[];
  companies: string[];
  leads: number;
  /** Normalised stages of the rounds it joined (seed, series-a, …). */
  stages?: string[];
};

/** An investor as the /investors directory needs it: stakes without round names and dates. */
export type DirectoryInvestor = Pick<Investor, "slug" | "name" | "companies" | "leads" | "stages"> & {
  stakes: Pick<InvestorStake, "company" | "lead" | "stage">[];
};

export type Photo = { src: string; sourceUrl: string; origin?: string; licence?: string; author?: string };

export type PersonRole = "founder" | "investor" | "employee";

/** A dated position at a company, from the person entity's `roles` (each with the URL that states it). */
export type Position = { company: string; title: string; from?: string; to?: string; source?: string };

export type Person = {
  slug: string;
  /** Derived from founding events, funding rounds, quotes and the person's own `companies`. */
  roles?: PersonRole[];
  companies?: string[];
  name: string;
  photo?: Photo;
  aliases: string[];
  summary?: string;
  links: Record<string, string>;
  sources: string[];
  /** Every dated position, in the order recorded. */
  positions?: Position[];
};

/** A person as the /people directory needs it (no links, sources or positions; the photo's URL only). */
export type DirectoryPerson = Pick<Person, "slug" | "name" | "aliases" | "summary" | "roles" | "companies"> & { photo?: Pick<Photo, "src" | "sourceUrl"> };

export type SearchHit = {
  type: "company" | "person" | "investor" | "place" | "story" | "event" | "quote";
  title: string;
  subtitle?: string;
  href: string;
};

export type Place = {
  slug: string;
  name: string;
  city?: string;
  country?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  opened?: string;
  summary?: string;
  history?: string;
  links: Record<string, string>;
  companies: string[];
  events: string[];
  people: string[];
  photo?: Photo;
};

export type Story = { slug: string; title: string; summary?: string; markdown: string; companies: string[]; updatedAt: string };

/** Someone who built or shaped a company: founders first, then executives, hires and people linked to it. */
export type KeyPerson = PersonRef & {
  founder: boolean;
  /** Short role label ("Co-founder", "CEO (2024-)", "Joined Nov 2010"). */
  role?: string;
  /** One line of context: their summary, or the hire event's title. */
  blurb?: string;
  /** Timeline event the role comes from (anchor on the company page). */
  event?: string;
  /** Every recorded position at this company, dated, with sources. */
  positions?: Position[];
};

export type SimilarCompany = {
  slug: string;
  name: string;
  summary?: string;
  icon?: Mark;
  iconDark?: Mark;
  status: CompanyStatus;
  sharedCategories: string[];
  sharedInvestors: { slug: string; name: string }[];
};

export type Category = {
  /** URL slug. */
  slug: string;
  /** Value as stored on profiles (what /companies?category= filters on). */
  id: string;
  label: string;
  companies: CompanySummary[];
};

/** One funding round in the global feed (/rounds, /api/v1/rounds): the round plus its company. */
export type RoundRow = FundingRound & {
  /** The funding event's id (anchor on the company page). */
  id: string;
  company: string;
  companyName: string;
  title: string;
  stage: string;
  icon?: Mark;
  iconDark?: Mark;
  categories: string[];
  country?: string;
};
