"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { MAX_COMPARE, categoryLabel, countryName, isSecondaryStage, stageLabel, statusLabel } from "@/lib/directory";
import type { ComparedCompany } from "@/lib/lore";
import { withBase } from "@/lib/base";
import {
  IconBuildingSkyscraper,
  IconCalendarEvent,
  IconCoins,
  IconSwitchHorizontal,
  IconTimelineEvent,
  IconTrendingUp,
  IconUser,
} from "../icons";
import { CompanyLogo, KindTag, PersonAvatar, StageTag, StatusTag, T, formatDate, money, sectionGloss, usd, type HUES } from "../ui";
import type { Logo } from "../data";
import { Flag } from "../companies/view";
import { ComparePicker } from "./picker";

export type Option = { slug: string; name: string; logo?: Logo };

const logo = (m?: { src: string; variant?: string }): Logo | undefined => (m ? { src: m.src, ...(m.variant === "dark" && { dark: true }) } : undefined);

/** The comparison for ?c=a,b,c: each company's data is a static JSON file, fetched and laid side by side. */
export function Comparison({ options, suggested }: { options: Option[]; suggested: string[][] }) {
  const params = useSearchParams();
  const raw = params.get("c") ?? "";
  const bySlug = new Map(options.map((c) => [c.slug, c]));
  const slugs = [...new Set(raw.split(",").map((s) => s.trim().toLowerCase().slice(0, 60)).filter((s) => bySlug.has(s)))].slice(0, MAX_COMPARE);
  const key = slugs.join(",");
  const [loaded, setLoaded] = useState<{ key: string; items: ComparedCompany[] }>({ key: "", items: [] });
  useEffect(() => {
    if (!key) return;
    let live = true;
    Promise.all(key.split(",").map((s) => fetch(withBase(`/compare/data/${s}.json`)).then((r) => r.json() as Promise<ComparedCompany>)))
      .then((items) => live && setLoaded({ key, items }))
      .catch(() => live && setLoaded({ key, items: [] }));
    return () => {
      live = false;
    };
  }, [key]);
  const items = key && loaded.key === key ? loaded.items : [];
  const pending = Boolean(key) && loaded.key !== key;
  const suggestions = suggested.map((g) => g.filter((s) => bySlug.has(s))).filter((g) => g.length >= 2);
  const selected = slugs.map((s) => bySlug.get(s)!);

  return (
    <>
      <ComparePicker selected={selected} options={options} />
      <div className="tw-scroll">
        <div className="tw-cmp">
          {pending ? null : items.length < 2 ? (
            <Section id="suggested" section="compare" icon={IconSwitchHorizontal} title={items.length ? "Add at least one more company" : "Start with a comparison"}>
              <div className="tw-cmp-body">
                <div className="tw-suggest">
                  {suggestions.map((g) => {
                    const group = g.map((s) => bySlug.get(s)!);
                    const href = `${T}/compare?c=${[...new Set([...items.map((i) => i.company.slug), ...g])].slice(0, MAX_COMPARE).join(",")}`;
                    return (
                      <Link key={g.join()} href={href} className="tw-kcard" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                        <span className="tw-cell-row" style={{ gap: 2 }}>
                          {group.map((c) => (
                            <CompanyLogo key={c.slug} name={c.name} logo={c.logo} size="lg" />
                          ))}
                        </span>
                        <span style={{ fontWeight: 500 }}>{group.map((c) => c.name).join(" vs ")}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </Section>
          ) : (
            <Sections items={items} />
          )}
        </div>
      </div>
    </>
  );
}

function Section({ id, section, icon, title, aside, children }: { id: string; section: keyof typeof HUES; icon: typeof IconCoins; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="tw-cmp-section">
      <header className="tw-widget-head">
        {sectionGloss(section, icon)}
        <h2 id={`${id}-title`} style={{ fontSize: "inherit", fontWeight: "inherit" }}>
          {title}
        </h2>
        {aside && <span className="tw-widget-action">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

const Dash = () => <span className="tw-cell-light">—</span>;

function Heading({ c, i }: { c: ComparedCompany["company"]; i: number }) {
  return (
    <span className="tw-cell-row" data-series={i}>
      <CompanyLogo name={c.name} logo={logo(c.icon ?? c.logo)} />
      <Link href={`${T}/${c.slug}`} className="tw-link tw-shrink" style={{ fontWeight: 600, color: "var(--t-font-color-primary)" }}>
        {c.name}
      </Link>
      <span aria-hidden="true" className="tw-cmp-key" />
    </span>
  );
}

/** A label column and one column per company: Twenty's record table, turned sideways. */
function SideBySide({ items, caption, labelWidth, rows }: { items: ComparedCompany[]; caption: string; labelWidth: number; rows: { label: ReactNode; key: string; cell: (i: ComparedCompany) => ReactNode }[] }) {
  return (
    <div className="tw-cmp-table">
      <table className="tw-table" style={{ width: "100%", minWidth: labelWidth + items.length * 200 }}>
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col style={{ width: labelWidth }} />
          {items.map((it) => (
            <col key={it.company.slug} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className="tw-sticky" />
            {items.map((it, i) => (
              <th key={it.company.slug} scope="col">
                <Heading c={it.company} i={i} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <th scope="row" className="tw-sticky">
                {row.label}
              </th>
              {items.map((it) => (
                <td key={it.company.slug}>{row.cell(it)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FactsTable({ items }: { items: ComparedCompany[] }) {
  const rows: { label: string; cell: (i: ComparedCompany) => ReactNode }[] = [
    { label: "Founded", cell: ({ company: c }) => (c.founded ? <span className="tw-num">{formatDate(c.founded)}</span> : <Dash />) },
    {
      label: "HQ",
      cell: ({ company: c }) => {
        const place = [c.city, countryName(c.country)].filter(Boolean).join(", ") || c.hq;
        return place ? (
          <span className="tw-cell-row" style={{ whiteSpace: "normal" }}>
            <Flag code={c.country} />
            {place}
          </span>
        ) : (
          <Dash />
        );
      },
    },
    {
      label: "Status",
      cell: ({ company: c }) => (
        <span className="tw-cell-row" style={{ flexWrap: "wrap" }}>
          <StatusTag status={c.status} />
          {c.status === "acquired" && c.acquiredBy && <span className="tw-cell-muted">by {c.acquiredBy}</span>}
          {c.stock && <span className="tw-cell-muted" style={{ fontFamily: "var(--t-code-font-family)" }}>{c.stock}</span>}
        </span>
      ),
    },
    { label: "Categories", cell: ({ company: c }) => (c.categories.length ? c.categories.slice(0, 4).map(categoryLabel).join(", ") : <Dash />) },
    {
      label: "Employees",
      cell: ({ company: c }) =>
        c.employees ? (
          <span className="tw-num">
            {c.employees.count.toLocaleString("en")}
            {c.employees.asOf && <span className="tw-cell-light"> ({c.employees.asOf})</span>}
          </span>
        ) : (
          <Dash />
        ),
    },
    {
      label: "Raised (USD)",
      cell: ({ company: c, rounds }) => {
        const native = rounds.filter((r) => !r.amountUsd && r.amount && !isSecondaryStage(r.stage)).length;
        return (
          <>
            <span className="tw-num" style={{ fontWeight: 600 }}>
              {c.raisedUsd ? usd(c.raisedUsd) : "—"}
            </span>
            {native > 0 && (
              <span className="tw-cmp-sub">
                + {native} {native === 1 ? "round" : "rounds"} in other currencies
              </span>
            )}
          </>
        );
      },
    },
    { label: "Rounds", cell: ({ rounds }) => <span className="tw-num">{rounds.length || "—"}</span> },
    {
      label: "Last round",
      cell: ({ company: c }) =>
        c.lastRound ? (
          <>
            <span className="tw-cell-row">
              <StageTag stage={c.lastRound.stage} />
              {c.lastRound.amountUsd ? <span className="tw-num">{usd(c.lastRound.amountUsd)}</span> : null}
            </span>
            <span className="tw-cmp-sub tw-num">{formatDate(c.lastRound.date)}</span>
          </>
        ) : (
          <Dash />
        ),
    },
    { label: "Latest valuation", cell: ({ company: c }) => (c.valuationUsd ? <span className="tw-num">{usd(c.valuationUsd)}</span> : <Dash />) },
    {
      label: "Investors",
      cell: ({ company: c }) =>
        c.investors.length ? (
          <>
            <span className="tw-num">{c.investors.length}</span>
            <span className="tw-cmp-sub">
              {c.investors
                .filter((i) => i.lead)
                .slice(0, 3)
                .map((i, k) => (
                  <span key={i.slug}>
                    {k > 0 && ", "}
                    <Link href={`${T}/investors/${i.slug}`} className="tw-link">
                      {i.name}
                    </Link>
                  </span>
                ))}
            </span>
          </>
        ) : (
          <Dash />
        ),
    },
    {
      label: "Website",
      cell: ({ company: c }) =>
        c.website ? (
          <a href={c.website} target="_blank" rel="noreferrer" className="tw-link" style={{ wordBreak: "break-all" }}>
            {c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          </a>
        ) : (
          <Dash />
        ),
    },
    { label: "In the archive", cell: ({ company: c }) => <span className="tw-num tw-cell-muted">{c.events} events · {c.sources} sources</span> },
  ];
  return <SideBySide items={items} caption="Profile facts, one column per company" labelWidth={140} rows={rows.map((r) => ({ ...r, key: r.label }))} />;
}

// --- The shared time axis ------------------------------------------------------------------------

type Axis = { t0: number; t1: number; years: number[] };
const toYear = (date: string) => {
  const [y, m = 1, d = 1] = date.split("-").map(Number);
  return y + (m - 1) / 12 + (d - 1) / 365;
};
function sharedAxis(dates: string[]): Axis {
  const ts = dates.filter(Boolean).map(toYear);
  const t0 = Math.floor(Math.min(...ts));
  const t1 = Math.max(Math.ceil(Math.max(...ts) + 0.01), t0 + 1);
  const span = t1 - t0;
  const every = span <= 6 ? 1 : span <= 12 ? 2 : span <= 25 ? 5 : 10;
  const years = Array.from({ length: span + 1 }, (_, i) => t0 + i).filter((y) => y % every === 0 || y === t0);
  return { t0, t1, years: years.filter((y, i) => i === 0 || y - years[i - 1] >= every) };
}
const pct = (axis: Axis, date: string) => ((toYear(date) - axis.t0) / (axis.t1 - axis.t0)) * 100;
const yearPct = (axis: Axis, y: number) => ((y - axis.t0) / (axis.t1 - axis.t0)) * 100;
const side = (x: number) => (x > 66 ? "right" : x < 33 ? "left" : "center");

function YearAxis({ axis, className = "" }: { axis: Axis; className?: string }) {
  return (
    <div aria-hidden="true" className={`tw-axis ${className}`}>
      {axis.years.map((y) => (
        <span key={y} style={{ left: `${yearPct(axis, y)}%` }}>
          {y}
        </span>
      ))}
    </div>
  );
}

function FundingTimeline({ items, axis }: { items: ComparedCompany[]; axis: Axis }) {
  const max = Math.max(1, ...items.flatMap((i) => i.rounds.map((r) => r.amountUsd ?? 0)));
  const radius = (amount?: number) => (amount ? 4 + 12 * Math.sqrt(amount / max) : 4);
  return (
    <figure style={{ margin: 0 }}>
      <div className="tw-lanes">
        {items.map(({ company: c, rounds }, i) => (
          <div key={c.slug} style={{ display: "contents" }} data-series={i}>
            <span className="tw-lane-name" data-series={i}>
              <span aria-hidden="true" className="tw-cmp-key" />
              <span>{c.name}</span>
            </span>
            <div className="tw-lane" data-series={i}>
              {axis.years.map((y) => (
                <span key={y} aria-hidden="true" className="tw-grid-line" style={{ left: `${yearPct(axis, y)}%` }} />
              ))}
              {c.founded && (
                <span className="tw-pt" style={{ left: `${pct(axis, c.founded)}%` }}>
                  <button type="button" aria-label={`${c.name} founded ${formatDate(c.founded)}`} style={{ left: -8, top: -12, width: 16, height: 24 }}>
                    <span className="tw-tick" />
                  </button>
                  <span role="tooltip" className="tw-tip" data-side={side(pct(axis, c.founded))}>
                    <strong>Founded</strong>
                    <span>{formatDate(c.founded)}</span>
                  </span>
                </span>
              )}
              {rounds.map((r) => {
                const x = pct(axis, r.date);
                const rad = radius(r.amountUsd);
                const hit = Math.max(12, rad + 2);
                return (
                  <span key={r.id} className="tw-pt" style={{ left: `${x}%` }}>
                    <Link
                      href={`${T}/${r.company}#${r.id}`}
                      aria-label={`${c.name}, ${r.round}, ${formatDate(r.date)}: ${money(r) || "amount not stated"}${r.valuationUsd ? ` at ${usd(r.valuationUsd)}` : ""}`}
                      style={{ width: hit * 2, height: hit * 2, left: -hit, top: -hit }}
                    >
                      <span className="tw-dot" data-hollow={r.amountUsd ? undefined : true} style={{ width: rad * 2, height: rad * 2 }} />
                    </Link>
                    <span role="tooltip" className="tw-tip" data-side={side(x)}>
                      <strong>{money(r) || "Amount not stated"}</strong>
                      <span>
                        {r.round} · {formatDate(r.date)}
                      </span>
                      {r.valuationUsd && <span>Valued at {usd(r.valuationUsd)}</span>}
                      {r.leads.length > 0 && <span>Led by {r.leads.slice(0, 3).join(", ")}</span>}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        <span />
        <YearAxis axis={axis} />
      </div>
      <figcaption className="tw-cmp-note">
        Dot area follows the round’s USD amount; hollow dots are rounds without a stated USD figure; the tick marks the founding. Hover or focus a mark for details.
      </figcaption>
    </figure>
  );
}

/** Log-scale ticks at each power of ten that brackets the values (plus 2× and 5× over a narrow range). */
function logTicks(values: number[]) {
  const lo = Math.floor(Math.log10(Math.min(...values)));
  const hi = Math.max(Math.ceil(Math.log10(Math.max(...values))), lo + 1);
  const decades = Array.from({ length: hi - lo + 1 }, (_, i) => 10 ** (lo + i));
  const ticks = hi - lo <= 2 ? decades.flatMap((d, i) => (i < decades.length - 1 ? [d, 2 * d, 5 * d] : [d])) : decades;
  return { lo, hi, ticks };
}

function ValuationChart({ items, axis }: { items: ComparedCompany[]; axis: Axis }) {
  const series = items.map(({ company, rounds }, i) => ({ company, i, points: rounds.filter((r) => r.valuationUsd) }));
  const all = series.flatMap((s) => s.points.map((p) => p.valuationUsd!));
  if (!all.length) return <p className="tw-cell-muted">None of these companies has a sourced valuation yet.</p>;
  const { lo, hi, ticks } = logTicks(all);
  const y = (v: number) => 100 - ((Math.log10(v) - lo) / (hi - lo)) * 100;
  return (
    <figure style={{ margin: 0 }}>
      <ul aria-label="Legend" className="tw-legend" style={{ listStyle: "none", padding: 0 }}>
        {series.map((s) => (
          <li key={s.company.slug} data-series={s.i}>
            <span aria-hidden="true" className="tw-legend-line" />
            <span style={{ fontWeight: 500 }}>{s.company.name}</span>
            <span className="tw-cell-muted tw-num">{s.points.length ? usd(s.points.at(-1)!.valuationUsd) : "no valuation on record"}</span>
          </li>
        ))}
      </ul>
      <div className="tw-val">
        {ticks.map((t) => (
          <div key={t} className="tw-val-tick" style={{ top: `${y(t)}%` }}>
            <span>{usd(t)}</span>
            <span />
          </div>
        ))}
        <div className="tw-val-plot">
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
            {series
              .filter((s) => s.points.length > 1)
              .map((s) => (
                <polyline
                  key={s.company.slug}
                  data-series={s.i}
                  points={s.points.map((p) => `${pct(axis, p.date)},${y(p.valuationUsd!)}`).join(" ")}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}
          </svg>
          {series.flatMap((s) =>
            s.points.map((p) => {
              const px = pct(axis, p.date);
              return (
                <span key={p.id} className="tw-pt" data-series={s.i} style={{ left: `${px}%`, top: `${y(p.valuationUsd!)}%` }}>
                  <Link href={`${T}/${p.company}#${p.id}`} aria-label={`${s.company.name} valued at ${usd(p.valuationUsd)}, ${p.round}, ${formatDate(p.date)}`} style={{ width: 24, height: 24, left: -12, top: -12 }}>
                    <span className="tw-dot" style={{ width: 10, height: 10, opacity: 1 }} />
                  </Link>
                  <span role="tooltip" className="tw-tip" data-side={side(px)}>
                    <strong>{usd(p.valuationUsd)}</strong>
                    <span>{s.company.name}</span>
                    <span>
                      {p.round} · {formatDate(p.date)}
                    </span>
                  </span>
                </span>
              );
            }),
          )}
        </div>
      </div>
      <YearAxis axis={axis} className="tw-val-axis" />
      <figcaption className="tw-cmp-note">Post-money valuations reported with each round, log scale.</figcaption>
    </figure>
  );
}

function RoundsTable({ items }: { items: ComparedCompany[] }) {
  const rows = items.flatMap(({ company, rounds }, i) => rounds.map((r) => ({ r, company, i }))).sort((a, b) => a.r.date.localeCompare(b.r.date));
  if (!rows.length) return null;
  const head = (Icon: typeof IconCoins, label: string, end?: boolean) => (
    <th data-align={end ? "end" : undefined}>
      <span className="tw-th">
        <Icon size={16} stroke={1.6} aria-hidden />
        <span className="tw-th-label">{label}</span>
      </span>
    </th>
  );
  return (
    <div style={{ overflowX: "auto", borderTop: "1px solid var(--t-border-color-light)" }}>
      <table className="tw-table" style={{ width: "100%" }}>
        <caption className="sr-only">Every round of the compared companies, oldest first</caption>
        <colgroup>
          <col style={{ width: 112 }} />
          <col style={{ width: 190 }} />
          <col />
          <col style={{ width: 110 }} />
          <col style={{ width: 110 }} />
        </colgroup>
        <thead>
          <tr>
            {head(IconCalendarEvent, "Date")}
            {head(IconBuildingSkyscraper, "Company")}
            {head(IconCoins, "Round")}
            {head(IconCoins, "Amount", true)}
            {head(IconTrendingUp, "Valuation", true)}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ r, company, i }) => (
            <tr key={r.id}>
              <td className="tw-num tw-cell-muted">{formatDate(r.date)}</td>
              <td>
                <span className="tw-cell-row" data-series={i}>
                  <span aria-hidden="true" className="tw-cmp-key" />
                  <CompanyLogo name={company.name} logo={logo(company.icon ?? company.logo)} />
                  <span className="tw-shrink">{company.name}</span>
                </span>
              </td>
              <td>
                <span className="tw-cell-row">
                  <StageTag stage={r.stage} />
                  {r.round.toLowerCase() !== stageLabel(r.stage).toLowerCase() && (
                    <Link href={`${T}/${r.company}#${r.id}`} className="tw-link tw-shrink tw-cell-muted">
                      {r.round}
                    </Link>
                  )}
                </span>
              </td>
              <td data-align="end" className="tw-num">
                {money(r) || <Dash />}
              </td>
              <td data-align="end" className="tw-num">
                {usd(r.valuationUsd) || <Dash />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const PER_CELL = 3;
const PRIORITY = ["founding", "rename", "acquired", "acquisition", "pivot", "rebrand", "launch", "product", "milestone", "open-source", "layoff", "controversy"];

function EventsByYear({ items }: { items: ComparedCompany[] }) {
  const years = [...new Set(items.flatMap((i) => i.events.map((e) => e.date.slice(0, 4))))].sort();
  if (!years.length) return <p className="tw-cmp-body tw-cell-muted">No key events on record yet.</p>;
  return (
    <SideBySide
      items={items}
      caption="Key events by year, one column per company"
      labelWidth={72}
      rows={years.map((y) => ({
        key: y,
        label: <span className="tw-num">{y}</span>,
        cell: (it: ComparedCompany) => {
          const inYear = it.events.filter((e) => e.date.startsWith(y));
          const shown = inYear
            .toSorted((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind) || a.date.localeCompare(b.date))
            .slice(0, PER_CELL)
            .sort((a, b) => a.date.localeCompare(b.date));
          if (!shown.length) return null;
          return (
            <>
              {shown.map((e) => (
                <div key={e.id} className="tw-cmp-ev">
                  <KindTag kind={e.kind} />
                  <div>
                    <Link href={`${T}/${it.company.slug}#${e.id}`}>{e.title}</Link>
                  </div>
                </div>
              ))}
              {inYear.length > PER_CELL && (
                <Link href={`${T}/${it.company.slug}`} className="tw-cmp-sub tw-link">
                  +{inYear.length - PER_CELL} more in {y}
                </Link>
              )}
            </>
          );
        },
      }))}
    />
  );
}

function Founders({ items }: { items: ComparedCompany[] }) {
  return (
    <div className="tw-cmp-body">
      <div className="tw-founders">
        {items.map((it, i) => (
          <div key={it.company.slug}>
            <Heading c={it.company} i={i} />
            {it.company.founders.length ? (
              <div className="tw-rel">
                {it.company.founders.map((f) =>
                  f.slug ? (
                    <Link key={f.name} href={`${T}/people/${f.slug}`} className="tw-rel-row">
                      <PersonAvatar name={f.name} photo={f.photo?.src} size="lg" />
                      <span className="tw-rel-text">{f.name}</span>
                    </Link>
                  ) : (
                    <div key={f.name} className="tw-rel-row">
                      <PersonAvatar name={f.name} photo={f.photo?.src} size="lg" />
                      <span className="tw-rel-text">{f.name}</span>
                    </div>
                  ),
                )}
              </div>
            ) : (
              <p className="tw-cell-muted" style={{ marginTop: 8 }}>
                No founders on record yet.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Sections({ items }: { items: ComparedCompany[] }) {
  const axis = sharedAxis(items.flatMap((i) => [i.company.founded ?? "", ...i.rounds.map((r) => r.date)]));
  // The rounds table filters companies by name (its "company" facet).
  const names = encodeURIComponent(items.map((i) => i.company.name).join(","));
  const hasRounds = items.some((i) => i.rounds.length);
  return (
    <>
      <Section id="profile" section="companies" icon={IconBuildingSkyscraper} title="Profile">
        <FactsTable items={items} />
      </Section>
      <Section id="funding" section="rounds" icon={IconCoins} title="Funding timeline" aside={<Link href={`${T}/rounds?company=${names}`}>These rounds in the feed →</Link>}>
        {hasRounds ? (
          <>
            <div className="tw-cmp-body">
              <FundingTimeline items={items} axis={axis} />
            </div>
            <RoundsTable items={items} />
          </>
        ) : (
          <p className="tw-cmp-body tw-cell-muted">No funding rounds on record for these companies.</p>
        )}
      </Section>
      <Section id="valuations" section="capital" icon={IconTrendingUp} title="Valuations">
        <div className="tw-cmp-body">
          <ValuationChart items={items} axis={axis} />
        </div>
      </Section>
      <Section id="events" section="events" icon={IconTimelineEvent} title="Key events by year" aside="Founding, renames, launches, acquisitions, pivots and milestones">
        <EventsByYear items={items} />
      </Section>
      <Section id="founders" section="people" icon={IconUser} title="Founders">
        <Founders items={items} />
      </Section>
    </>
  );
}
