import type { Metadata } from "next";
import { BUILD } from "@/lib/build";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AskLore } from "@/components/ask-lore";
import {
  Avatar,
  CompanyMark,
  CumulativeChart,
  FundingChart,
  FundingTable,
  LogoStrip,
  QuoteGrid,
  SourceCite,
  formatDate,
  formatUsd,
  logoTile,
  sourceInfo,
} from "@/components/lore";
import { SourceIcon } from "@/components/icons";
import { Prose, References, citationOrder, headings } from "@/components/prose";
import { Timeline } from "@/components/timeline";
import { TocRail, TocSheet, type TocItem } from "@/components/page-toc";
import { ArrowUpRight } from "lucide-react";
import { CompanyActions } from "@/components/company-actions";
import { Flag } from "@/components/flag";
import { RememberCompany } from "@/components/remember-company";
import { JsonLd } from "@/components/json-ld";
import {
  COMPANY_SITES,
  type CompanyLore,
  companyName,
  getCompany,
  getOverview,
  investorSlug,
  listCompanies,
  positionDates,
  primaryVideo,
} from "@/lib/lore";
import { categoryLabel, categorySlug, countryName, stageLabel, statusLabel } from "@/lib/directory";
import { SITE_URL } from "@/lib/og";
import { isLive } from "@/lib/store";
import type { KeyPerson, SimilarCompany } from "@/lib/types";
import { CompanySkeleton } from "@/components/skeletons";
import { isYC } from "@/lib/format";

// Every company is prerendered from the snapshot at build; others (added later) render on first visit.
export async function generateStaticParams() {
  return (await listCompanies()).map((c) => ({ company: c.slug }));
}

async function metaData(company: string) {
  const [overview, video] = await Promise.all([getOverview(company), primaryVideo({ company })]);
  return { overview, video };
}

async function cachedMetaData(company: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return metaData(company);
}

export async function generateMetadata({ params }: PageProps<"/[company]">): Promise<Metadata> {
  const { company } = await params;
  if (isLive()) await connection();
  const { overview, video } = await (isLive() ? metaData(company) : cachedMetaData(company, BUILD));
  const name = companyName(company);
  const description = overview?.summary ?? `The sourced history of ${name}: renames, logos, funding rounds, launches and quotes.`;
  return {
    title: `${name}: the lore`,
    description,
    alternates: { canonical: `/${company}` },
    openGraph: {
      title: `The lore of ${name}`,
      description,
      url: `/${company}`,
      type: "article",
      ...(overview && { modifiedTime: overview.updatedAt }),
      // The interview the page quotes most, playable inline where og:video is supported.
      ...(video && {
        videos: [{ url: `https://www.youtube.com/embed/${video.id}`, secureUrl: `https://www.youtube.com/embed/${video.id}`, type: "text/html", width: 1280, height: 720 }],
      }),
    },
    twitter: { card: "summary_large_image", title: `The lore of ${name}`, description },
  };
}

export default function CompanyPage({ params }: PageProps<"/[company]">) {
  return (
    <Suspense fallback={<CompanySkeleton />}>
      <Lore params={params} />
    </Suspense>
  );
}


function Section({ id, title, aside, first, children }: { id: string; title: string; aside?: ReactNode; first?: boolean; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-20 ${first ? "" : "border-t border-border pt-8"}`}>
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h2 id={`${id}-title`} className="text-xl font-semibold text-fg">
          {title}
        </h2>
        {aside && <span className="text-xs text-fg-subtle">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

const LINK = "text-link underline decoration-accent/45 underline-offset-2 hover:decoration-accent";

function Row({ label, cite, children }: { label: string; cite?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 py-2 text-sm">
      <dt className="text-fg-subtle">{label}</dt>
      <dd className="flex min-w-0 items-start justify-between gap-1 text-fg">
        <span className="min-w-0 break-words">{children}</span>
        {cite && <span className="-my-0.5 shrink-0">{cite}</span>}
      </dd>
    </div>
  );
}

// Entity link keys → label and source icon. `web`/`site` is the website row.
const SOCIALS: Record<string, [string, string]> = {
  yc: ["Y Combinator", "yc"],
  x: ["X", "tweet"],
  twitter: ["X", "tweet"],
  linkedin: ["LinkedIn", "linkedin"],
  github: ["GitHub", "github"],
  bluesky: ["Bluesky", "bluesky"],
  youtube: ["YouTube", "youtube"],
  hn: ["Hacker News", "hn"],
  wikipedia: ["Wikipedia", "wikipedia"],
  blog: ["Blog", "blog"],
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function Infobox({ lore }: { lore: CompanyLore }) {
  const fact = (field: string, label: string) => {
    const url = lore.facts[field];
    return url ? <SourceCite source={sourceInfo(url, lore.sources)} label={label} side="bottom" align="end" narrow /> : undefined;
  };
  const roundCite = (r: CompanyLore["funding"][number] | undefined, label: string) => {
    const s = r?.sources[0];
    return s ? <SourceCite source={sourceInfo(s.url, lore.sources, s)} quote={s.quote} label={label} side="bottom" align="end" narrow /> : undefined;
  };
  const leads = [...new Set(lore.funding.flatMap((r) => r.leads))];
  const last = lore.lastRound && lore.funding.findLast((r) => r.date === lore.lastRound!.date && r.round === lore.lastRound!.round);
  const valued = lore.funding.findLast((r) => r.valuationUsd);
  const socials = Object.entries(lore.links).filter(([k, url]) => !["web", "site", "website"].includes(k) && /^https?:\/\//.test(url));
  const slugFor = (name: string) => lore.funding.map((r) => r.investorSlugs?.[name]).find(Boolean);
  return (
    <div className="pad rounded-xl">
      {lore.logo && (
        <div
          className={`m-1.5 flex h-20 items-center justify-center rounded-lg p-4 ${logoTile(lore.logo, lore.logoDark)}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lore.logo.src} alt={`${lore.name} logo`} className={`max-h-12 max-w-full object-contain ${lore.logoDark ? "dark:hidden" : ""}`} />
          {lore.logoDark && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={lore.logoDark.src} alt={`${lore.name} logo`} className="hidden max-h-12 max-w-full object-contain dark:block" />
          )}
        </div>
      )}
      <dl className="divide-y divide-border px-4">
        {lore.tagline && lore.tagline !== lore.summary && (
          <Row label="Tagline" cite={fact("tagline", "tagline")}>
            <span className="text-fg-muted">“{lore.tagline}”</span>
          </Row>
        )}
        {lore.website && (
          <Row label="Website" cite={fact("website", "website")}>
            <a href={lore.website} target="_blank" rel="noreferrer" className={`inline-flex max-w-full items-center gap-1 ${LINK}`}>
              <span className="min-w-0 [overflow-wrap:anywhere]">{hostOf(lore.website)}</span>
              <ArrowUpRight aria-hidden="true" className="size-3 shrink-0 text-fg-subtle" />
            </a>
          </Row>
        )}
        {lore.legalName && (
          <Row label="Legal name" cite={fact("legal_name", "legal name")}>
            {lore.legalName}
          </Row>
        )}
        {lore.founded && (
          <Row label="Founded" cite={fact("founded", "founding date")}>
            {formatDate(lore.founded)}
          </Row>
        )}
        {lore.founders.length > 0 && (
          <Row label={lore.founders.length > 1 ? "Founders" : "Founder"}>
            <span className="flex flex-col gap-1.5">
              {lore.founders.map((f) => (
                <span key={f.name} className="flex items-center gap-2">
                  <Avatar photo={f.photo} name={f.name} size="xs" />
                  {f.slug ? (
                    <Link href={`/people/${f.slug}`} className={LINK}>
                      {f.name}
                    </Link>
                  ) : (
                    f.name
                  )}
                </span>
              ))}
            </span>
          </Row>
        )}
        {(lore.city || lore.hq) && (
          <Row label="Headquarters" cite={fact("hq", "headquarters")}>
            {lore.city && lore.country ? (
              <>
                <Flag code={lore.country} className="mr-1.5" />
                {lore.city},{" "}
                <Link href={`/companies?country=${lore.country}`} className={LINK}>
                  {countryName(lore.country)}
                </Link>
              </>
            ) : (
              lore.hq
            )}
          </Row>
        )}
        {lore.categories.length > 0 && (
          <Row label="Categories" cite={fact("categories", "categories")}>
            <span className="flex flex-wrap gap-1">
              {lore.categories.map((c) => (
                <Link
                  key={c}
                  href={`/categories/${categorySlug(c)}`}
                  className="max-w-full text-pretty rounded-md border border-border px-1.5 py-0.5 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  {categoryLabel(c)}
                </Link>
              ))}
            </span>
          </Row>
        )}
        <Row
          label="Status"
          cite={
            lore.status === "public"
              ? (fact("stock", "stock listing") ?? fact("status", "status"))
              : lore.status === "acquired"
                ? (fact("acquired_by", "acquisition") ?? fact("status", "status"))
                : fact("status", "status")
          }
        >
          {lore.status === "acquired" ? (
            <>
              Acquired
              {lore.acquiredBy && (
                <>
                  {" by "}
                  {lore.acquirerSlug ? (
                    <Link href={`/${lore.acquirerSlug}`} className={LINK}>
                      {companyName(lore.acquirerSlug)}
                    </Link>
                  ) : (
                    lore.acquiredBy
                  )}
                </>
              )}
              {lore.acquiredOn && <span className="text-fg-subtle"> · {formatDate(lore.acquiredOn)}</span>}
            </>
          ) : lore.status === "public" ? (
            <>
              Public
              {lore.stocks.length > 0 && <span className="font-mono text-xs text-fg-muted"> · {lore.stocks.join(", ")}</span>}
            </>
          ) : lore.status === "active" ? (
            "Active, private"
          ) : (
            statusLabel(lore.status)
          )}
          {lore.statusDerived && lore.status !== "active" && <span className="block text-xs text-fg-subtle">Deduced from the timeline</span>}
        </Row>
        {lore.parent && (
          <Row label="Parent" cite={fact("parent", "parent company")}>
            {lore.parentSlug ? (
              <Link href={`/${lore.parentSlug}`} className={LINK}>
                {lore.parent.charAt(0).toUpperCase() + lore.parent.slice(1)}
              </Link>
            ) : (
              lore.parent.charAt(0).toUpperCase() + lore.parent.slice(1)
            )}
          </Row>
        )}
        {lore.employees && (
          <Row label="Employees" cite={fact("employees", "employee count")}>
            <span className="tabular-nums">{lore.employees.count.toLocaleString("en")}</span>
            {lore.employees.asOf && <span className="text-fg-subtle"> · as of {formatDate(lore.employees.asOf)}</span>}
            {lore.employeesBasis && <span className="block text-xs text-fg-subtle">{lore.employeesBasis}</span>}
          </Row>
        )}
        {lore.places.length > 0 && (
          <Row label="Places">
            {lore.places.map((p, i) => (
              <span key={p.slug}>
                {i > 0 && ", "}
                <Link href={`/places/${p.slug}`} className={LINK}>
                  {p.name}
                </Link>
              </span>
            ))}
          </Row>
        )}
        {lore.formerNames.length > 0 && <Row label="Formerly">{lore.formerNames.join(", ")}</Row>}
        {lore.raisedUsd > 0 && (
          <Row label="Raised">
            <a href="#funding" className="font-medium tabular-nums hover:underline">
              {formatUsd(lore.raisedUsd)}
            </a>
            <span className="text-fg-subtle">
              {" "}
              · {lore.funding.length} {lore.funding.length === 1 ? "round" : "rounds"}
            </span>
          </Row>
        )}
        {lore.lastRound && (
          <Row label="Last round" cite={roundCite(last, "last round")}>
            {lore.lastRound.round}
            {lore.lastRound.amountUsd ? <span className="tabular-nums"> · {formatUsd(lore.lastRound.amountUsd)}</span> : null}
            <span className="block text-xs text-fg-subtle">
              {formatDate(lore.lastRound.date)}
              {stageLabel(lore.lastRound.stage).toLowerCase() !== lore.lastRound.round.toLowerCase() &&
                lore.lastRound.stage !== "other" &&
                ` · ${stageLabel(lore.lastRound.stage)}`}
            </span>
          </Row>
        )}
        {valued && (
          <Row label="Valuation" cite={roundCite(valued, "valuation")}>
            <span className="font-medium tabular-nums">{formatUsd(valued.valuationUsd)}</span>
            <span className="block text-xs text-fg-subtle">
              {valued.round} · {formatDate(valued.date)}
            </span>
          </Row>
        )}
        {lore.investors.length > 0 && (
          <Row label="Investors">
            <a href="#funding" className="tabular-nums hover:underline">
              {lore.investors.length} {lore.investors.length === 1 ? "investor" : "investors"}
            </a>
            {leads.length > 0 && (
              <span className="mt-1 block text-[13px] text-fg-muted">
                <span className="text-fg-subtle">Leads: </span>
                {leads.slice(0, 8).map((l, i) => (
                  <span key={l}>
                    {i > 0 && ", "}
                    <Link href={`/investors/${slugFor(l) ?? investorSlug(l)}`} className={LINK}>
                      {l}
                    </Link>
                  </span>
                ))}
                {leads.length > 8 && <span className="text-fg-subtle"> +{leads.length - 8}</span>}
              </span>
            )}
          </Row>
        )}
        {socials.length > 0 && (
          <Row label="Elsewhere">
            <span className="-ml-1 flex flex-wrap gap-0.5">
              {socials.map(([k, url]) => {
                const [label, icon] = isYC(url) ? SOCIALS.yc : (SOCIALS[k] ?? [k.charAt(0).toUpperCase() + k.slice(1), "website"]);
                return (
                  <a
                    key={k}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    title={`${label}: ${url.replace(/^https?:\/\/(www\.)?/, "")}`}
                    aria-label={`${lore.name} on ${label} (opens in a new tab)`}
                    className="inline-flex size-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <SourceIcon type={icon} className="size-3.5" />
                  </a>
                );
              })}
            </span>
          </Row>
        )}
        <Row label="Archive">
          <span className="tabular-nums">
            {lore.events.length} events · {Object.keys(lore.sources).length} sources
          </span>
        </Row>
      </dl>
    </div>
  );
}

function PeopleGrid({ people }: { people: KeyPerson[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((p) => {
        const name = p.slug ? (
          <Link href={`/people/${p.slug}`} className="font-medium text-fg after:absolute after:inset-0 after:rounded-lg hover:underline">
            {p.name}
          </Link>
        ) : p.event ? (
          <a href={`#${p.event}`} className="font-medium text-fg after:absolute after:inset-0 after:rounded-lg hover:underline">
            {p.name}
          </a>
        ) : (
          <span className="font-medium text-fg">{p.name}</span>
        );
        return (
          <li
            key={p.slug ?? p.name}
            className="relative flex gap-3 rounded-lg border border-border p-3 transition-colors has-[a:hover]:border-border-strong has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-accent"
          >
            <Avatar photo={p.photo} name={p.name} size="md" />
            <span className="min-w-0 text-sm">
              <span className="block truncate">{name}</span>
              {(p.positions?.length ?? 0) > 1 ? (
                <span className="block text-xs text-fg-muted">
                  {p.positions!.map((r) => (
                    <span key={`${r.title}${r.from}`} className="block">
                      {r.title}
                      {positionDates(r) && <span className="tabular-nums text-fg-subtle"> · {positionDates(r)}</span>}
                    </span>
                  ))}
                </span>
              ) : (
                p.role && <span className="block text-xs text-fg-muted">{p.role}</span>
              )}
              {p.blurb && (
                <span className="mt-1 line-clamp-2 text-xs leading-relaxed text-fg-subtle" title={p.blurb}>
                  {p.blurb}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SimilarGrid({ companies }: { companies: SimilarCompany[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {companies.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/${c.slug}`}
            className="flex h-full flex-col gap-2 rounded-lg border border-border p-3 transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-accent"
          >
            <span className="flex items-center gap-2.5">
              <CompanyMark logo={c.icon} dark={c.iconDark} name={c.name} size="sm" />
              <span className="truncate text-sm font-medium text-fg">{c.name}</span>
              {c.status !== "active" && (
                <span className="ml-auto shrink-0 rounded-full border border-border px-1.5 text-[11px] text-fg-subtle">{statusLabel(c.status)}</span>
              )}
            </span>
            {c.summary && <span className="line-clamp-2 text-xs leading-relaxed text-fg-muted">{c.summary}</span>}
            <span className="mt-auto space-y-0.5 text-[11px] text-fg-subtle">
              {c.sharedCategories.length > 0 && <span className="block truncate">{c.sharedCategories.map(categoryLabel).join(" · ")}</span>}
              {c.sharedInvestors.length > 0 && (
                <span className="block truncate">
                  {c.sharedInvestors.length === 1 ? "Shared investor: " : `${c.sharedInvestors.length} shared investors: `}
                  {c.sharedInvestors.map((i) => i.name).join(", ")}
                </span>
              )}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function fundingAside(lore: CompanyLore) {
  const sized = lore.funding.filter((r) => r.amountUsd).length;
  return `${lore.funding.length} ${lore.funding.length === 1 ? "round" : "rounds"}${sized < lore.funding.length ? `, ${sized} with a disclosed amount` : ""}`;
}

function spread<T>(items: T[], n: number) {
  if (items.length <= n) return items;
  return Array.from({ length: n }, (_, i) => items[Math.round((i * (items.length - 1)) / (n - 1))]);
}

async function Lore({ params }: { params: PageProps<"/[company]">["params"] }) {
  const { company } = await params;
  if (isLive()) {
    await connection();
    return (await LoreBody({ slug: company })) ?? notFound();
  }
  return (await CachedLore({ slug: company, build: BUILD })) ?? notFound();
}

/** The snapshot page, rendered once per deployment. Null for an unknown company (404 outside the cache). */
async function CachedLore({ slug }: { slug: string; build: string }) {
  "use cache";
  cacheLife("max");
  return LoreBody({ slug });
}

async function LoreBody({ slug }: { slug: string }) {
  const lore = await getCompany(slug);
  if (!lore) return null;

  const overviewRefs = lore.overview ? citationOrder(lore.overview.markdown) : [];
  // Same order as the article: funding first, then the overview, people, and the long timeline.
  const toc: TocItem[] = [
    ...(lore.funding.length ? [{ id: "funding", title: "Funding", count: lore.raisedUsd ? formatUsd(lore.raisedUsd) : String(lore.funding.length) }] : []),
    ...(lore.overview ? [{ id: "overview", title: "Overview" }, ...headings(lore.overview.markdown).map((h) => ({ ...h, sub: true }))] : []),
    ...(lore.keyPeople.length ? [{ id: "people", title: "People", count: String(lore.keyPeople.length) }] : []),
    { id: "timeline", title: "Timeline", count: String(lore.events.length) },
    ...(lore.logos.length || lore.identity.length ? [{ id: "identity", title: "Names & logos" }] : []),
    ...(lore.quotes.length ? [{ id: "quotes", title: "In their own words", count: String(lore.quotes.length) }] : []),
    ...(lore.similar.length ? [{ id: "similar", title: "Similar companies" }] : []),
    { id: "ask", title: "Ask" },
    ...(overviewRefs.length ? [{ id: "references", title: "References", count: String(overviewRefs.length) }] : []),
  ];

  const site = COMPANY_SITES[lore.slug];
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[12rem_minmax(0,1fr)] xl:grid-cols-[12rem_minmax(0,1fr)_17rem]">
      <JsonLd
        data={{
          "@type": "Organization",
          name: lore.name,
          url: `${SITE_URL}/${lore.slug}`,
          ...(lore.summary && { description: lore.summary }),
          ...(lore.legalName && { legalName: lore.legalName }),
          ...((lore.website || Object.keys(lore.links).length) && {
            sameAs: [...new Set([lore.website, ...Object.values(lore.links)].filter((u): u is string => !!u && /^https?:/.test(u)))],
          }),
          ...(lore.city && { address: { "@type": "PostalAddress", addressLocality: lore.city, ...(lore.country && { addressCountry: lore.country }) } }),
          ...(lore.employees && { numberOfEmployees: { "@type": "QuantitativeValue", value: lore.employees.count } }),
          ...(lore.logo && { logo: `${SITE_URL}${lore.logo.src}` }),
          ...(lore.founded && { foundingDate: lore.founded }),
          ...(lore.formerNames.length && { alternateName: lore.formerNames }),
          ...(lore.founders.length && {
            founder: lore.founders.map((f) => ({ "@type": "Person", name: f.name, ...(f.slug && { url: `${SITE_URL}/people/${f.slug}` }) })),
          }),
        }}
      />
      <JsonLd
        data={{
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Companies", item: `${SITE_URL}/companies` },
            { "@type": "ListItem", position: 2, name: lore.name, item: `${SITE_URL}/${lore.slug}` },
          ],
        }}
      />
      {/* Placed on the grid explicitly so the facts render once: between the header and the article on
          narrow screens, in the sticky right column on wide ones. */}
      <aside aria-label="Contents" className="hidden lg:col-start-1 lg:row-span-3 lg:row-start-1 lg:block xl:row-span-2">
        <div className="sticky top-(--sticky-top) -ml-3 max-h-[calc(100dvh-6rem)] overflow-y-auto pb-6">
          <TocRail items={toc} />
        </div>
      </aside>
      <TocSheet items={toc} />

      <header className="pad relative min-w-0 overflow-hidden rounded-2xl p-6 sm:p-8 lg:col-start-2 lg:row-start-1">
        <RememberCompany slug={lore.slug} name={lore.name} icon={lore.icon?.src} />
        {/* The logo as a light source behind the header. */}
        {lore.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={(lore.iconDark ?? lore.icon).src} alt="" aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 size-96 opacity-30 blur-3xl saturate-200" />
        )}
        <div className="relative">
          <CompanyMark logo={lore.icon} dark={lore.iconDark} name={lore.name} size="lg" />
          <h1 className="display mt-4 text-balance text-4xl leading-none sm:text-6xl">{lore.name}</h1>
          {lore.summary && <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-fg-muted sm:text-lg">{lore.summary}</p>}
          <dl className="mt-5 flex flex-wrap gap-2">
            {[
              lore.founded && { label: "Founded", value: lore.founded.slice(0, 4) },
              lore.city && { label: "Based in", value: lore.city, flag: lore.country },
              lore.raisedUsd > 0 && { label: "Raised", value: formatUsd(lore.raisedUsd) },
            ]
              .filter((t) => !!t)
              .map((t) => (
                <div key={t.label} className="rounded-lg bg-black/25 px-3 py-1.5 ring-1 ring-inset ring-white/10 [:root[data-theme=light]_&]:bg-white/60 [:root[data-theme=light]_&]:ring-black/10">
                  <dt className="font-mono text-[10px] uppercase tracking-wide text-fg-subtle">{t.label}</dt>
                  <dd className="text-sm font-semibold tabular-nums text-fg">
                    {"flag" in t && <Flag code={t.flag} className="mr-1.5" />}
                    {t.value}
                  </dd>
                </div>
              ))}
          </dl>
          <div className="mt-5">
            <CompanyActions slug={lore.slug} name={lore.name} site={site} pageUrl={`${SITE_URL}/${lore.slug}`} compareWith={lore.similar[0]?.slug} />
          </div>
          <p className="mt-4 text-xs tabular-nums text-fg-subtle">
            {lore.overview ? `Overview updated ${formatDate(lore.overview.updatedAt.slice(0, 10))} · ${lore.overview.citations} citations · ` : ""}
            {lore.events.length} {lore.events.length === 1 ? "event" : "events"}
            {lore.quotes.length > 0 && ` · ${lore.quotes.length} ${lore.quotes.length === 1 ? "quote" : "quotes"}`}
          </p>
        </div>
      </header>

      <aside aria-label="Company facts" className="min-w-0 lg:col-start-2 lg:row-start-2 xl:col-start-3 xl:row-span-2 xl:row-start-1">
        <div className="space-y-6 xl:sticky xl:top-(--sticky-top) xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto xl:overflow-x-hidden xl:pb-6">
          <Infobox lore={lore} />
        </div>
      </aside>

      <article className="min-w-0 space-y-10 lg:col-start-2 lg:row-start-3 xl:row-start-2">
        {/* Funding comes before the long overview: the rounds are what most visitors look for first. */}
        {lore.funding.length > 0 && (
          <Section id="funding" title="Funding" aside={fundingAside(lore)} first>
            <div className="space-y-4">
              <FundingTable rounds={lore.funding} sources={lore.sources} />
              <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                <CumulativeChart rounds={lore.funding} />
                <FundingChart rounds={lore.funding} />
              </div>
            </div>
          </Section>
        )}

        {lore.overview ? (
          <section
            id="overview"
            aria-label="Overview"
            className={`max-w-3xl scroll-mt-20 ${lore.funding.length ? "border-t border-border pt-8" : ""}`}
          >
            <Prose markdown={lore.overview.markdown} sources={lore.sources} />
          </section>
        ) : (
          <p className="text-sm text-fg-subtle">No overview has been written yet. The timeline below is the full sourced record.</p>
        )}

        {lore.keyPeople.length > 0 && (
          <Section id="people" title="People" aside="Founders, executives and key hires">
            <PeopleGrid people={lore.keyPeople} />
          </Section>
        )}

        <Section id="timeline" title="Timeline" aside={`${lore.events.length} sourced events`}>
          {/* The client filters need each event's fields and sources, not its free-form details. */}
          <Timeline events={lore.events.map(({ details: _, ...e }) => ({ ...e, sources: e.sources.map(({ publishedAt: __, ...s }) => s) }))} />
        </Section>

        {(lore.logos.length > 0 || lore.identity.length > 0) && (
          <Section id="identity" title="Names & logos">
            <div className="space-y-6">
              {lore.logos.length > 0 && <LogoStrip logos={lore.logos} />}
              {lore.identity.length > 0 && (
                <ol className="divide-y divide-border rounded-lg border border-border">
                  {lore.identity.map((e) => (
                    <li key={e.id} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[8rem_1fr]">
                      <a href={`#${e.id}`} className="font-mono text-xs tabular-nums text-fg-subtle hover:text-fg">
                        {formatDate(e.date)}
                      </a>
                      <span className="text-fg">{e.title}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </Section>
        )}

        {lore.quotes.length > 0 && (
          <Section id="quotes" title="In their own words" aside={`${lore.quotes.length} verbatim quotes`}>
            <QuoteGrid quotes={spread(lore.quotes, 8)} photos={lore.photos} />
          </Section>
        )}

        {lore.similar.length > 0 && (
          <Section id="similar" title="Similar companies" aside="Shared categories and investors">
            <SimilarGrid companies={lore.similar} />
          </Section>
        )}

        <Section id="ask" title={`Ask about ${lore.name}`} aside="Answers only from this archive">
          <AskLore
            company={lore.slug}
            suggestions={[`How did ${lore.name} start?`, "Every name and logo change", "Who led each round?", "The hardest moments"]}
          />
        </Section>

        {overviewRefs.length > 0 && (
          <Section id="references" title="References" aside={`${overviewRefs.length} sources cited in the overview`}>
            <References urls={overviewRefs} sources={lore.sources} />
          </Section>
        )}
      </article>
    </div>
  );
}
