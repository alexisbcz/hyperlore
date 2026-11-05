import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { stageLabel } from "@/lib/directory";
import { archiveStats } from "@/lib/lore";
import { isLive } from "@/lib/store";
import { BUILD } from "@/lib/build";
import { IconBlockquote, IconBuildingSkyscraper, IconChartBar, IconCoins, IconFileText, IconStairs, IconTimelineEvent, IconTrendingUp } from "../icons";
import { indexMetadata } from "../og/meta";
import { PageHead, StageTag, T, sectionGloss, stageColor, usd, type HUES } from "../ui";
import "../compare/compare.css";
import "./stats.css";

export const metadata: Metadata = indexMetadata({
  title: "Archive statistics",
  description: "How much the Hyperlore archive holds: companies, sourced events, sources, quotes, funding rounds and the funding they disclose.",
  path: "/stats",
});

export default function StatsPage() {
  return (
    <>
      <PageHead section="stats" icon={IconChartBar} title="Archive statistics" />
      <section className="tw-panel">
        <div className="tw-scroll">
          <Suspense>
            <Numbers />
          </Suspense>
        </div>
      </section>
    </>
  );
}

const n = (v: number) => v.toLocaleString("en");

// Live data renders per request; the snapshot once per deployment.
async function Numbers() {
  if (!isLive()) return CachedNumbers({ build: BUILD });
  await connection();
  return NumbersBody();
}

async function CachedNumbers({ build }: { build: string }) {
  "use cache";
  void build;
  cacheLife("max");
  return NumbersBody();
}

function Kpi({ section, icon, label, value, note, href }: { section: keyof typeof HUES; icon: typeof IconCoins; label: string; value: string; note?: string; href?: string }) {
  const body = (
    <div className="tw-kpi">
      <span className="tw-kpi-label">
        {sectionGloss(section, icon)}
        {label}
      </span>
      <span className="tw-kpi-value">{value}</span>
      {note && <span className="tw-kpi-note">{note}</span>}
    </div>
  );
  return (
    <section className="tw-widget tw-stat-kpi" data-span={4}>
      {href ? <Link href={href}>{body}</Link> : body}
    </section>
  );
}

async function NumbersBody() {
  const s = await archiveStats();
  const years = s.byYear;
  const max = Math.max(1, ...years.map((y) => y.rounds));
  const peak = years.reduce((a, b) => (b.rounds > a.rounds ? b : a), years[0]);
  const first = years[0]?.year ?? 0;
  const last = years.at(-1)?.year ?? 0;
  const span = Array.from({ length: last - first + 1 }, (_, i) => first + i).map((year) => years.find((y) => y.year === year) ?? { year, rounds: 0, usd: 0 });
  const every = span.length <= 12 ? 1 : span.length <= 24 ? 2 : 5;
  const stageMax = Math.max(1, ...s.byStage.map((x) => x.count));
  return (
    <div className="tw-dash">
      <Kpi section="companies" icon={IconBuildingSkyscraper} label="Companies" value={n(s.companies)} href={`${T}/companies`} note={`${n(s.fundedCompanies)} with funding rounds`} />
      <Kpi section="events" icon={IconTimelineEvent} label="Sourced events" value={n(s.events)} note="Each links to where it was found" />
      <Kpi section="sources" icon={IconFileText} label="Sources" value={n(s.sources)} note="Tweets, videos, articles, archived pages" />
      <Kpi section="quotes" icon={IconBlockquote} label="Quotes" value={n(s.quotes)} note="Verbatim, linked to the moment said" />
      <Kpi section="rounds" icon={IconCoins} label="Funding rounds" value={n(s.rounds)} href={`${T}/rounds`} note={`${n(s.valuations)} with a reported valuation`} />
      <Kpi
        section="capital"
        icon={IconTrendingUp}
        label="Funding tracked (USD)"
        value={usd(s.totalUsd)}
        href={`${T}/rounds`}
        note={`Across ${n(s.roundsUsd)} rounds stated in USD; secondaries and tenders excluded${s.roundsOtherCurrency ? `; ${n(s.roundsOtherCurrency)} rounds in other currencies not converted` : ""}`}
      />

      <section className="tw-widget" data-span={12} aria-labelledby="per-year-title">
        <header className="tw-widget-head">
          {sectionGloss("rounds", IconChartBar)}
          <h2 id="per-year-title" style={{ fontSize: "inherit", fontWeight: "inherit" }}>
            Funding rounds per year
          </h2>
          <span className="tw-widget-action tw-cell-muted" style={{ fontSize: "var(--t-font-size-sm)" }}>
            By the year they were announced or closed
          </span>
        </header>
        <figure className="tw-stat-chart" style={{ margin: 0 }}>
          <div className="tw-stat-plot">
            {[0, 0.5, 1].map((f) => (
              <div key={f} className="tw-stat-grid" style={{ bottom: `${f * 100}%` }}>
                <span className="tw-num">{Math.round(f * max)}</span>
                <span />
              </div>
            ))}
            <div className="tw-stat-bars">
              {span.map((y) => {
                const h = (y.rounds / max) * 100;
                const x = ((y.year - first) / Math.max(1, last - first)) * 100;
                return (
                  <div key={y.year} className="tw-pt tw-stat-bar">
                    <Link
                      href={`${T}/rounds?year=${y.year}`}
                      aria-label={`${y.year}: ${y.rounds} ${y.rounds === 1 ? "round" : "rounds"}${y.usd ? `, ${usd(y.usd)} disclosed in USD` : ""}`}
                    >
                      {y.rounds > 0 && <span className="tw-stat-fill" style={{ height: `max(${h}%, 2px)` }} />}
                    </Link>
                    {(y === peak || y.year === last) && y.rounds > 0 && (
                      <span className="tw-stat-label tw-num" style={{ bottom: `${h}%` }}>
                        {y.rounds}
                      </span>
                    )}
                    <span role="tooltip" className="tw-tip" data-side={x > 66 ? "right" : x < 33 ? "left" : "center"}>
                      <strong>
                        {y.rounds} {y.rounds === 1 ? "round" : "rounds"}
                      </strong>
                      <span>
                        {y.year}
                        {y.usd ? ` · ${usd(y.usd)} in USD` : ""}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div aria-hidden="true" className="tw-stat-axis">
            {span.map((y) => (
              <span key={y.year}>{(y.year - first) % every === 0 ? `’${String(y.year).slice(2)}` : ""}</span>
            ))}
          </div>
          <figcaption className="sr-only">Number of funding rounds per year; the table below lists rounds by stage.</figcaption>
        </figure>
      </section>

      <section className="tw-widget" data-span={12} aria-labelledby="stage-title">
        <header className="tw-widget-head">
          {sectionGloss("rounds", IconStairs)}
          <h2 id="stage-title" style={{ fontSize: "inherit", fontWeight: "inherit" }}>
            Rounds by stage
          </h2>
          <span className="tw-widget-action tw-cell-muted tw-num" style={{ fontSize: "var(--t-font-size-sm)" }}>
            {n(s.rounds)} rounds
          </span>
        </header>
        <div className="tw-stat-stages">
          {s.byStage.map((x) => (
            <Link key={x.stage} href={`${T}/rounds?stage=${x.stage}`} className="tw-list-row tw-stat-stage" aria-label={`${stageLabel(x.stage)}: ${n(x.count)} rounds`}>
              <span className="tw-cell-row">
                <StageTag stage={x.stage} />
              </span>
              <span className="tw-cell-row">
                <span className="tw-stat-meter" aria-hidden="true">
                  <span style={{ width: `${(x.count / stageMax) * 100}%`, background: `var(--t-tag-text-${stageColor(x.stage)})` }} />
                </span>
                <span className="tw-num tw-cell-muted" style={{ width: 48, textAlign: "right" }}>
                  {n(x.count)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
