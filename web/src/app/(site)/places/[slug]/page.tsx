import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconBook, IconBuildingSkyscraper, IconCalendarEvent, IconExternalLink, IconFileText, IconLink, IconMap, IconTimelineEvent, IconUsers, IconWorld } from "../../icons";
import { Prose, SourceList, Timeline, citationOrder } from "../../prose";
import { RecordTabs } from "../../record-tabs";
import { CompanyLogo, PageHead, Panel, PersonAvatar, T, formatDate } from "../../ui";
import { Chip, DetailsRow, LightButton } from "../../tw";
import { Flag } from "../../companies/view";
import { countryCode, countryName } from "@/lib/directory";
import { placeRecord } from "./data";
import { withBase } from "@/lib/base";
export { placeParams as generateStaticParams } from "../../params";

export async function generateMetadata({ params }: PageProps<"/places/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await placeRecord(slug);
  if (!p) return { title: "Place not found" };
  return {
    title: p.name,
    description: p.summary,
    alternates: { canonical: `/places/${slug}` },
    openGraph: { title: p.name, description: p.summary, url: `/places/${slug}`, type: "website" },
  };
}

export default function PlacePage({ params }: PageProps<"/places/[slug]">) {
  return (
    <Suspense>
      <Record params={params} />
    </Suspense>
  );
}

async function Record({ params }: { params: PageProps<"/places/[slug]">["params"] }) {
  const { slug } = await params;
  const p = await placeRecord(slug);
  if (!p) notFound();
  const code = countryCode(p.country);
  const map = p.coordinates
    ? `https://www.openstreetmap.org/?mlat=${p.coordinates.lat}&mlon=${p.coordinates.lng}#map=17/${p.coordinates.lat}/${p.coordinates.lng}`
    : undefined;
  const refs = p.history ? citationOrder(p.history) : [];
  const links = Object.entries(p.links ?? {}).filter(([, u]) => typeof u === "string" && /^https?:/.test(u));
  return (
    <>
      <PageHead
        section="places"
        icon={IconMap}
        crumbs={[{ href: `${T}/places`, label: "Places" }]}
        title={p.name}
        actions={
          <>
            {map && (
              <LightButton startIcon={<IconMap />} href={map} target="_blank" rel="noreferrer">
                Map
              </LightButton>
            )}
            <LightButton variant="outline" startIcon={<IconExternalLink />} href={`/places/${p.slug}?style=classic`}>
              Classic page
            </LightButton>
          </>
        }
      />
      <Panel>
        <div className="tw-record">
          <aside className="tw-record-side">
            <div className="tw-record-head">
              {p.photo && (
                <figure style={{ margin: 0, width: "100%" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={withBase(p.photo.src)}
                    alt={p.name}
                    style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: "var(--t-border-radius-sm)", border: "1px solid var(--t-border-color-medium)" }}
                  />
                  <figcaption className="tw-record-sub" style={{ marginTop: 4 }}>
                    {p.photo.author && `${p.photo.author} · `}
                    {p.photo.licence && `${p.photo.licence} · `}
                    <a href={p.photo.sourceUrl} target="_blank" rel="noreferrer" className="tw-link">
                      Source
                    </a>
                  </figcaption>
                </figure>
              )}
              <h2 className="tw-record-title">{p.name}</h2>
              {p.summary && <p className="tw-record-summary">{p.summary}</p>}
            </div>
            <dl className="tw-fields">
              <DetailsRow label="Address" startIcon={<IconMap size={16} />} labelWidth={96}>
                {p.address ?? p.city ?? <span className="tw-cell-light">Empty</span>}
              </DetailsRow>
              <DetailsRow label="Country" startIcon={<IconWorld size={16} />} labelWidth={96}>
                {p.country ? (
                  <span className="tw-cell-row">
                    <Flag code={code} />
                    {countryName(code) || p.country}
                  </span>
                ) : (
                  <span className="tw-cell-light">Empty</span>
                )}
              </DetailsRow>
              <DetailsRow label="Opened" startIcon={<IconCalendarEvent size={16} />} labelWidth={96}>
                {p.opened ? <span className="tw-num">{formatDate(p.opened)}</span> : <span className="tw-cell-light">Empty</span>}
              </DetailsRow>
              {p.coordinates && (
                <DetailsRow label="Coordinates" startIcon={<IconMap size={16} />} labelWidth={96}>
                  <a href={map} target="_blank" rel="noreferrer" className="tw-link tw-num">
                    {p.coordinates.lat.toFixed(4)}, {p.coordinates.lng.toFixed(4)}
                  </a>
                </DetailsRow>
              )}
              {links.length > 0 && (
                <DetailsRow label="Links" startIcon={<IconLink size={16} />} labelWidth={96}>
                  {links.map(([k, u]) => (
                    <Chip key={k} variant="outline" render={<a href={u} target="_blank" rel="noreferrer" />} clickable>
                      {k}
                    </Chip>
                  ))}
                </DetailsRow>
              )}
            </dl>
            {p.companies.length > 0 && (
              <div className="tw-side-section">
                <div className="tw-side-section-head">
                  <IconBuildingSkyscraper size={16} aria-hidden /> Companies <span className="tw-col-count tw-num">{p.companies.length}</span>
                </div>
                <div className="tw-rel">
                  {p.companies.map((c) => (
                    <Link key={c.slug} href={`${T}/${c.slug}`} className="tw-rel-row">
                      <CompanyLogo name={c.name} logo={c.logo} size="lg" />
                      <span className="tw-rel-text">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {p.people.length > 0 && (
              <div className="tw-side-section" style={{ borderBottom: 0 }}>
                <div className="tw-side-section-head">
                  <IconUsers size={16} aria-hidden /> People <span className="tw-col-count tw-num">{p.people.length}</span>
                </div>
                <div className="tw-rel">
                  {p.people.map((x) => (
                    <Link key={x.slug} href={`${T}/people/${x.slug}`} className="tw-rel-row">
                      <PersonAvatar name={x.name} photo={x.photo} size="lg" />
                      <span className="tw-rel-text">{x.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </aside>
          <div className="tw-record-main">
            <RecordTabs
              tabs={[
                ...(p.history ? [{ id: "history", label: "History", icon: <IconBook />, content: <Prose markdown={p.history} sources={p.sources} /> }] : []),
                { id: "timeline", label: "What happened here", icon: <IconTimelineEvent />, count: p.events.length, content: <Timeline events={p.events} showCompany /> },
                ...(refs.length
                  ? [
                      {
                        id: "sources",
                        label: "Sources",
                        icon: <IconFileText />,
                        count: refs.length,
                        content: (
                          <div className="tw-prose">
                            <div className="tw-refs" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                              <SourceList urls={refs} sources={p.sources} numbered />
                            </div>
                          </div>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </div>
        </div>
      </Panel>
    </>
  );
}
