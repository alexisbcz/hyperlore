import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { formatUsd } from "@/components/lore";
import { Page } from "@/components/page";
import { stageLabel } from "@/lib/directory";
import { archiveStats } from "@/lib/lore";
import { isLive } from "@/lib/store";
import { PanelSkeleton } from "@/components/skeletons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Archive statistics",
  description:
    "How much the Hyperlore archive holds: companies, sourced events, sources, quotes, funding rounds and the funding they disclose.",
  path: "/stats",
});

export default function StatsPage() {
  return (
    <Page width="wide">
      <h1 className="text-balance text-3xl font-semibold text-fg">Archive statistics</h1>
      <p className="mt-2 max-w-3xl text-pretty text-fg-muted">
        Counted from the records themselves, as they stand now. Funding totals add up only amounts the sources state in US dollars.
      </p>
      <Suspense fallback={<PanelSkeleton label="Loading numbers" height="h-64" />}>
        <Numbers />
      </Suspense>
    </Page>
  );
}

const n = (v: number) => v.toLocaleString("en");

function Tile({ label, value, note, href }: { label: string; value: string; note?: string; href?: string }) {
  const body = (
    <>
      <span className="block text-sm text-fg-muted">{label}</span>
      <span className="mt-1 block text-2xl font-semibold tabular-nums text-fg sm:text-3xl">{value}</span>
      {note && <span className="mt-1 block text-xs text-fg-subtle">{note}</span>}
    </>
  );
  return (
    <li className="bg-bg">
      {href ? (
        <Link href={href} className="block h-full p-4 transition-colors sm:p-5 hover:bg-bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
          {body}
        </Link>
      ) : (
        <div className="h-full p-4 sm:p-5">{body}</div>
      )}
    </li>
  );
}

// Live data renders per request; the snapshot once per deployment (prerendered at build).
async function Numbers() {
  if (!isLive()) return CachedNumbers();
  await connection();
  return NumbersBody();
}

async function CachedNumbers() {
  "use cache";
  cacheLife("max");
  return NumbersBody();
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
  return (
    <div className="mt-8 space-y-12">
      <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-3">
        <Tile label="Companies" value={n(s.companies)} href="/companies" note={`${n(s.fundedCompanies)} with funding rounds`} />
        <Tile label="Sourced events" value={n(s.events)} note="Each links to where it was found" />
        <Tile label="Sources" value={n(s.sources)} note="Tweets, videos, articles, archived pages" />
        <Tile label="Quotes" value={n(s.quotes)} note="Verbatim, linked to the moment said" />
        <Tile label="Funding rounds" value={n(s.rounds)} href="/rounds" note={`${n(s.valuations)} with a reported valuation`} />
        <Tile
          label="Funding tracked (USD)"
          value={formatUsd(s.totalUsd)}
          href="/rounds?sort=amount"
          note={`Across ${n(s.roundsUsd)} rounds stated in USD; secondaries and tenders excluded${s.roundsOtherCurrency ? `; ${n(s.roundsOtherCurrency)} rounds in other currencies not converted` : ""}`}
        />
      </ul>

      <section aria-labelledby="per-year-title">
        <h2 id="per-year-title" className="text-lg font-semibold text-fg">
          Funding rounds per year
        </h2>
        <p className="mb-4 mt-1 text-sm text-fg-subtle">Rounds on record by the year they were announced or closed.</p>
        <figure className="rounded-lg border border-border p-4 pt-7">
          <div className="relative ml-8 h-44">
            {[0, 0.5, 1].map((f) => (
              <div key={f} className="absolute inset-x-0 flex items-center" style={{ bottom: `${f * 100}%` }}>
                <span className="absolute -left-8 w-6 translate-y-1/2 text-right font-mono text-[11px] tabular-nums text-fg-subtle">{Math.round(f * max)}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            ))}
            <div className="absolute inset-0 flex items-end gap-0.5">
              {span.map((y) => {
                const h = (y.rounds / max) * 100;
                const x = (y.year - first) / Math.max(1, last - first);
                return (
                  <div key={y.year} className="group/bar relative flex h-full flex-1 items-end justify-center">
                    <Link
                      href={`/rounds?year_min=${y.year}&year_max=${y.year}`}
                      aria-label={`${y.year}: ${y.rounds} ${y.rounds === 1 ? "round" : "rounds"}${y.usd ? `, ${formatUsd(y.usd)} disclosed in USD` : ""}`}
                      className="flex h-full w-full items-end justify-center rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {y.rounds > 0 && <span className="w-full max-w-6 rounded-t bg-chart transition-opacity group-hover/bar:opacity-80" style={{ height: `max(${h}%, 2px)` }} />}
                    </Link>
                    {(y === peak || y.year === last) && y.rounds > 0 && (
                      <span className="pointer-events-none absolute -translate-y-1 font-mono text-[11px] tabular-nums text-fg-muted" style={{ bottom: `${h}%` }}>
                        {y.rounds}
                      </span>
                    )}
                    <span
                      role="tooltip"
                      className={`pointer-events-none absolute hidden bottom-full z-10 mb-1 w-max rounded-md border border-border bg-bg px-2.5 py-1.5 text-xs shadow-md transition-opacity starting:opacity-0 group-focus-within/bar:block group-hover/bar:block ${
                        x > 0.66 ? "right-0" : x < 0.33 ? "left-0" : "left-1/2 -translate-x-1/2"
                      }`}
                    >
                      <span className="block font-mono font-semibold tabular-nums text-fg">
                        {y.rounds} {y.rounds === 1 ? "round" : "rounds"}
                      </span>
                      <span className="text-fg-subtle">
                        {y.year}
                        {y.usd ? ` · ${formatUsd(y.usd)} in USD` : ""}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div aria-hidden="true" className="ml-8 mt-2 flex gap-0.5">
            {span.map((y) => (
              <span key={y.year} className="flex-1 text-center font-mono text-[11px] tabular-nums text-fg-subtle">
                {(y.year - first) % every === 0 ? `’${String(y.year).slice(2)}` : ""}
              </span>
            ))}
          </div>
          <figcaption className="sr-only">Number of funding rounds per year; the table below lists rounds by stage.</figcaption>
        </figure>
      </section>

      <section aria-labelledby="stage-title">
        <h2 id="stage-title" className="mb-4 text-lg font-semibold text-fg">
          Rounds by stage
        </h2>
        <ul className="grid gap-x-8 sm:grid-cols-2">
          {s.byStage.map((x) => (
            <li key={x.stage} className="border-b border-border text-sm">
              {/* The whole row is the link: a 40px target on phones. */}
              <Link href={`/rounds?stage=${x.stage}`} className="group/stage flex min-h-10 items-center justify-between gap-4 py-2 focus-visible:outline-2 focus-visible:outline-accent">
                <span className="text-fg group-hover/stage:underline">{stageLabel(x.stage)}</span>
                <span className="tabular-nums text-fg-muted">{n(x.count)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
