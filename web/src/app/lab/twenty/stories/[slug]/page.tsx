import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconBook2, IconBuildingSkyscraper, IconCalendar, IconExternalLink, IconFileText } from "../../icons";
import { companyLookup, story } from "../../data";
import { CompanyLogo, PageHead, Panel, T, formatDate } from "../../ui";
import { Prose } from "../../prose";
import { DetailsRow, LightButton } from "../../tw";

export async function generateMetadata({ params }: PageProps<"/lab/twenty/stories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await story(slug);
  const title = s?.title ?? "Story";
  return { title, description: s?.summary, alternates: { canonical: `/stories/${slug}` }, openGraph: { title, description: s?.summary, url: `/stories/${slug}`, type: "article" } };
}

export default function StoryPage({ params }: PageProps<"/lab/twenty/stories/[slug]">) {
  return (
    <Suspense>
      <Reader params={params} />
    </Suspense>
  );
}

async function Reader({ params }: { params: PageProps<"/lab/twenty/stories/[slug]">["params"] }) {
  const { slug } = await params;
  const [s, lookup] = await Promise.all([story(slug), companyLookup()]);
  if (!s) notFound();
  return (
    <>
      <PageHead
        section="stories"
        icon={IconBook2}
        crumbs={[{ href: `${T}/stories`, label: "Stories" }]}
        title={s.title}
        actions={
          <LightButton variant="outline" startIcon={<IconExternalLink />} href={`/stories/${s.slug}`}>
            Classic page
          </LightButton>
        }
      />
      <Panel>
        <div className="tw-record" style={{ gridTemplateColumns: "minmax(0, 1fr) 300px" }}>
          <div className="tw-record-side" style={{ borderRight: "1px solid var(--t-border-color-light)" }}>
            <div className="tw-story-head">
              <h2 className="tw-story-title">{s.title}</h2>
              {s.summary && <p className="tw-record-summary" style={{ marginTop: 8, fontSize: "var(--t-font-size-lg)" }}>{s.summary}</p>}
            </div>
            <Prose markdown={s.markdown} sources={s.sources} />
          </div>
          <aside className="tw-record-main" style={{ overflowY: "auto" }}>
            <dl className="tw-fields">
              <DetailsRow label="Updated" startIcon={<IconCalendar size={16} />} labelWidth={88}>
                <span className="tw-num">{formatDate(s.updatedAt.slice(0, 10))}</span>
              </DetailsRow>
              <DetailsRow label="Sources" startIcon={<IconFileText size={16} />} labelWidth={88}>
                <span className="tw-num">{Object.keys(s.sources).length}</span>
              </DetailsRow>
            </dl>
            <div className="tw-side-section" style={{ borderBottom: 0 }}>
              <div className="tw-side-section-head">
                <IconBuildingSkyscraper size={16} aria-hidden /> Companies <span className="tw-col-count tw-num">{s.companies.length}</span>
              </div>
              <div className="tw-rel">
                {s.companies.map((c) => (
                  <Link key={c} href={`${T}/${c}`} className="tw-rel-row">
                    <CompanyLogo name={lookup[c]?.name ?? c} logo={lookup[c]?.logo} size="lg" />
                    <span className="tw-rel-text">{lookup[c]?.name ?? c}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </Panel>
    </>
  );
}
