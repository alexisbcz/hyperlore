import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { AskLore } from "@/components/ask-lore";
import { HeroReel, type ReelItem } from "@/components/hero-reel";
import { Flag } from "@/components/flag";
import { Gloss } from "@/components/gloss";
import { CompanyMark, EventList, formatUsd } from "@/components/lore";
import { ArrowRight, BookOpen, Building2, CircleDollarSign, Link2, MapPin, Wallet } from "lucide-react";
import { COMPANY_NAMES, archiveStats, latestEvents, listCompanies, listInvestors, listPlaces, listRounds, listStories } from "@/lib/lore";
import { countryName } from "@/lib/directory";
import { isLive } from "@/lib/store";
import { CardGridSkeleton } from "@/components/skeletons";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { SITE_URL } from "@/lib/og";

const DESCRIPTION =
  "DeepWiki for startups. Renames, logos, funding rounds, launches and quotes, rebuilt by agents from primary sources. Every claim links to where it was said.";

export const metadata: Metadata = {
  title: { absolute: "Hyperlore: the sourced history of startups" },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: "Hyperlore: the sourced history of startups", description: DESCRIPTION, url: "/", siteName: "Hyperlore", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image", title: "Hyperlore: the sourced history of startups", description: DESCRIPTION },
};

/** The site itself, its publisher and the search box (sitelinks search). */
function SiteJsonLd() {
  return (
    <JsonLd
      data={{
        "@type": "WebSite",
        name: "Hyperlore",
        url: SITE_URL,
        description: DESCRIPTION,
        inLanguage: "en",
        publisher: { "@type": "Organization", name: "Hyperlore", url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
        potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/companies?q={search_term_string}`, "query-input": "required name=search_term_string" },
      }}
    />
  );
}

const SUGGESTIONS = ["Who raised the most, and from whom?", "Which companies changed their name?", "What did founders say about their first customers?"];

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <SiteJsonLd />
      <section className="@container pb-14 pt-6 sm:pt-10">
        <Suspense fallback={<div className="reel" />}>
          <Reel />
        </Suspense>
        <h1 className="display mx-auto mt-8 max-w-4xl text-balance text-center text-4xl uppercase leading-[1.02] sm:text-6xl">The sourced history of startups</h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-center leading-relaxed text-fg-muted">
          Renames, logos, funding rounds, launches and pivots, rebuilt by agents from founders&apos; tweets, interviews, Hacker News threads and archived
          websites. Every claim links to where it was said.
        </p>
        <div className="mx-auto mt-8 max-w-4xl space-y-2">
          <Suspense fallback={<div className="h-[4.5rem]" />}>
            <Stats />
          </Suspense>
          <AskLore suggestions={SUGGESTIONS} hero />
        </div>
      </section>
      <Suspense fallback={<CardGridSkeleton label="Opening the archive" cards={9} className="pb-24" />}>
        <Archive />
      </Suspense>
    </div>
  );
}

// Live data renders per request; the snapshot once per deployment (prerendered at build).
async function Stats() {
  if (!isLive()) return CachedStats();
  await connection();
  return StatsBody();
}

async function CachedStats() {
  "use cache";
  cacheLife("max");
  return StatsBody();
}

async function StatsBody() {
  const s = await archiveStats();
  const tiles = [
    { label: "Companies", value: s.companies.toLocaleString("en"), href: "/companies", item: { icon: Building2, hue: 215 } },
    { label: "Funding rounds", value: s.rounds.toLocaleString("en"), href: "/rounds", item: { icon: CircleDollarSign, hue: 145 } },
    { label: "Tracked in USD", value: formatUsd(s.totalUsd), href: "/rounds", item: { icon: Wallet, hue: 38 } },
    { label: "Sources", value: s.sources.toLocaleString("en"), href: "/stats", item: { icon: Link2, hue: 262 } },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {tiles.map((t) => (
        <li key={t.label}>
          <Link href={t.href} className="pad flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:border-border-strong">
            <Gloss item={t.item} large />
            <span className="min-w-0">
              <span className="block truncate font-mono text-[11px] text-fg-subtle">{t.label}</span>
              <span className="block truncate text-sm font-semibold tabular-nums text-fg">{t.value}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

async function Reel() {
  if (!isLive()) return CachedReel();
  await connection();
  return ReelBody();
}

async function CachedReel() {
  "use cache";
  cacheLife("max");
  return ReelBody();
}

// Stories and cities in turn: the cities bring the photographs, the stories the logos.
async function ReelBody() {
  const [all, stories, places] = await Promise.all([listCompanies(), listStories(), listPlaces()]);
  const marks = (slugs: string[]) =>
    slugs.flatMap((slug) => {
      const c = all.find((x) => x.slug === slug);
      return c?.icon ? [{ name: c.name, logo: c.icon, dark: c.iconDark }] : [];
    });
  const storyCards: ReelItem[] = stories.slice(0, 4).map((s) => ({ href: `/stories/${s.slug}`, eyebrow: "Story", title: s.title, marks: marks(s.companies) }));
  const placeCards: ReelItem[] = places
    .filter((p) => p.photo)
    .slice(0, 4)
    .map((p) => ({
      href: `/places/${p.slug}`,
      eyebrow: `Place · ${p.companies.length} ${p.companies.length === 1 ? "company" : "companies"}`,
      title: p.name,
      image: p.photo!.src,
      marks: [],
    }));
  const items = placeCards.flatMap((p, i) => (storyCards[i] ? [p, storyCards[i]] : [p]));
  return <HeroReel items={items} />;
}

async function Archive() {
  if (!isLive()) return CachedArchive();
  await connection();
  return ArchiveBody();
}

async function CachedArchive() {
  "use cache";
  cacheLife("max");
  return ArchiveBody();
}

// The home page is a sampler: the directory is one click away.
const HOME_CARDS = 12;

async function ArchiveBody() {
  const [all, latest, investors, stories, places, rounds] = await Promise.all([
    listCompanies(),
    latestEvents(8),
    listInvestors(),
    listStories(),
    listPlaces(),
    listRounds(),
  ]);
  const tape = rounds.filter((r) => r.amountUsd).slice(0, 16);
  const countries = Object.entries(Object.groupBy(all.filter((c) => c.country), (c) => c.country!))
    .map(([code, list]) => ({ code, count: list!.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
  const pictured = places.filter((p) => p.photo).slice(0, 4);
  // A company gets a card once it has a written overview; the rest only appear in stories so far.
  const companies = all.filter((c) => c.summary);
  const mentioned = all.filter((c) => !c.summary);
  const cells = Math.min(companies.length, HOME_CARDS) + 1;
  const fill = ["", "sm:col-span-2", ""][cells % 2] + " " + ["lg:col-span-1", "lg:col-span-3", "lg:col-span-2"][cells % 3];
  const multi = investors.filter((i) => i.companies.length > 1).slice(0, 8);

  return (
    <div className="space-y-20 pb-24">
      {tape.length > 0 && (
        <section aria-label="Latest funding rounds" className="tape">
          {/* Doubled so the loop is seamless; the copy is hidden from assistive tech. */}
          {[false, true].map((copy) => (
            <ul key={String(copy)} aria-hidden={copy || undefined} className="tape-run">
              {tape.map((r) => (
                <li key={r.id}>
                  <Link href={`/${r.company}#${r.id}`} tabIndex={copy ? -1 : undefined} className="flex items-center gap-2 whitespace-nowrap text-sm text-fg-muted transition-colors hover:text-fg">
                    <CompanyMark logo={r.icon} dark={r.iconDark} name={r.companyName} size="sm" />
                    <span className="font-medium text-fg">{r.companyName}</span>
                    <span className="font-mono text-xs tabular-nums text-accent">{formatUsd(r.amountUsd)}</span>
                    <span className="text-xs text-fg-subtle">{r.round}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
        </section>
      )}

      <section aria-labelledby="companies-title">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 id="companies-title" className="text-xl font-semibold text-fg">
            Companies
          </h2>
          <Link href="/companies" className="text-sm text-fg-muted hover:text-fg">
            Browse and filter all {all.length} →
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.slice(0, HOME_CARDS).map((c) => (
            <li key={c.slug}>
              <Link href={`/${c.slug}`} className="pad flex h-full flex-col rounded-xl p-5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-border-strong">
                <span className="flex items-center gap-3">
                  <CompanyMark logo={c.icon} dark={c.iconDark} name={c.name} />
                  <span className="text-base font-semibold text-fg">{c.name}</span>
                </span>
                <span className="mt-3 line-clamp-2 text-pretty text-sm leading-relaxed text-fg-muted">
                  {c.summary ?? "Sourced timeline, funding and quotes."}
                </span>
                <span className="mt-auto flex gap-4 pt-5 text-xs tabular-nums text-fg-subtle">
                  <span>Founded {c.founded?.slice(0, 4)}</span>
                  {c.raisedUsd > 0 && <span>Raised {formatUsd(c.raisedUsd)}</span>}
                  <span>
                    {c.events} {c.events === 1 ? "event" : "events"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          <li className={fill}>
            <Link href="/request" className="group flex h-full items-center justify-between gap-4 rounded-xl border border-dashed border-border-strong p-5 transition-colors hover:border-accent">
              <span>
                <span className="block text-base font-semibold text-fg">Request a company</span>
                <span className="mt-1 block text-pretty text-sm leading-relaxed text-fg-muted">Agents research the most-requested startups next.</span>
              </span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        </ul>
        {companies.length > HOME_CARDS && (
          <Link
            href="/companies"
            className="mt-3 flex h-11 items-center justify-center gap-1 rounded-lg border border-border text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg sm:hidden"
          >
            See all {all.length} companies
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        )}
        {mentioned.length > 0 && (
          <p className="mt-4 text-pretty text-sm text-fg-subtle">
            Also in the archive:{" "}
            {mentioned.map((c, i) => (
              <span key={c.slug}>
                {i > 0 && ", "}
                <Link href={`/${c.slug}`} className="text-fg-muted text-link underline decoration-accent/45 underline-offset-2 hover:text-fg hover:decoration-fg">
                  {c.name}
                </Link>
              </span>
            ))}
          </p>
        )}
      </section>

      <section aria-labelledby="countries-title">
        <h2 id="countries-title" className="mb-4 text-xl font-semibold text-fg">
          Around the world
        </h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {countries.map((c) => (
            <li key={c.code}>
              <Link href={`/companies?country=${c.code}`} className="pad flex items-center gap-3 rounded-xl p-3 transition-colors hover:border-border-strong">
                <Flag code={c.code} className="flag-lg" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-fg">{countryName(c.code)}</span>
                  <span className="block text-xs tabular-nums text-fg-subtle">{c.count}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {(stories.length > 0 || pictured.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {stories.length > 0 && (
          <div className="flex flex-col gap-4">
          {stories.slice(0, 2).map((s) => (
            <Link
              key={s.slug}
              href={`/stories/${s.slug}`}
              className="pad group flex flex-1 flex-col rounded-xl p-5 transition-colors hover:border-border-strong"
            >
              <span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                  <BookOpen aria-hidden="true" className="size-3.5" />
                  Story
                </span>
                <span className="mt-2 block text-balance text-lg font-semibold text-fg">{s.title}</span>
                {s.summary && <span className="mt-1.5 line-clamp-2 block text-pretty text-sm leading-relaxed text-fg-muted">{s.summary}</span>}
              </span>
              <span className="mt-3 flex flex-wrap gap-1.5">
                {s.companies.map((slug) => {
                  const c = all.find((x) => x.slug === slug);
                  return c ? (
                    <span key={slug} title={c.name}>
                      <CompanyMark logo={c.icon} dark={c.iconDark} name={c.name} size="sm" />
                    </span>
                  ) : null;
                })}
              </span>
              <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm text-fg">
                Read the story
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
          </div>
          )}
          {pictured.length > 0 && (
            <section aria-labelledby="places-title" className="pad rounded-xl p-6">
              <div className="mb-4 flex items-baseline justify-between">
                <h2 id="places-title" className="inline-flex items-center gap-1.5 text-xs font-medium text-accent">
                  <MapPin aria-hidden="true" className="size-3.5" />
                  Places
                </h2>
                <Link href="/places" className="text-sm text-fg-muted hover:text-fg">
                  All {places.length} →
                </Link>
              </div>
              <ul className="grid grid-cols-2 gap-3">
                {pictured.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/places/${p.slug}`} className="group block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.photo!.src} alt="" className="aspect-[16/10] w-full rounded-lg border border-border object-cover" />
                      <span className="mt-1.5 block truncate text-sm font-medium text-fg group-hover:underline">{p.name}</span>
                      <span className="block truncate text-xs text-fg-subtle">{p.city}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-labelledby="latest-title" className="[&_.ev-summary]:line-clamp-3">
          <h2 id="latest-title" className="mb-6 text-xl font-semibold text-fg">
            Latest in the lore
          </h2>
          <EventList events={latest} companyNames={COMPANY_NAMES} headingLevel={3} />
        </section>

        <section aria-labelledby="investors-title">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 id="investors-title" className="text-xl font-semibold text-fg">
              Connected investors
            </h2>
            <Link href="/investors" className="text-sm text-fg-muted hover:text-fg">
              All →
            </Link>
          </div>
          <p className="mb-4 text-sm text-fg-subtle">Backers who appear in more than one company&apos;s rounds.</p>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {multi.map((i) => (
              <li key={i.slug}>
                <Link href={`/investors/${i.slug}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-subtle">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">{i.name}</span>
                    <span className="block truncate text-xs text-fg-subtle">{i.companies.map((c) => COMPANY_NAMES[c] ?? c).join(", ")}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-fg-subtle">{i.companies.length}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
