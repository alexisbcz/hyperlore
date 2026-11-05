import type { Metadata } from "next";
import { BUILD } from "@/lib/build";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { Avatar, EventList, QuoteGrid, SourceCite, formatDate, sourceInfo } from "@/components/lore";
import { JsonLd } from "@/components/json-ld";
import { SourceIcon } from "@/components/icons";
import { COMPANY_NAMES, companyName, getPerson, listPeople, positionDates, primaryVideo } from "@/lib/lore";
import { SITE_URL } from "@/lib/og";
import { isLive } from "@/lib/store";
import { EntitySkeleton } from "@/components/skeletons";
import { isYC } from "@/lib/format";

// Everyone is prerendered from the snapshot at build; people added later render on first visit.
export async function generateStaticParams() {
  return (await listPeople()).map((p) => ({ slug: p.slug }));
}

async function metaData(slug: string) {
  const person = (await listPeople()).find((p) => p.slug === slug);
  if (!person) return null;
  return { name: person.name, summary: person.summary, video: await primaryVideo({ person: person.name }) };
}

async function cachedMetaData(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return metaData(slug);
}

export async function generateMetadata({ params }: PageProps<"/people/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (isLive()) await connection();
  const person = await (isLive() ? metaData(slug) : cachedMetaData(slug, BUILD));
  if (!person) return { title: "Person not found" };
  const description = person.summary ?? `${person.name} in the Hyperlore archive.`;
  const { video } = person;
  return {
    title: person.name,
    description,
    alternates: { canonical: `/people/${slug}` },
    openGraph: {
      title: person.name,
      description,
      url: `/people/${slug}`,
      type: "profile",
      ...(video && {
        videos: [{ url: `https://www.youtube.com/embed/${video.id}`, secureUrl: `https://www.youtube.com/embed/${video.id}`, type: "text/html", width: 1280, height: 720 }],
      }),
    },
    twitter: { card: "summary_large_image", title: person.name, description },
  };
}

export default function PersonPage({ params }: PageProps<"/people/[slug]">) {
  return (
    <Page width="text">
      <Suspense fallback={<EntitySkeleton label="Loading person" avatar />}>
        <Person params={params} />
      </Suspense>
    </Page>
  );
}

// Link key → label and source icon.
const LINKS: Record<string, [string, string]> = {
  yc: ["Y Combinator", "yc"],
  x: ["X", "tweet"],
  twitter: ["X", "tweet"],
  web: ["Website", "website"],
  website: ["Website", "website"],
  github: ["GitHub", "github"],
  bluesky: ["Bluesky", "bluesky"],
  linkedin: ["LinkedIn", "linkedin"],
  hn: ["Hacker News", "hn"],
  wikipedia: ["Wikipedia", "wikipedia"],
  youtube: ["YouTube", "youtube"],
};

async function Person({ params }: { params: PageProps<"/people/[slug]">["params"] }) {
  const { slug } = await params;
  if (!isLive()) return (await CachedPerson({ slug, build: BUILD })) ?? notFound();
  await connection();
  return (await PersonBody({ slug })) ?? notFound();
}

/** The snapshot page, rendered once per deployment. Null for an unknown person (404 outside the cache). */
async function CachedPerson({ slug }: { slug: string; build: string }) {
  "use cache";
  cacheLife("max");
  return PersonBody({ slug });
}

async function PersonBody({ slug }: { slug: string }) {
  const person = await getPerson(slug);
  if (!person) return null;
  return (
    <div className="space-y-12">
      <JsonLd
        data={{
          "@type": "Person",
          name: person.name,
          url: `${SITE_URL}/people/${person.slug}`,
          ...(person.summary && { description: person.summary }),
          ...(person.photo && { image: `${SITE_URL}${person.photo.src}` }),
          ...(Object.keys(person.links).length && { sameAs: Object.values(person.links) }),
        }}
      />
      <header>
        <Link href="/people" className="text-sm text-fg-subtle hover:text-fg">
          ← People
        </Link>
        <div className="mt-4 flex items-center gap-5">
          <Avatar photo={person.photo} name={person.name} size="lg" />
          <div className="min-w-0">
            <h1 className="text-balance text-3xl font-semibold text-fg">{person.name}</h1>
            {person.photo && (
              <p className="mt-1 text-xs text-fg-subtle">
                Photo:{" "}
                <a href={person.photo.sourceUrl} target="_blank" rel="noreferrer" className="text-link underline decoration-accent/45 underline-offset-2 hover:text-fg">
                  {person.photo.origin?.replace(/-/g, " ") ?? "source"}
                </a>
              </p>
            )}
          </div>
        </div>
        {person.summary && <p className="mt-5 text-pretty leading-relaxed text-fg-muted">{person.summary}</p>}
        {Object.keys(person.links).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(person.links).map(([k, url]) => {
              const [label, icon] = isYC(url) ? LINKS.yc : (LINKS[k] ?? [k.charAt(0).toUpperCase() + k.slice(1), "website"]);
              return (
                <a
                  key={k}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                >
                  <SourceIcon type={icon} className="size-3.5" />
                  {label}
                </a>
              );
            })}
          </div>
        )}
      </header>

      {(person.positions?.length ?? 0) > 0 && (
        <section aria-labelledby="positions-title">
          <h2 id="positions-title" className="mb-4 text-lg font-semibold text-fg">
            Positions
          </h2>
          <ol className="divide-y divide-border rounded-lg border border-border">
            {person.positions!.map((r) => (
              <li key={`${r.company}${r.title}${r.from}`} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="font-medium text-fg">{r.title}</span>
                  <span className="text-fg-subtle"> at </span>
                  <Link href={`/${r.company}#people`} className="text-fg text-link underline decoration-accent/45 underline-offset-2 hover:decoration-accent">
                    {companyName(r.company)}
                  </Link>
                </span>
                <span className="flex items-center gap-1 text-fg-subtle">
                  {positionDates(r) && <span className="tabular-nums">{positionDates(r)}</span>}
                  {r.source && <SourceCite source={sourceInfo(r.source, person.sources)} label={`${r.title} at ${companyName(r.company)}`} />}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {person.backed && (
        <section aria-labelledby="backed-title">
          <h2 id="backed-title" className="mb-4 text-lg font-semibold text-fg">
            Invested in
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {person.backed.stakes.map((s) => (
              <li key={s.company + s.round} className="flex justify-between gap-4 px-4 py-3 text-sm">
                <Link href={`/${s.company}#funding`} className="font-medium text-fg hover:underline">
                  {COMPANY_NAMES[s.company] ?? s.company}
                </Link>
                <span className="text-fg-subtle">
                  {s.round} · <span className="tabular-nums">{formatDate(s.date)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="events-title">
        <h2 id="events-title" className="mb-6 text-lg font-semibold text-fg">
          In the record <span className="text-sm font-normal tabular-nums text-fg-subtle">{person.events.length}</span>
        </h2>
        <EventList events={person.events} companyNames={COMPANY_NAMES} />
      </section>

      {person.quotes.length > 0 && (
        <section aria-labelledby="quotes-title">
          <h2 id="quotes-title" className="mb-4 text-lg font-semibold text-fg">
            In their own words
          </h2>
          <QuoteGrid quotes={person.quotes} companyNames={COMPANY_NAMES} photos={person.photo ? { [person.name.toLowerCase()]: person.photo } : {}} />
        </section>
      )}
    </div>
  );
}
