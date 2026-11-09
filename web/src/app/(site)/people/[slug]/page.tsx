import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconBlockquote, IconBuildingSkyscraper, IconExternalLink, IconFileText, IconId, IconLink, IconMoneybag, IconPencil, IconTimelineEvent, IconUser } from "../../icons";
import { personRecord } from "../../data";
import { CompanyLogo, PageHead, Panel, PersonAvatar, T } from "../../ui";
import { Quotes, SourceList, Timeline } from "../../prose";
import { RecordTabs } from "../../record-tabs";
import { Chip, DetailsRow, LightButton, Tag } from "../../tw";
export { personParams as generateStaticParams } from "../../params";

export async function generateMetadata({ params }: PageProps<"/people/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await personRecord(slug);
  const name = p?.name ?? "Person";
  const description = p?.summary ?? `${name} in the Hyperlore archive: companies, positions, events and quotes, each with its source.`;
  return { title: name, description, alternates: { canonical: `/people/${slug}` }, openGraph: { title: `${name} · Hyperlore`, description, url: `/people/${slug}` } };
}

export default function PersonPage({ params }: PageProps<"/people/[slug]">) {
  return (
    <Suspense>
      <Record params={params} />
    </Suspense>
  );
}

const ROLE: Record<string, { label: string; color: "blue" | "green" | "gray" }> = {
  founder: { label: "Founder", color: "blue" },
  investor: { label: "Investor", color: "green" },
  employee: { label: "Employee", color: "gray" },
};

async function Record({ params }: { params: PageProps<"/people/[slug]">["params"] }) {
  const { slug } = await params;
  const p = await personRecord(slug);
  if (!p) notFound();
  const sources = Object.fromEntries(p.sources.map((s) => [s.url, s]));
  const links = Object.entries(p.links).filter(([, u]) => typeof u === "string" && /^https?:/.test(u));
  return (
    <>
      <PageHead
        section="people"
        icon={IconUser}
        crumbs={[{ href: `${T}/people`, label: "People" }]}
        title={p.name}
        actions={
          <LightButton variant="outline" startIcon={<IconExternalLink />} href={`/people/${p.slug}`}>
            Classic page
          </LightButton>
        }
      />
      <Panel>
        <div className="tw-record">
          <aside className="tw-record-side">
            <div className="tw-record-head">
              <PersonAvatar name={p.name} photo={p.photo} size="xxl" />
              <h2 className="tw-record-title">{p.name}</h2>
              {p.summary && <p className="tw-record-summary">{p.summary}</p>}
            </div>
            <dl className="tw-fields">
              <DetailsRow label="Roles" startIcon={<IconId size={16} />} labelWidth={104}>
                {p.roles.length ? (
                  p.roles.map((r) => (
                    <Tag key={r} color={ROLE[r]?.color ?? "gray"}>
                      {ROLE[r]?.label ?? r}
                    </Tag>
                  ))
                ) : (
                  <span className="tw-cell-light">Empty</span>
                )}
              </DetailsRow>
              {p.aliases.length > 0 && (
                <DetailsRow label="Also known as" startIcon={<IconPencil size={16} />} labelWidth={104}>
                  {p.aliases.join(", ")}
                </DetailsRow>
              )}
              {links.length > 0 && (
                <DetailsRow label="Links" startIcon={<IconLink size={16} />} labelWidth={104}>
                  {links.map(([k, u]) => (
                    <Chip key={k} variant="outline" render={<a href={u} target="_blank" rel="noreferrer" />} clickable>
                      {k}
                    </Chip>
                  ))}
                </DetailsRow>
              )}
              {p.backed && (
                <DetailsRow label="Invests" startIcon={<IconMoneybag size={16} />} labelWidth={104}>
                  <Link href={`${T}/investors/${p.backed.slug}`} className="tw-link">
                    {p.backed.companies} portfolio companies
                  </Link>
                </DetailsRow>
              )}
              {p.photoSource && (
                <DetailsRow label="Photo" startIcon={<IconFileText size={16} />} labelWidth={104}>
                  <a href={p.photoSource} target="_blank" rel="noreferrer" className="tw-link tw-cell-muted">
                    {new URL(p.photoSource).host.replace(/^www\./, "")}
                  </a>
                </DetailsRow>
              )}
            </dl>
            {p.positions.length > 0 && (
              <div className="tw-side-section">
                <div className="tw-side-section-head">
                  <IconId size={16} aria-hidden /> Positions <span className="tw-col-count tw-num">{p.positions.length}</span>
                </div>
                <div className="tw-rel">
                  {p.positions.map((r, i) => (
                    <Link key={i} href={`${T}/${r.company}`} className="tw-rel-row">
                      <CompanyLogo name={r.companyName} logo={r.logo} size="lg" />
                      <span className="tw-rel-text">
                        {r.title} <span className="tw-cell-muted">· {r.companyName}</span>
                      </span>
                      <span className="tw-rel-meta tw-num">{r.dates}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {p.companies.length > 0 && (
              <div className="tw-side-section" style={{ borderBottom: 0 }}>
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
          </aside>
          <div className="tw-record-main">
            <RecordTabs
              tabs={[
                { id: "timeline", label: "Timeline", icon: <IconTimelineEvent />, count: p.events.length, content: <Timeline events={p.events} showCompany /> },
                ...(p.quotes.length ? [{ id: "quotes", label: "Quotes", icon: <IconBlockquote />, count: p.quotes.length, content: <Quotes quotes={p.quotes} showCompany /> }] : []),
                ...(p.sources.length
                  ? [
                      {
                        id: "sources",
                        label: "Sources",
                        icon: <IconFileText />,
                        count: p.sources.length,
                        content: (
                          <div className="tw-prose">
                            <div className="tw-refs" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
                              <SourceList urls={p.sources.map((s) => s.url)} sources={sources} />
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
