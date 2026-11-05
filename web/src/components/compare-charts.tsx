// Comparison charts on a shared time axis. Presentational only (no hooks): hover and keyboard focus
// reveal each mark's tooltip with CSS, like the funding charts on company pages.
import { stageLabel } from "@/lib/directory";
import type { CompanySummary, RoundRow } from "@/lib/types";
import { CompanyMark, formatDate, formatUsd, roundAmount } from "./lore";
import { TableScroll } from "./table-scroll";

/** Fixed categorical order (validated in globals.css); a company keeps its slot from its position in the URL. */
export const SERIES = [
  { bg: "bg-series-1", stroke: "stroke-series-1", border: "border-series-1" },
  { bg: "bg-series-2", stroke: "stroke-series-2", border: "border-series-2" },
  { bg: "bg-series-3", stroke: "stroke-series-3", border: "border-series-3" },
  { bg: "bg-series-4", stroke: "stroke-series-4", border: "border-series-4" },
];

export type Axis = { t0: number; t1: number; years: number[] };

export const toYear = (date: string) => {
  const [y, m = 1, d = 1] = date.split("-").map(Number);
  return y + (m - 1) / 12 + (d - 1) / 365;
};

/** One time axis for every company: from the earliest founding or round to the latest record. */
export function sharedAxis(dates: string[]): Axis {
  const ts = dates.filter(Boolean).map(toYear);
  const t0 = Math.floor(Math.min(...ts));
  const t1 = Math.max(Math.ceil(Math.max(...ts) + 0.01), t0 + 1);
  const span = t1 - t0;
  const every = span <= 6 ? 1 : span <= 12 ? 2 : span <= 25 ? 5 : 10;
  const years = Array.from({ length: span + 1 }, (_, i) => t0 + i).filter((y) => y % every === 0 || y === t0);
  return { t0, t1, years: years.filter((y, i) => i === 0 || y - years[i - 1] >= every) };
}

const pct = (axis: Axis, date: string) => ((toYear(date) - axis.t0) / (axis.t1 - axis.t0)) * 100;
const tipSide = (x: number) => (x > 66 ? "right-0" : x < 33 ? "left-0" : "left-1/2 -translate-x-1/2");

function YearAxis({ axis, className = "" }: { axis: Axis; className?: string }) {
  return (
    <div aria-hidden="true" className={`relative h-4 ${className}`}>
      {axis.years.map((y) => {
        const x = ((y - axis.t0) / (axis.t1 - axis.t0)) * 100;
        return (
          <span
            key={y}
            className={`absolute font-mono text-[11px] tabular-nums text-fg-subtle ${x > 94 ? "-translate-x-full" : x > 0 ? "-translate-x-1/2" : ""}`}
            style={{ left: `${x}%` }}
          >
            {y}
          </span>
        );
      })}
    </div>
  );
}

function Gridlines({ axis }: { axis: Axis }) {
  return axis.years.map((y) => (
    <span key={y} aria-hidden="true" className="absolute inset-y-0 w-px bg-border" style={{ left: `${((y - axis.t0) / (axis.t1 - axis.t0)) * 100}%` }} />
  ));
}

const Tip = ({ x, children }: { x: number; children: React.ReactNode }) => (
  <span
    role="tooltip"
    className={`pointer-events-none absolute hidden bottom-full z-20 mb-1 w-max max-w-64 rounded-md border border-border bg-bg px-2.5 py-1.5 text-left text-xs shadow-md transition-opacity starting:opacity-0 group-focus-within/pt:block group-hover/pt:block ${tipSide(x)}`}
  >
    {children}
  </span>
);

/**
 * Funding timeline: one lane per company on the shared axis; each round is a dot whose area follows
 * its USD amount (hollow when no USD amount is stated), and a tick marks the founding.
 */
export function FundingTimeline({ items, axis }: { items: { company: CompanySummary; rounds: RoundRow[] }[]; axis: Axis }) {
  const max = Math.max(1, ...items.flatMap((i) => i.rounds.map((r) => r.amountUsd ?? 0)));
  const radius = (usd?: number) => (usd ? 4 + 12 * Math.sqrt(usd / max) : 4);
  return (
    <figure className="rounded-lg border border-border p-4">
      <div className="space-y-3">
        {items.map(({ company: c, rounds }, i) => (
          <div key={c.slug} className="sm:grid sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-3">
            <span className="mb-1 flex min-w-0 items-center gap-2 text-sm font-medium text-fg sm:mb-0">
              <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-full ${SERIES[i].bg}`} />
              <span className="truncate">{c.name}</span>
            </span>
            <div className="relative mx-4 h-10">
              <Gridlines axis={axis} />
              <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-border-strong" />
              {c.founded && (
                <span className="group/pt absolute top-1/2 size-0" style={{ left: `${pct(axis, c.founded)}%` }}>
                  <button
                    type="button"
                    aria-label={`${c.name} founded ${formatDate(c.founded)}`}
                    className="absolute -left-2 -top-3 flex h-6 w-4 items-center justify-center rounded outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="h-4 w-0.5 rounded-full bg-fg-muted" />
                  </button>
                  <Tip x={pct(axis, c.founded)}>
                    <span className="block font-medium text-fg">Founded</span>
                    <span className="text-fg-subtle">{formatDate(c.founded)}</span>
                  </Tip>
                </span>
              )}
              {rounds.map((r) => {
                const x = pct(axis, r.date);
                const rad = radius(r.amountUsd);
                return (
                  <span key={r.id} className="group/pt absolute top-1/2 size-0" style={{ left: `${x}%` }}>
                    <a
                      href={`/${r.company}#${r.id}`}
                      aria-label={`${c.name}, ${r.round}, ${formatDate(r.date)}: ${roundAmount(r)}${r.valuationUsd ? ` at ${formatUsd(r.valuationUsd)}` : ""}`}
                      className="absolute flex items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      style={{ width: Math.max(24, rad * 2 + 4), height: Math.max(24, rad * 2 + 4), left: -Math.max(12, rad + 2), top: -Math.max(12, rad + 2) }}
                    >
                      <span
                        className={`block rounded-full ring-2 ring-bg transition-transform group-hover/pt:scale-110 ${r.amountUsd ? `${SERIES[i].bg} opacity-85` : `border-2 bg-bg ${SERIES[i].border}`}`}
                        style={{ width: rad * 2, height: rad * 2 }}
                      />
                    </a>
                    <Tip x={x}>
                      <span className="block font-mono font-semibold tabular-nums text-fg">{roundAmount(r)}</span>
                      <span className="block text-fg-muted">
                        {r.round} · {formatDate(r.date)}
                      </span>
                      {r.valuationUsd && <span className="block text-fg-subtle">Valued at {formatUsd(r.valuationUsd)}</span>}
                      {r.leads.length > 0 && <span className="block text-fg-subtle">Led by {r.leads.slice(0, 3).join(", ")}</span>}
                    </Tip>
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        <div className="sm:grid sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
          <span className="hidden sm:block" />
          <YearAxis axis={axis} className="mx-4" />
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-fg-subtle">
        Dot area follows the round&apos;s USD amount; hollow dots are rounds without a stated USD figure; the tick marks the founding.
      </figcaption>
    </figure>
  );
}

/** Log-scale ticks at each power of ten that brackets the values. */
function logTicks(values: number[]) {
  const lo = Math.floor(Math.log10(Math.min(...values)));
  const hi = Math.max(Math.ceil(Math.log10(Math.max(...values))), lo + 1);
  const decades = Array.from({ length: hi - lo + 1 }, (_, i) => 10 ** (lo + i));
  // One or two decades leave too few gridlines to read values against: add the 2× and 5× steps.
  const ticks = hi - lo <= 2 ? decades.flatMap((d, i) => (i < decades.length - 1 ? [d, 2 * d, 5 * d] : [d])) : decades;
  return { lo, hi, ticks };
}

/**
 * Valuations over time on the shared axis, one line per company with a known valuation, on a log
 * scale (a seed and a growth round differ by orders of magnitude). Legend carries names and latest values.
 */
export function ValuationChart({ items, axis }: { items: { company: CompanySummary; rounds: RoundRow[] }[]; axis: Axis }) {
  const series = items.map(({ company, rounds }, i) => ({ company, i, points: rounds.filter((r) => r.valuationUsd) }));
  const all = series.flatMap((s) => s.points.map((p) => p.valuationUsd!));
  if (!all.length) return <p className="text-sm text-fg-subtle">None of these companies has a sourced valuation yet.</p>;
  const { lo, hi, ticks } = logTicks(all);
  const y = (v: number) => 100 - ((Math.log10(v) - lo) / (hi - lo)) * 100;
  const x = (date: string) => pct(axis, date);
  return (
    <figure className="rounded-lg border border-border p-4">
      <ul aria-label="Legend" className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {series.map((s) => (
          <li key={s.company.slug} className="flex items-center gap-2">
            <span aria-hidden="true" className={`h-0.5 w-4 rounded-full ${SERIES[s.i].bg}`} />
            <span className="text-fg">{s.company.name}</span>
            <span className="tabular-nums text-fg-subtle">{s.points.length ? formatUsd(s.points.at(-1)!.valuationUsd) : "no valuation on record"}</span>
          </li>
        ))}
      </ul>
      <div className="relative h-56">
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ top: `${y(t)}%` }}>
            <span className="w-12 shrink-0 -translate-y-1/2 text-right font-mono text-[11px] tabular-nums text-fg-subtle">{formatUsd(t)}</span>
            <span className="h-px flex-1 -translate-y-1/2 bg-border" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-14 right-2">
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            {series
              .filter((s) => s.points.length > 1)
              .map((s) => (
                <polyline
                  key={s.company.slug}
                  points={s.points.map((p) => `${x(p.date)},${y(p.valuationUsd!)}`).join(" ")}
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  className={SERIES[s.i].stroke}
                />
              ))}
          </svg>
          {series.flatMap((s) =>
            s.points.map((p) => {
              const px = x(p.date);
              return (
                <span key={p.id} className="group/pt absolute size-0" style={{ left: `${px}%`, top: `${y(p.valuationUsd!)}%` }}>
                  <a
                    href={`/${p.company}#${p.id}`}
                    aria-label={`${s.company.name} valued at ${formatUsd(p.valuationUsd)}, ${p.round}, ${formatDate(p.date)}`}
                    className="absolute -left-3 -top-3 flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className={`size-2.5 rounded-full ring-2 ring-bg transition-transform group-hover/pt:scale-125 ${SERIES[s.i].bg}`} />
                  </a>
                  <Tip x={px}>
                    <span className="block font-mono font-semibold tabular-nums text-fg">{formatUsd(p.valuationUsd)}</span>
                    <span className="block text-fg-muted">{s.company.name}</span>
                    <span className="text-fg-subtle">
                      {p.round} · {formatDate(p.date)}
                    </span>
                  </Tip>
                </span>
              );
            }),
          )}
        </div>
      </div>
      <YearAxis axis={axis} className="ml-14 mr-2 mt-2" />
      <figcaption className="mt-3 text-xs text-fg-subtle">Post-money valuations reported with each round, log scale.</figcaption>
    </figure>
  );
}

/** The charts' table view: every round per company, side by side. */
export function RoundsTable({ items }: { items: { company: CompanySummary; rounds: RoundRow[] }[] }) {
  const rows = items
    .flatMap(({ company, rounds }, i) => rounds.map((r) => ({ r, company, i })))
    .sort((a, b) => a.r.date.localeCompare(b.r.date));
  if (!rows.length) return null;
  return (
    // A card per round in a narrow column (.tbl-cards), columns where they fit.
    <TableScroll label="Every round of the compared companies" className="tbl-cards tbl-hover">
      <table role="table">
        <caption className="sr-only">Every round of the compared companies, oldest first</caption>
        <thead role="rowgroup">
          <tr role="row">
            <th scope="col" role="columnheader">Date</th>
            <th scope="col" role="columnheader">Company</th>
            <th scope="col" role="columnheader">Round</th>
            <th scope="col" role="columnheader" className="num">Amount</th>
            <th scope="col" role="columnheader" className="num">Valuation</th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          {rows.map(({ r, company, i }) => (
            <tr key={r.id} role="row">
              <td role="cell" className="whitespace-nowrap font-mono text-xs leading-5 text-fg-muted">
                {formatDate(r.date)}
              </td>
              <td role="cell" data-label="Company" className="whitespace-nowrap">
                <span className="tbl-v flex items-center gap-2 text-fg">
                  <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${SERIES[i].bg}`} />
                  {company.name}
                </span>
              </td>
              <td role="cell" data-label="Round">
                <span className="tbl-v">
                  <a href={`/${r.company}#${r.id}`} className="text-fg hover:underline">
                    {r.round}
                  </a>
                  {r.stage !== "other" && !r.round.toLowerCase().startsWith(stageLabel(r.stage).toLowerCase()) && (
                    <span className="text-xs text-fg-subtle"> · {stageLabel(r.stage)}</span>
                  )}
                </span>
              </td>
              <td role="cell" data-label="Amount" className="num text-fg">
                <span className="tbl-v">{roundAmount(r)}</span>
              </td>
              <td role="cell" data-label="Valuation" className="num">
                <span className="tbl-v">{formatUsd(r.valuationUsd)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export function CompanyHeading({ c, i }: { c: CompanySummary; i: number }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CompanyMark logo={c.icon} dark={c.iconDark} name={c.name} size="sm" />
      <a href={`/${c.slug}`} className="truncate font-semibold text-fg hover:underline">
        {c.name}
      </a>
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${SERIES[i].bg}`} />
    </span>
  );
}
