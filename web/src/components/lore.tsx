// Presentational lore components. No hooks, so they render in server pages and inside
// client components (the timeline filters, the chat drawing the agent's tool results).
import Link from "next/link";
import { SourceIcon } from "./icons";
import { LogoImg } from "./logo-img";
import { isSecondaryStage, slugifyName, stageLabel, stageOf } from "@/lib/directory";
import { SOURCE_LABELS, formatDate } from "@/lib/format";
import type { FundingRound, Logo, LoreEvent, Mark, Photo, Quote, SourceInfo, SourceRef } from "@/lib/types";
import { type CardPlacement, type CiteCardData, CiteHover, CiteMark } from "./cite-card";
import { withBase } from "@/lib/base";

export { SOURCE_LABELS, formatDate };


const KIND_LABELS: Record<string, string> = {
  "open-source": "Open source",
  founding: "Founding",
  funding: "Funding",
  rename: "Rename",
  domain: "Domain",
  logo: "Logo",
  rebrand: "Rebrand",
  product: "Product",
  launch: "Launch",
  acquisition: "Acquisition",
  acquired: "Acquired",
  hire: "Hire",
  departure: "Departure",
  event: "Event",
  conference: "Conference",
  milestone: "Milestone",
  pivot: "Pivot",
  office: "Office",
  controversy: "Controversy",
  partnership: "Partnership",
  pricing: "Pricing",
  outage: "Outage",
  layoff: "Layoff",
  other: "Other",
};

// Own keys only: a URL can carry "constructor" or "toString", which every object inherits.
export const kindLabel = (kind: string) => (Object.hasOwn(KIND_LABELS, kind) ? KIND_LABELS[kind] : kind);

export function formatUsd(n?: number) {
  if (!n) return "—";
  if (n >= 1e12) return `$${+(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${+(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${+(n / 1e6).toFixed(1)}M`;
  return `$${Math.round(n / 1e3)}K`;
}

const CURRENCY_SIGNS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹", BRL: "R$" };

/** An amount in its own currency ("€40M", "NOK 120M"), for rounds the sources only state in that currency. */
export function formatMoney(n: number | undefined, currency = "USD") {
  if (!n) return "—";
  const sign = CURRENCY_SIGNS[currency];
  const v = n >= 1e12 ? `${+(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `${+(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : `${Math.round(n / 1e3)}K`;
  return sign ? `${sign}${v}` : `${currency} ${v}`;
}

/** A round's amount: USD when stated, else the stated currency (never converted). */
export const roundAmount = (r: { amountUsd?: number; amount?: number; currency?: string }) =>
  r.amountUsd ? formatUsd(r.amountUsd) : r.amount && r.currency ? formatMoney(r.amount, r.currency) : "—";


/** Tile behind a logo: white for dark marks, near-black for white marks, and theme-following
 *  when a white-on-dark twin exists (the twin swaps in under the dark theme). */
export const logoTile = (logo: Mark, twin?: Mark) =>
  logo.variant === "dark" ? "bg-neutral-900" : twin ? "bg-white dark:bg-neutral-900" : "bg-white";

export function CompanyMark({
  logo,
  dark,
  name,
  size = "md",
}: {
  logo?: Mark;
  /** White-on-dark twin of `logo`, shown in the dark theme. */
  dark?: Mark;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const box = { sm: "size-6 rounded-md", md: "size-10 rounded-lg", lg: "size-14 rounded-xl" }[size];
  const twin = logo?.variant !== "dark" ? dark : undefined;
  // Styles in globals.css (.mark…): company lists repeat this for every row.
  return (
    <span className={`mark ${box} ${!logo ? "bg-bg-subtle" : logoTile(logo, twin)}`}>
      {logo ? (
        <>
          {/* The tile is colored for the logo; a missing file falls back to the neutral initial. */}
          <LogoImg src={logo.src} className={twin ? "dark:hidden" : undefined} initial={name[0]} />
          {twin && <LogoImg src={twin.src} className="hidden dark:block" />}
        </>
      ) : (
        <span aria-hidden="true" className="text-sm font-semibold text-fg-muted">
          {name[0]}
        </span>
      )}
    </span>
  );
}

export function Avatar({ photo, name, size = "md" }: { photo?: Photo; name: string; size?: "xs" | "sm" | "md" | "lg" }) {
  const box = { xs: "size-5 text-[9px]", sm: "size-7 text-[11px]", md: "size-10 text-sm", lg: "size-20 text-2xl" }[size];
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={withBase(photo.src)} alt="" className={`${box} shrink-0 rounded-full border border-border object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${box} flex shrink-0 items-center justify-center rounded-full border border-border bg-bg-subtle font-medium text-fg-muted`}>
      {initials}
    </span>
  );
}

export function SourceChip({ source }: { source: SourceRef }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      // The quote itself is in the event's "what the sources say" list.
      title={source.title ?? source.url}
      className="chip"
    >
      <SourceIcon type={source.type} />
      <span className="sr-only">{SOURCE_LABELS[source.type] ?? source.type}: </span>
      <span className="truncate">{source.host}</span>
    </a>
  );
}

/** A source's hover card, trimmed to what it can show (the title clamps at 2 lines, the text at 3). */
export function citeCard(source: SourceInfo, quote?: string): CiteCardData {
  const text = quote ?? source.excerpt;
  return {
    type: source.type,
    host: source.host,
    publishedAt: source.publishedAt,
    title: source.title?.slice(0, 120),
    text: text?.slice(0, 160),
    quoted: quote ? true : undefined,
  };
}

/** Superscript citation with a hover/focus card; the link jumps to the numbered reference. */
export function Cite({ n, source }: { n: number; source?: SourceInfo }) {
  return <CiteMark n={n} card={source && citeCard(source)} />;
}

/** A source registered in the archive, or the bare URL when it was never registered. */
export function sourceInfo(url: string, sources?: Record<string, SourceInfo>, ref?: Partial<SourceRef>): SourceInfo {
  const known = sources?.[url];
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {}
  return known ?? { url, host, type: ref?.type ?? (/wikipedia\.org/.test(host) ? "wikipedia" : /archive\.org/.test(host) ? "wayback" : "website"), title: ref?.title, publishedAt: ref?.publishedAt };
}

/**
 * Citation for a single fact outside the prose (infobox values, funding rows): a small source mark
 * that opens the source itself, with the same hover/focus card as the overview's numbered citations.
 */
export function SourceCite({
  source,
  quote,
  label,
  side = "top",
  align = "end",
  narrow,
}: { source: SourceInfo; quote?: string; label?: string } & CardPlacement) {
  const name = SOURCE_LABELS[source.type] ?? source.type;
  return (
    <CiteHover card={citeCard(source, quote)} side={side} align={align} narrow={narrow} className="group/cite relative inline-flex align-middle">
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Source${label ? ` for ${label}` : ""}: ${source.title ? `${source.title}, ` : ""}${name}, ${source.host} (opens in a new tab)`}
        className="cite-src"
      >
        <SourceIcon type={source.type} />
      </a>
    </CiteHover>
  );
}

export function EventItem({ event, showCompany, headingLevel = 4 }: { event: LoreEvent; showCompany?: string; headingLevel?: 3 | 4 }) {
  const Title = headingLevel === 3 ? "h3" : "h4";
  const quoted = event.sources.filter((s) => s.quote);
  const chips = [...new Map(event.sources.map((s) => [s.url, s])).values()];
  return (
    // Styles in globals.css (.ev…): this markup repeats for every event on a page.
    <article id={event.id} className="ev">
      <span aria-hidden="true" className="ev-dot" />
      <div className="ev-meta">
        <time>{formatDate(event.date)}</time>
        <span aria-hidden="true">·</span>
        <span>{kindLabel(event.kind)}</span>
        {showCompany && (
          <>
            <span aria-hidden="true">·</span>
            <Link href={`/${event.company}`} className="text-fg-muted hover:text-fg">
              {showCompany}
            </Link>
          </>
        )}
        {event.confidence === "inferred" && (
          <span
            title="Deduced from the sources rather than stated by them"
            className="rounded border border-dashed border-border-strong px-1 text-[11px]"
          >
            inferred
          </span>
        )}
      </div>
      <Title className="ev-title">{event.title}</Title>
      {event.summary && <p className="ev-summary">{event.summary}</p>}
      {quoted.length > 0 && (
        <details className="ev-quotes">
          <summary>
            <span className="ev-show">Show what the sources say ({quoted.length})</span>
            <span className="ev-hide">Hide what the sources say</span>
          </summary>
          <ul>
            {quoted.map((s, i) => (
              <li key={i}>
                <q>{s.quote}</q>{" "}
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.host}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="ev-sources">
        {chips.map((s) => (
          <SourceChip key={s.url} source={s} />
        ))}
        <Link href={`/correct?${new URLSearchParams({ event: event.id, about: `${event.title} (${event.date})`, page: `/${event.company}` })}`} className="ev-fix">
          Suggest a correction
        </Link>
      </div>
    </article>
  );
}

/** `headingLevel`: 4 under a year heading (timeline), 3 directly under a section h2. */
export function EventList({ events, companyNames, headingLevel }: { events: LoreEvent[]; companyNames?: Record<string, string>; headingLevel?: 3 | 4 }) {
  if (!events.length) return <p className="text-sm text-fg-subtle">Nothing on record for that.</p>;
  return (
    <div className="relative">
      <span aria-hidden="true" className="absolute bottom-2 left-[3.5px] top-2 w-px bg-border" />
      {events.map((e) => (
        <EventItem key={e.id} event={e} showCompany={companyNames?.[e.company]} headingLevel={headingLevel} />
      ))}
    </div>
  );
}

/** Column chart of rounds in order; a single series, so the section title names it and no legend is drawn. */
export function FundingChart({ rounds }: { rounds: FundingRound[] }) {
  const sized = rounds.filter((r) => r.amountUsd);
  if (sized.length < 2) return null;
  const max = Math.max(...sized.map((r) => r.amountUsd!));
  const step = [1e6, 2e6, 5e6, 1e7, 2e7, 5e7, 1e8, 2e8, 5e8, 1e9, 2e9, 5e9].find((s) => max / s <= 4) ?? 1e10;
  const top = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const largest = sized.reduce((a, b) => (b.amountUsd! > a.amountUsd! ? b : a));
  const labelled = new Set([sized.indexOf(largest), sized.length - 1]);
  return (
    <figure className="rounded-lg border border-border p-4">
      <div className="relative h-48">
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="w-12 shrink-0 translate-y-1/2 text-right font-mono text-[11px] tabular-nums text-fg-subtle">
              {t === 0 ? "0" : formatUsd(t)}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-14 right-0 flex items-end justify-around gap-0.5">
          {sized.map((r, i) => {
            const h = (r.amountUsd! / top) * 100;
            return (
              <div key={r.date + r.round} className="group/bar relative flex h-full flex-1 items-end justify-center">
                <button
                  type="button"
                  aria-label={`${r.round}, ${formatDate(r.date)}: ${formatUsd(r.amountUsd)}`}
                  className="flex h-full w-full items-end justify-center outline-none"
                >
                  <span
                    className="w-full max-w-6 rounded-t bg-chart transition-opacity group-hover/bar:opacity-80"
                    style={{ height: `max(${h}%, 2px)` }}
                  />
                </button>
                {labelled.has(i) && (
                  <span
                    className="pointer-events-none absolute -translate-y-1.5 whitespace-nowrap font-mono text-[11px] tabular-nums text-fg-muted"
                    style={{ bottom: `${h}%` }}
                  >
                    {formatUsd(r.amountUsd)}
                  </span>
                )}
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute hidden bottom-full z-10 mb-1 w-max max-w-56 rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs shadow-md transition-opacity starting:opacity-0 group-focus-within/bar:block group-hover/bar:block ${
                    i >= (sized.length * 2) / 3 ? "right-0" : i < sized.length / 3 ? "left-0" : "left-1/2 -translate-x-1/2"
                  }`}
                >
                  <span className="block font-mono font-semibold tabular-nums text-fg">{formatUsd(r.amountUsd)}</span>
                  <span className="text-fg-subtle">
                    {r.round} · {formatDate(r.date)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="ml-14 mt-2 flex justify-around gap-0.5">
        {sized.map((r) => (
          <span key={r.date + r.round} className="flex-1 truncate text-center text-[11px] text-fg-subtle">
            {r.round.replace(/^Series /, "")}
            {/* Two-digit years fit under a bar even when a dozen rounds share a phone-width chart. */}
            <span className="block font-mono tabular-nums">’{r.date.slice(2, 4)}</span>
          </span>
        ))}
      </div>
      <figcaption className="sr-only">Amount raised per disclosed round. The table below lists every round.</figcaption>
    </figure>
  );
}

const isSecondary = (r: FundingRound) => isSecondaryStage(stageOf(r));

/** A round's normalised stage when it says more than the round's own name ("Seed extension" → Seed). */
function stageNote(r: FundingRound) {
  const stage = stageOf(r);
  const label = stageLabel(stage);
  return stage === "other" || r.round.toLowerCase().startsWith(label.toLowerCase()) ? undefined : label;
}

export function InvestorLinks({ names, slugs, lead }: { names: string[]; slugs?: Record<string, string>; lead?: boolean }) {
  return names.map((n, i) => (
    <span key={n}>
      {i > 0 && ", "}
      <Link
        href={`/investors/${slugs?.[n] ?? slugifyName(n)}`}
        className={lead ? "link-u font-medium text-fg" : "link-u"}
      >
        {n}
      </Link>
    </span>
  ));
}

const SHOWN_INVESTORS = 5;

export function RoundInvestors({ r }: { r: FundingRound }) {
  const others = r.investors.filter((n) => !r.leads.includes(n));
  if (!r.leads.length && !others.length) return <span className="text-fg-subtle">—</span>;
  return (
    <span className="block space-y-0.5 text-fg-muted">
      {r.leads.length > 0 && (
        <span className="block">
          <span className="text-fg-subtle">Led by </span>
          <InvestorLinks names={r.leads} slugs={r.investorSlugs} lead />
        </span>
      )}
      {others.length > 0 && (
        <span className="block">
          <span className="text-fg-subtle">{r.leads.length ? "With " : ""}</span>
          <InvestorLinks names={others.slice(0, SHOWN_INVESTORS)} slugs={r.investorSlugs} />
          {others.length > SHOWN_INVESTORS && (
            <details className="group/more inline">
              <summary className="ml-1 inline cursor-pointer list-none whitespace-nowrap text-xs text-fg-subtle hover:text-fg group-open/more:hidden">
                +{others.length - SHOWN_INVESTORS} more
              </summary>
              <span>
                , <InvestorLinks names={others.slice(SHOWN_INVESTORS)} slugs={r.investorSlugs} />
              </span>
            </details>
          )}
        </span>
      )}
    </span>
  );
}

export function RoundSources({ r, sources, align }: { r: FundingRound; sources?: Record<string, SourceInfo>; align: "start" | "end" }) {
  const unique = [...new Map(r.sources.map((s) => [s.url, s])).values()].slice(0, 4);
  return (
    // On touch screens each mark is a 40px target; the negative margin keeps the row's height.
    <span className={`flex gap-0.5 pointer-coarse:-my-2.5 pointer-coarse:gap-0 pointer-coarse:[&_.cite-src]:size-10 ${align === "end" ? "justify-end pointer-coarse:-mr-2.5" : "flex-wrap"}`}>
      {unique.map((s) => (
        <SourceCite key={s.url} source={sourceInfo(s.url, sources, s)} quote={s.quote} label={`${r.round}, ${formatDate(r.date)}`} align={align} />
      ))}
    </span>
  );
}

/**
 * Every round: date, stage, amount, valuation, lead and other investors (linked), and the sources
 * with hover cards. Columns where there is room for them, stacked rows where there isn't.
 */
export function FundingTable({ rounds, sources }: { rounds: FundingRound[]; sources?: Record<string, SourceInfo> }) {
  if (!rounds.length) return <p className="text-sm text-fg-subtle">No funding rounds on record.</p>;
  const primary = rounds.filter((r) => !isSecondary(r)).reduce((sum, r) => sum + (r.amountUsd ?? 0), 0);
  const hasSecondary = rounds.some((r) => isSecondary(r) && r.amountUsd);
  const native = rounds.some((r) => !r.amountUsd && r.amount && r.currency && !isSecondary(r));
  const totalLabel = [
    native ? "Total disclosed in USD" : "Total disclosed",
    hasSecondary && "excluding secondary sales",
    native && "rounds stated in other currencies not converted or counted",
  ]
    .filter(Boolean)
    .join(", ");
  return (
    // One markup for every width (a list and a table doubled the section): .fund-row in globals.css.
    <div className="@container">
      <div className="rounded-lg border border-border text-sm">
        <div className="fund-row hidden rounded-t-lg border-b border-border bg-bg-subtle px-3 py-2 text-xs font-medium text-fg-subtle @2xl:grid">
          <span className="[grid-area:date]">Date</span>
          <span className="[grid-area:round]">Round</span>
          <span className="text-right [grid-area:amount]">Amount</span>
          <span className="text-right [grid-area:valuation]">Valuation</span>
          <span className="[grid-area:investors]">Investors</span>
          <span className="sr-only [grid-area:sources]">Sources</span>
        </div>
        <ol className="divide-y divide-border">
          {rounds.map((r) => (
            <li key={r.date + r.round} className="fund-row px-4 py-3 @2xl:px-3 @2xl:py-2.5">
              <span className="font-mono text-xs tabular-nums text-fg-subtle [grid-area:date] @2xl:pt-0.5 @2xl:text-fg-muted">{formatDate(r.date)}</span>
              <span className="min-w-0 [grid-area:round]">
                <span className="font-medium text-fg">{r.round}</span>
                {stageNote(r) && <span className="block text-xs text-fg-subtle">{stageNote(r)}</span>}
              </span>
              <span className="text-right font-medium tabular-nums text-fg [grid-area:amount]">
                {r.amountUsd || (r.amount && r.currency) ? (
                  roundAmount(r)
                ) : (
                  <>
                    <span className="text-xs font-normal text-fg-subtle @2xl:hidden">Undisclosed</span>
                    <span className="hidden font-normal text-fg-subtle @2xl:inline">—</span>
                  </>
                )}
              </span>
              <span className="text-right text-xs tabular-nums text-fg-subtle [grid-area:valuation] @2xl:text-sm @2xl:text-fg-muted">
                {r.valuationUsd ? (
                  <>
                    <span className="@2xl:hidden">at </span>
                    {formatUsd(r.valuationUsd)}
                  </>
                ) : (
                  <span className="hidden @2xl:inline">—</span>
                )}
              </span>
              <span className="min-w-0 [grid-area:investors] @2xl:text-[13px]">
                <RoundInvestors r={r} />
              </span>
              <span className="[grid-area:sources] @2xl:-my-0.5 @2xl:flex @2xl:justify-end">
                <RoundSources r={r} sources={sources} align="end" />
              </span>
            </li>
          ))}
        </ol>
        <div className="flex justify-between gap-3 rounded-b-lg border-t border-border bg-bg-subtle px-4 py-2 text-xs @2xl:px-3">
          <span className="text-fg-subtle">{totalLabel}</span>
          <span className="shrink-0 font-semibold tabular-nums text-fg">{formatUsd(primary)}</span>
        </div>
      </div>
    </div>
  );
}

const toYear = (date: string) => {
  const [y, m = 1, d = 1] = date.split("-").map(Number);
  return y + (m - 1) / 12 + (d - 1) / 365;
};

/**
 * Capital raised to date: a step line over time, one marker per sized primary round (secondary
 * sales move no money into the company). A single series, so no legend; the final total is labelled.
 */
export function CumulativeChart({ rounds }: { rounds: FundingRound[] }) {
  const sized = rounds.filter((r) => r.amountUsd && !isSecondary(r)).sort((a, b) => a.date.localeCompare(b.date));
  if (sized.length < 2) return null;
  let sum = 0;
  const points = sized.map((r) => ({ r, total: (sum += r.amountUsd!), t: toYear(r.date) }));
  const t0 = Math.floor(points[0].t);
  const t1 = Math.max(Math.ceil(points.at(-1)!.t + 0.01), t0 + 1);
  const step = [1e6, 2e6, 5e6, 1e7, 2e7, 5e7, 1e8, 2e8, 5e8, 1e9, 2e9, 5e9].find((s) => sum / s <= 4) ?? 1e10;
  const top = Math.ceil(sum / step) * step;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const x = (t: number) => ((t - t0) / (t1 - t0)) * 100;
  const y = (v: number) => 100 - (v / top) * 100;
  const span = t1 - t0;
  const every = span <= 5 ? 1 : span <= 10 ? 2 : span <= 20 ? 4 : 5;
  const years = Array.from({ length: span + 1 }, (_, i) => t0 + i).filter((yr) => (yr - t0) % every === 0);
  // Step-after: the total holds until the next round closes.
  let d = `M ${x(points[0].t)} 100`;
  for (const p of points) d += ` H ${x(p.t)} V ${y(p.total)}`;
  d += ` H 100`;
  const area = `${d} V 100 Z`;
  const last = points.at(-1)!;
  return (
    <figure className="rounded-lg border border-border p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-3 text-xs text-fg-subtle">
        <span className="font-medium text-fg-muted">Raised to date</span>
        <span>primary rounds with a disclosed amount</span>
      </figcaption>
      <div className="relative h-40">
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(t / top) * 100}%` }}>
            <span className="w-12 shrink-0 translate-y-1/2 text-right font-mono text-[11px] tabular-nums text-fg-subtle">
              {t === 0 ? "0" : formatUsd(t)}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
        ))}
        <div className="absolute inset-y-0 left-14 right-1">
          <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <path d={area} className="fill-chart opacity-10" />
            <path d={d} fill="none" vectorEffect="non-scaling-stroke" strokeWidth={2} strokeLinejoin="round" className="stroke-chart" />
          </svg>
          {points.map((p, i) => {
            const px = x(p.t);
            const tip = px > 66 ? "right-0" : px < 33 ? "left-0" : "left-1/2 -translate-x-1/2";
            return (
              <div
                key={p.r.date + p.r.round}
                className="group/pt absolute size-0"
                style={{ left: `${px}%`, bottom: `${100 - y(p.total)}%` }}
              >
                <button
                  type="button"
                  aria-label={`${formatDate(p.r.date)}, ${p.r.round} of ${formatUsd(p.r.amountUsd)}: ${formatUsd(p.total)} raised to date`}
                  className="absolute -left-3 -top-3 flex size-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <span className="size-2.5 rounded-full bg-chart ring-2 ring-bg transition-transform group-hover/pt:scale-125" />
                </button>
                {i === points.length - 1 && (
                  <span className="pointer-events-none absolute bottom-2 right-1 whitespace-nowrap font-mono text-[11px] font-medium tabular-nums text-fg-muted">
                    {formatUsd(last.total)}
                  </span>
                )}
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute hidden bottom-4 z-10 w-max max-w-56 rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs shadow-md transition-opacity starting:opacity-0 group-focus-within/pt:block group-hover/pt:block ${tip}`}
                >
                  <span className="block font-mono font-semibold tabular-nums text-fg">{formatUsd(p.total)} to date</span>
                  <span className="text-fg-subtle">
                    +{formatUsd(p.r.amountUsd)} · {p.r.round} · {formatDate(p.r.date)}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="relative ml-14 mr-1 mt-2 h-4">
        {years.map((yr) => (
          <span
            key={yr}
            className="absolute -translate-x-1/2 font-mono text-[11px] tabular-nums text-fg-subtle first:translate-x-0"
            style={{ left: `${x(yr)}%` }}
          >
            {yr}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function QuoteCard({ quote, showCompany, photo }: { quote: Quote; showCompany?: string; photo?: Photo }) {
  return (
    <figure className="flex h-full flex-col justify-between rounded-lg border border-border p-4">
      <blockquote className="text-pretty text-[15px] leading-relaxed text-fg">“{quote.text}”</blockquote>
      <figcaption className="mt-4 text-xs text-fg-subtle">
        <span className="flex items-center gap-2">
          <Avatar photo={photo} name={quote.person} size="sm" />
          <span>
            <span className="font-medium text-fg">{quote.person}</span>
            {showCompany && <span> · {showCompany}</span>}
            {quote.date && <span className="tabular-nums"> · {formatDate(quote.date)}</span>}
          </span>
        </span>
        {quote.context && <span className="mt-1 block text-pretty leading-relaxed">{quote.context}</span>}
        <a href={quote.link} target="_blank" rel="noreferrer" className="mt-2 inline-block text-accent hover:underline">
          {quote.link.includes("t=") ? "Hear it at the timestamp ↗" : "Source ↗"}
        </a>
      </figcaption>
    </figure>
  );
}

export function QuoteGrid({
  quotes,
  companyNames,
  photos,
}: {
  quotes: Quote[];
  companyNames?: Record<string, string>;
  photos?: Record<string, Photo>;
}) {
  if (!quotes.length) return <p className="text-sm text-fg-subtle">No quotes on record for that.</p>;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {quotes.map((q) => (
        <QuoteCard key={q.id} quote={q} showCompany={companyNames?.[q.company]} photo={photos?.[q.person.toLowerCase()]} />
      ))}
    </div>
  );
}

export function LogoStrip({ logos }: { logos: Logo[] }) {
  if (!logos.length) return <p className="text-sm text-fg-subtle">No logos archived yet.</p>;
  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-2">
      {logos.map((l) => (
        <a
          key={l.id}
          href={l.sourceUrl}
          target="_blank"
          rel="noreferrer"
          title={l.description}
          className="flex w-40 shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-border transition-colors hover:border-border-strong"
        >
          <span className={`flex h-24 items-center justify-center p-4 ${l.variant === "dark" ? "bg-neutral-900" : "bg-white"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={withBase(l.src)} alt={l.description ?? `${l.company} logo`} className="max-h-14 max-w-full object-contain" />
          </span>
          <span className="border-t border-border px-3 py-2 text-xs text-fg-subtle">
            <span className="tabular-nums">{formatDate(l.date)}</span> · {l.kind}
          </span>
        </a>
      ))}
    </div>
  );
}
