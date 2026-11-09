import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IconArrowRight, IconBlockquote, IconBuildingSkyscraper, IconChartBar, IconCoins, IconFileText, IconHome, IconMoneybag, IconProgressCheck, IconTimelineEvent, IconTrendingUp } from "./icons";
import { dashboard } from "./data";
import { CompanyLogo, HUES, KindTag, PageHead, StageTag, StatusTag, T, formatDate, sectionGloss, usd } from "./ui";
import { LightButton, MetricRow, Tooltip } from "./tw";

const DESCRIPTION =
  "DeepWiki for startups. Renames, logos, funding rounds, launches and quotes, rebuilt by agents from primary sources. Every claim links to where it was said.";

export const metadata: Metadata = {
  title: { absolute: "Hyperlore: the sourced history of startups" },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: "Hyperlore: the sourced history of startups", description: DESCRIPTION, url: "/", siteName: "Hyperlore", type: "website", locale: "en_US" },
};

export default function Home() {
  return (
    <>
      <PageHead section="home" icon={IconHome} title="Home" />
      <section className="tw-panel">
        <div className="tw-scroll">
          <Suspense>
            <Dashboard />
          </Suspense>
        </div>
      </section>
    </>
  );
}

function Widget({ span, icon, section, title, href, children }: { span: number; icon: typeof IconHome; section: keyof typeof HUES; title: string; href?: string; children: React.ReactNode }) {
  return (
    <section className="tw-widget" data-span={span}>
      <header className="tw-widget-head">
        {sectionGloss(section, icon)}
        {title}
        {href && (
          <span className="tw-widget-action">
            <LightButton size="sm" emphasis="subtle" endIcon={<IconArrowRight />} href={href}>
              See all
            </LightButton>
          </span>
        )}
      </header>
      {children}
    </section>
  );
}

function Kpi({ icon, section, label, value, note }: { icon: typeof IconHome; section: keyof typeof HUES; label: string; value: string; note?: string }) {
  return (
    <section className="tw-widget" data-span={2}>
      <div className="tw-kpi">
        <span className="tw-kpi-label">
          {sectionGloss(section, icon)}
          {label}
        </span>
        <span className="tw-kpi-value">{value}</span>
        {note && <span className="tw-kpi-note">{note}</span>}
      </div>
    </section>
  );
}

const n = (x: number) => x.toLocaleString("en");

async function Dashboard() {
  const d = await dashboard();
  const years = d.stats.byYear.filter((y) => y.year >= 2005);
  const maxUsd = Math.max(1, ...years.map((y) => y.usd));
  const totalStatus = d.byStatus.reduce((s, x) => s + x.count, 0);
  const STATUS_COLOR: Record<string, string> = { active: "var(--t-color-green)", public: "var(--t-color-blue)", acquired: "var(--t-color-purple)", closed: "var(--t-color-gray)" };
  return (
    <div className="tw-dash">
      <Kpi section="companies" icon={IconBuildingSkyscraper} label="Companies" value={n(d.stats.companies)} note={`${n(d.stats.fundedCompanies)} with funding`} />
      <Kpi section="events" icon={IconTimelineEvent} label="Events" value={n(d.stats.events)} note="Dated, each with a source" />
      <Kpi section="sources" icon={IconFileText} label="Sources" value={n(d.stats.sources)} note="Tweets, videos, posts, filings" />
      <Kpi section="quotes" icon={IconBlockquote} label="Quotes" value={n(d.stats.quotes)} note="Verbatim, with timestamps" />
      <Kpi section="rounds" icon={IconCoins} label="Rounds" value={n(d.stats.rounds)} note={`${n(d.stats.roundsUsd)} with a USD amount`} />
      <Kpi section="capital" icon={IconTrendingUp} label="Capital tracked" value={usd(d.stats.totalUsd)} note="Primary rounds, never converted" />

      <Widget span={8} section="capital" icon={IconChartBar} title="Capital raised per year" href={`${T}/rounds`}>
        <div className="tw-bars">
          {years.map((y) => (
            <Tooltip key={y.year} content={`${y.year} · ${usd(y.usd) || "$0"}`} description={`${n(y.rounds)} rounds`} delay={0}>
              <div className="tw-bar" tabIndex={0} aria-label={`${y.year}: ${usd(y.usd)}`}>
                <div className="tw-bar-fill" style={{ height: `${Math.max(1, (y.usd / maxUsd) * 100)}%` }} />
              </div>
            </Tooltip>
          ))}
        </div>
        <div className="tw-bar-axis">
          {years.map((y) => (
            <span key={y.year}>{y.year % 5 === 0 ? y.year : ""}</span>
          ))}
        </div>
      </Widget>

      <Widget span={4} section="companies" icon={IconProgressCheck} title="Companies by status" href={`${T}/companies?view=status`}>
        <div style={{ padding: "var(--t-spacing-2) var(--t-spacing-3)", display: "grid", gap: 6 }}>
          {d.byStatus.map((s) => (
            <MetricRow key={s.id} value={<span className="tw-num">{n(s.count)}</span>} progress={Math.round((s.count / totalStatus) * 100)} progressColor={STATUS_COLOR[s.id]} progressValueText={`${s.count} of ${totalStatus}`}>
              <StatusTag status={s.id} />
            </MetricRow>
          ))}
        </div>
      </Widget>

      <Widget span={6} section="events" icon={IconTimelineEvent} title="Latest events">
        <div className="tw-list-rows">
          {d.events.map((e) => (
            <Link key={e.id} href={`${T}/${e.company}#${e.id}`} className="tw-list-row">
              <span className="tw-cell-row">
                <CompanyLogo name={e.companyName} logo={e.logo} />
                <span style={{ color: "var(--t-font-color-secondary)" }}>{e.companyName}</span>
                <span className="tw-shrink" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.title}
                </span>
              </span>
              <span className="tw-cell-row">
                <KindTag kind={e.kind} />
                <span className="tw-num tw-cell-muted" style={{ width: 84, textAlign: "right" }}>
                  {formatDate(e.date)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Widget>

      <Widget span={6} section="rounds" icon={IconCoins} title="Recent rounds" href={`${T}/rounds`}>
        <div className="tw-list-rows">
          {d.recent.map((r) => (
            <Link key={r.id} href={`${T}/${r.company}#${r.id}`} className="tw-list-row">
              <span className="tw-cell-row">
                <CompanyLogo name={r.companyName} logo={r.logo} />
                <span className="tw-shrink" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.companyName}
                </span>
                <StageTag stage={r.stage} />
              </span>
              <span className="tw-cell-row">
                <span className="tw-num" style={{ fontWeight: 500 }}>
                  {usd(r.amountUsd)}
                </span>
                <span className="tw-num tw-cell-muted" style={{ width: 84, textAlign: "right" }}>
                  {formatDate(r.date)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Widget>

      <Widget span={6} section="companies" icon={IconTrendingUp} title="Most funded companies" href={`${T}/companies`}>
        <div className="tw-list-rows">
          {d.raised.map((c, i) => (
            <Link key={c.slug} href={`${T}/${c.slug}`} className="tw-list-row">
              <span className="tw-cell-row">
                <span className="tw-cell-light tw-num" style={{ width: 16, textAlign: "right" }}>
                  {i + 1}
                </span>
                <CompanyLogo name={c.name} logo={c.logo} />
                <span>{c.name}</span>
                <StatusTag status={c.status} />
              </span>
              <span className="tw-num" style={{ fontWeight: 500 }}>
                {usd(c.raisedUsd)}
              </span>
            </Link>
          ))}
        </div>
      </Widget>

      <Widget span={6} section="investors" icon={IconMoneybag} title="Most active investors" href={`${T}/investors`}>
        <div className="tw-list-rows">
          {d.investors.map((v, i) => (
            <Link key={v.slug} href={`${T}/investors/${v.slug}`} className="tw-list-row">
              <span className="tw-cell-row">
                <span className="tw-cell-light tw-num" style={{ width: 16, textAlign: "right" }}>
                  {i + 1}
                </span>
                <span>{v.name}</span>
              </span>
              <span className="tw-cell-row tw-cell-muted tw-num">
                {v.companies} companies · {v.leads} led
              </span>
            </Link>
          ))}
        </div>
      </Widget>
    </div>
  );
}
