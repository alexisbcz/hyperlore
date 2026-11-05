import { Flag } from "@/components/flag";
import { BUILD } from "@/lib/build";
import { countryCode } from "@/lib/directory";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { Page } from "@/components/page";
import { Avatar, CompanyMark, EventList, formatDate } from "@/components/lore";
import { Prose, References, citationOrder } from "@/components/prose";
import { JsonLd } from "@/components/json-ld";
import { COMPANY_NAMES, getPlace, listCompanies, listPlaces } from "@/lib/lore";
import { SITE_URL } from "@/lib/og";
import { isLive } from "@/lib/store";
import { EntitySkeleton } from "@/components/skeletons";

// Every place is prerendered from the snapshot at build; places added later render on first visit.
export async function generateStaticParams() {
  return (await listPlaces()).map((p) => ({ slug: p.slug }));
}

async function metaData(slug: string) {
  const place = (await listPlaces()).find((p) => p.slug === slug);
  return place ? { name: place.name, summary: place.summary } : null;
}

async function cachedMetaData(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return metaData(slug);
}

export async function generateMetadata({ params }: PageProps<"/places/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (isLive()) await connection();
  const place = await (isLive() ? metaData(slug) : cachedMetaData(slug, BUILD));
  if (!place) return { title: "Place not found" };
  return {
    title: place.name,
    description: place.summary,
    alternates: { canonical: `/places/${slug}` },
    openGraph: { title: place.name, description: place.summary, url: `/places/${slug}`, type: "website" },
    twitter: { card: "summary_large_image", title: place.name, description: place.summary },
  };
}

export default function PlacePage({ params }: PageProps<"/places/[slug]">) {
  return (
    <Page width="text">
      <Suspense fallback={<EntitySkeleton label="Loading place" />}>
        <Place params={params} />
      </Suspense>
    </Page>
  );
}

async function Place({ params }: { params: PageProps<"/places/[slug]">["params"] }) {
  const { slug } = await params;
  if (!isLive()) return (await CachedPlace({ slug, build: BUILD })) ?? notFound();
  await connection();
  return (await PlaceBody({ slug })) ?? notFound();
}

/** The snapshot page, rendered once per deployment. Null for an unknown place (404 outside the cache). */
async function CachedPlace({ slug }: { slug: string; build: string }) {
  "use cache";
  cacheLife("max");
  return PlaceBody({ slug });
}

async function PlaceBody({ slug }: { slug: string }) {
  const [place, companies] = await Promise.all([getPlace(slug), listCompanies()]);
  const marks = new Map(companies.map((c) => [c.slug, c]));
  if (!place) return null;
  const refs = place.history ? citationOrder(place.history) : [];
  const map = place.coordinates
    ? `https://www.openstreetmap.org/?mlat=${place.coordinates.lat}&mlon=${place.coordinates.lng}#map=17/${place.coordinates.lat}/${place.coordinates.lng}`
    : undefined;
  return (
    <div className="space-y-10">
      <JsonLd
        data={{
          "@type": "Place",
          name: place.name,
          url: `${SITE_URL}/places/${place.slug}`,
          ...(place.summary && { description: place.summary }),
          ...(place.address && { address: place.address }),
          ...(place.coordinates && { geo: { "@type": "GeoCoordinates", latitude: place.coordinates.lat, longitude: place.coordinates.lng } }),
          ...(place.photo && { image: `${SITE_URL}${place.photo.src}` }),
        }}
      />
      <header>
        <Link href="/places" className="text-sm text-fg-subtle hover:text-fg">
          ← Places
        </Link>
        <h1 className="mt-4 text-balance text-3xl font-semibold text-fg">{place.name}</h1>
        <p className="mt-1 text-sm text-fg-subtle">
          <Flag code={countryCode(place.country)} className="mr-1.5" />
          {[place.address ?? place.city, place.address ? undefined : place.country].filter(Boolean).join(", ")}
          {place.opened && <span className="tabular-nums"> · opened {formatDate(place.opened)}</span>}
          {map && (
            <>
              {" · "}
              <a href={map} target="_blank" rel="noreferrer" className="hover:text-fg">
                Map ↗
              </a>
            </>
          )}
        </p>
        {place.summary && <p className="mt-4 text-pretty text-lg leading-relaxed text-fg-muted">{place.summary}</p>}
      </header>

      {place.photo && (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={place.photo.src} alt={place.name} className="w-full rounded-xl border border-border object-cover" />
          <figcaption className="mt-2 text-xs text-fg-subtle">
            {place.photo.author && `${place.photo.author} · `}
            {place.photo.licence && `${place.photo.licence} · `}
            <a href={place.photo.sourceUrl} target="_blank" rel="noreferrer" className="hover:text-fg">
              Source ↗
            </a>
          </figcaption>
        </figure>
      )}

      {place.history && <Prose markdown={place.history} sources={place.sources} />}

      {place.companies.length > 0 && (
        <section aria-labelledby="companies-title">
          <h2 id="companies-title" className="mb-3 text-lg font-semibold text-fg">
            Companies
          </h2>
          <ul className="flex flex-wrap gap-2">
            {place.companies.map((c) => (
              <li key={c}>
                <Link
                  href={`/${c}`}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-border pl-1.5 pr-3 text-sm text-fg transition-colors hover:border-border-strong"
                >
                  <CompanyMark logo={marks.get(c)?.icon} dark={marks.get(c)?.iconDark} name={COMPANY_NAMES[c] ?? c} size="sm" />
                  {COMPANY_NAMES[c] ?? c}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {place.peopleRefs.length > 0 && (
        <section aria-labelledby="people-title">
          <h2 id="people-title" className="mb-3 text-lg font-semibold text-fg">
            People
          </h2>
          <ul className="flex flex-wrap gap-3">
            {place.peopleRefs.map((p) => (
              <li key={p.slug}>
                <Link href={`/people/${p.slug}`} className="flex items-center gap-2 text-sm text-fg hover:underline">
                  <Avatar photo={p.photo} name={p.name} size="sm" />
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {place.timeline.length > 0 && (
        <section aria-labelledby="events-title">
          <h2 id="events-title" className="mb-6 text-lg font-semibold text-fg">
            What happened here
          </h2>
          <EventList events={place.timeline} companyNames={COMPANY_NAMES} />
        </section>
      )}

      {refs.length > 0 && (
        <section aria-labelledby="refs-title">
          <h2 id="refs-title" className="mb-4 text-lg font-semibold text-fg">
            References
          </h2>
          <References urls={refs} sources={place.sources} />
        </section>
      )}
    </div>
  );
}
