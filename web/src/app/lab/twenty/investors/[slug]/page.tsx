import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconBuildingSkyscraper, IconCalendar, IconCoins, IconExternalLink, IconFileText, IconHash, IconMoneybag, IconStairs, IconStar, IconTrendingUp } from "../../icons";
import { investorRecord } from "../../data";
import { stageLabel } from "@/lib/directory";
import { CompanyLogo, PageHead, Panel, SourceChip, StageTag, T, formatDate, usd } from "../../ui";
import { RecordTabs } from "../../record-tabs";
import { Avatar, DetailsRow, LightButton, Tag } from "../../tw";

export async function generateMetadata({ params }: PageProps<"/lab/twenty/investors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const inv = await investorRecord(slug);
  const name = inv?.name ?? "Investor";
  const description = inv?.summary ?? `${name}'s rounds in the archive: ${inv?.companies.length ?? 0} companies, ${inv?.leads ?? 0} rounds led.`;
  return {
    title: name,
    description,
    alternates: { canonical: `/investors/${slug}` },
    openGraph: { title: `${name} · Hyperlore`, description, url: `/investors/${slug}` },
  };
}

export default function InvestorPage({ params }: PageProps<"/lab/twenty/investors/[slug]">) {
  return (
    <Suspense>
      <Record params={params} />
    </Suspense>
  );
}

const TH = ({ icon: Icon, label, end }: { icon: typeof IconCoins; label: string; end?: boolean }) => (
  <th data-align={end ? "end" : undefined}>
    <span className="tw-th">
      <Icon size={16} stroke={1.6} aria-hidden />
      <span className="tw-th-label">{label}</span>
    </span>
  </th>
);

async function Record({ params }: { params: PageProps<"/lab/twenty/investors/[slug]">["params"] }) {
  const { slug } = await params;
  const inv = await investorRecord(slug);
  if (!inv) notFound();
  const dates = inv.stakes.map((s) => s.date).sort();
  const byCompany = new Map<string, typeof inv.stakes>();
  for (const s of inv.stakes) byCompany.set(s.company, [...(byCompany.get(s.company) ?? []), s]);

  return (
    <>
      <PageHead
        section="investors"
        icon={IconMoneybag}
        crumbs={[{ href: `${T}/investors`, label: "Investors" }]}
        title={inv.name}
        actions={
          <LightButton variant="outline" startIcon={<IconExternalLink />} href={`/investors/${inv.slug}`}>
            Classic page
          </LightButton>
        }
      />
      <Panel>
        <div className="tw-record">
          <aside className="tw-record-side">
            <div className="tw-record-head">
              <Avatar name={inv.name} colorSeed={inv.name} shape="rounded-square" size="xxl" />
              <h2 className="tw-record-title">{inv.name}</h2>
              {inv.summary && <p className="tw-record-summary">{inv.summary}</p>}
            </div>
            <dl className="tw-fields">
              <DetailsRow label="Companies" startIcon={<IconBuildingSkyscraper size={16} />} labelWidth={104}>
                <span className="tw-num">{inv.companies.length}</span>
              </DetailsRow>
              <DetailsRow label="Rounds" startIcon={<IconHash size={16} />} labelWidth={104}>
                <span className="tw-num">{inv.stakes.length}</span>
              </DetailsRow>
              <DetailsRow label="Rounds led" startIcon={<IconStar size={16} />} labelWidth={104}>
                <span className="tw-num">{inv.leads}</span>
              </DetailsRow>
              <DetailsRow label="Active" startIcon={<IconCalendar size={16} />} labelWidth={104}>
                <span className="tw-num">
                  {formatDate(dates[0])} – {formatDate(dates.at(-1))}
                </span>
              </DetailsRow>
              <DetailsRow label="Stages" startIcon={<IconStairs size={16} />} labelWidth={104}>
                {inv.stages.map((s) => (
                  <Tag key={s} color="gray">
                    {s}
                  </Tag>
                ))}
              </DetailsRow>
            </dl>
            <div className="tw-side-section" style={{ borderBottom: 0 }}>
              <div className="tw-side-section-head">
                <IconBuildingSkyscraper size={16} aria-hidden /> Portfolio <span className="tw-col-count tw-num">{inv.companies.length}</span>
              </div>
              <div className="tw-rel">
                {[...byCompany].map(([c, stakes]) => (
                  <Link key={c} href={`${T}/${c}`} className="tw-rel-row">
                    <CompanyLogo name={stakes[0].companyName} logo={stakes[0].logo} size="lg" />
                    <span className="tw-rel-text">{stakes[0].companyName}</span>
                    <span className="tw-rel-meta">
                      {stakes.some((s) => s.lead) && "Led · "}
                      {stakes.length} round{stakes.length > 1 ? "s" : ""}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>
          <div className="tw-record-main">
            <RecordTabs
              tabs={[
                {
                  id: "rounds",
                  label: "Rounds",
                  icon: <IconCoins />,
                  count: inv.stakes.length,
                  content: (
                    <table className="tw-table" style={{ width: "100%" }}>
                      <colgroup>
                        <col style={{ width: 210 }} />
                        <col style={{ width: 112 }} />
                        <col style={{ width: 200 }} />
                        <col style={{ width: 80 }} />
                        <col style={{ width: 100 }} />
                        <col style={{ width: 100 }} />
                        <col />
                      </colgroup>
                      <thead>
                        <tr>
                          <TH icon={IconBuildingSkyscraper} label="Company" />
                          <TH icon={IconCalendar} label="Date" />
                          <TH icon={IconStairs} label="Round" />
                          <TH icon={IconStar} label="Role" />
                          <TH icon={IconCoins} label="Amount" end />
                          <TH icon={IconTrendingUp} label="Valuation" end />
                          <TH icon={IconFileText} label="Source" />
                        </tr>
                      </thead>
                      <tbody>
                        {inv.stakes.map((s, i) => (
                          <tr key={i}>
                            <td>
                              <Link href={`${T}/${s.company}`} className="tw-cell-row tw-link">
                                <CompanyLogo name={s.companyName} logo={s.logo} />
                                <span className="tw-shrink">{s.companyName}</span>
                              </Link>
                            </td>
                            <td className="tw-num tw-cell-muted">{formatDate(s.date)}</td>
                            <td>
                              <span className="tw-cell-row">
                                <StageTag stage={s.stage} />
                                {s.round.toLowerCase() !== stageLabel(s.stage).toLowerCase() && <span className="tw-shrink tw-cell-muted">{s.round}</span>}
                              </span>
                            </td>
                            <td>{s.lead ? <Tag color="green">Lead</Tag> : <span className="tw-cell-light">Participant</span>}</td>
                            <td data-align="end" className="tw-num">
                              {usd(s.amountUsd)}
                            </td>
                            <td data-align="end" className="tw-num">
                              {usd(s.valuationUsd)}
                            </td>
                            <td>{s.source && <SourceChip url={s.source} host={new URL(s.source).host} />}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </Panel>
    </>
  );
}
