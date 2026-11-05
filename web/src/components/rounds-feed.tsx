"use client";

import { Flag } from "./flag";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Download } from "lucide-react";
import { STAGES, stageLabel } from "@/lib/directory";
import {
  ROUND_SORTS,
  ROUNDS_PAGE,
  type RoundFacet,
  type RoundFilters,
  type RoundSortKey,
  clearRoundFilters,
  filterRounds,
  nextRoundSort,
  parseRoundFilters,
  roundChips,
  roundFacetCounts,
  roundFacetValues,
  roundLabeler,
  roundTotals,
  roundsCsv,
  serializeRoundFilters,
  sortRounds,
} from "@/lib/rounds";
import type { RoundRow } from "@/lib/types";
import { ActiveFilters, BUTTON, CopyLinkButton, FacetGroup, type FacetOption, FilterSheet, RangeGroup, SearchInput, ListLoading, toggle, type UrlState, useFullList, WithUrlState } from "./filters";
import { CompanyMark, RoundInvestors, RoundSources, formatDate, formatUsd, roundAmount } from "./lore";

const PAGE = ROUNDS_PAGE;

function SortButton({ k, label, f, onSort, right }: { k: RoundSortKey; label: string; f: RoundFilters; onSort: (k: RoundSortKey) => void; right?: boolean }) {
  const active = f.sort === k;
  return (
    <button
      type="button"
      onClick={() => onSort(k)}
      aria-label={`Sort by ${label.toLowerCase()}${active ? (f.dir === "asc" ? ", ascending" : ", descending") : ""}`}
      className={`inline-flex items-center gap-1 rounded hover:text-fg focus-visible:outline-2 focus-visible:outline-accent ${right ? "justify-self-end" : ""} ${active ? "text-fg" : ""}`}
    >
      {label}
      {active ? (
        f.dir === "asc" ? (
          <ArrowUp aria-hidden="true" className="size-3" />
        ) : (
          <ArrowDown aria-hidden="true" className="size-3" />
        )
      ) : (
        <ChevronsUpDown aria-hidden="true" className="size-3 opacity-40" />
      )}
    </button>
  );
}

/** The stated amount; a non-USD figure is shown as stated, with a hint that it was not converted. */
function Amount({ r }: { r: RoundRow }) {
  if (!r.amountUsd && r.amount && r.currency)
    return (
      <span title={`As stated by the source (${r.currency}); not converted to USD`} className="text-fg-muted">
        {roundAmount(r)}
      </span>
    );
  return r.amountUsd ? <>{formatUsd(r.amountUsd)}</> : <span className="text-fg-subtle">—</span>;
}

function Company({ r }: { r: RoundRow }) {
  return (
    <Link href={`/${r.company}`} className="flex min-w-0 items-center gap-2 rounded font-medium text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent">
      <CompanyMark logo={r.icon} dark={r.iconDark} name={r.companyName} size="sm" />
      <span className="truncate">{r.companyName}</span>
      <Flag code={r.country} className="shrink-0" />
    </Link>
  );
}

/** The round's own name, and its stage when the name doesn't already say it. */
function Round({ r }: { r: RoundRow }) {
  const stage = stageLabel(r.stage);
  return (
    <>
      <Link href={`/${r.company}#${r.id}`} className="text-fg hover:underline">
        {r.round}
      </Link>
      {!r.round.toLowerCase().startsWith(stage.toLowerCase()) && r.stage !== "other" && <span className="block text-xs text-fg-subtle">{stage}</span>}
    </>
  );
}

// One markup for every width (rendering a table and a list doubled the page): .round-row in
// globals.css, a stacked card on phones and a row of columns once the results column is wide enough.

function Rows({ rows, f, onSort }: { rows: RoundRow[]; f: RoundFilters; onSort: (k: RoundSortKey) => void }) {
  return (
    <div className="rounded-lg border border-border">
      <div className={`round-row hidden rounded-t-lg border-b border-border bg-bg-subtle px-3 py-2 text-xs font-medium text-fg-subtle @3xl:grid`}>
        <span className="[grid-area:date]">
          <SortButton k="date" label="Date" f={f} onSort={onSort} />
        </span>
        <span className="[grid-area:company]">
          <SortButton k="company" label="Company" f={f} onSort={onSort} />
        </span>
        <span className="[grid-area:round]">
          <SortButton k="stage" label="Round" f={f} onSort={onSort} />
        </span>
        <span className="text-right [grid-area:amount]">
          <SortButton k="amount" label="Amount" f={f} onSort={onSort} right />
        </span>
        <span className="text-right [grid-area:valuation]">
          <SortButton k="valuation" label="Valuation" f={f} onSort={onSort} right />
        </span>
        <span className="[grid-area:investors]">Investors</span>
        <span className="sr-only [grid-area:sources]">Sources</span>
      </div>
      <ol className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="round-row px-4 py-3 text-sm hover:bg-bg-subtle @3xl:px-3 @3xl:py-2.5">
            <span className="min-w-0 [grid-area:company]">
              <Company r={r} />
            </span>
            <span className="font-mono text-xs tabular-nums text-fg-subtle [grid-area:date] @3xl:pt-1 @3xl:text-fg-muted">{formatDate(r.date)}</span>
            <span className="min-w-0 [grid-area:round] @3xl:pt-0.5">
              <Round r={r} />
            </span>
            <span className="text-right font-medium tabular-nums text-fg [grid-area:amount] @3xl:pt-0.5">
              <Amount r={r} />
            </span>
            <span className="text-right text-xs tabular-nums text-fg-subtle [grid-area:valuation] @3xl:pt-0.5 @3xl:text-sm @3xl:text-fg-muted">
              {r.valuationUsd ? (
                <>
                  <span className="@3xl:hidden">at </span>
                  {formatUsd(r.valuationUsd)}
                </>
              ) : (
                <span className="hidden @3xl:inline">—</span>
              )}
            </span>
            <span className="min-w-0 text-[13px] [grid-area:investors] @3xl:pt-0.5">
              <RoundInvestors r={r} />
            </span>
            <span className="[grid-area:sources] @3xl:flex @3xl:justify-end">
              <RoundSources r={r} align="end" />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

type Totals = ReturnType<typeof roundTotals>;

/**
 * The page renders the newest rounds (`initial`) with totals for the whole archive; every round, which
 * the filters, sorts and CSV work on, is fetched from `src` once the page has loaded. Shipping all of
 * them in the page made its HTML weigh over a megabyte.
 */
export function RoundsFeed({ initial, total, totals, src }: { initial: RoundRow[]; total: number; totals: Totals; src: string }) {
  const { items: rounds, failed, retry } = useFullList<RoundRow>(undefined, src);
  return (
    <WithUrlState parse={parseRoundFilters} serialize={serializeRoundFilters}>
      {(state) => <Feed rounds={rounds} initial={initial} total={total} totals={totals} failed={failed} retry={retry} state={state} />}
    </WithUrlState>
  );
}

function Feed({
  rounds,
  initial,
  total,
  totals: allTotals,
  failed,
  retry,
  state: [f, setF],
}: {
  rounds: RoundRow[] | null;
  initial: RoundRow[];
  total: number;
  totals: Totals;
  failed: boolean;
  retry: () => void;
  state: UrlState<RoundFilters>;
}) {
  const [shown, setShown] = useState(PAGE);
  const update = (patch: Partial<RoundFilters>, opts?: { replace?: boolean }) => {
    setShown(PAGE);
    setF({ ...f, ...patch }, opts);
  };
  const typing = { replace: true };
  // Until every round has arrived, the unfiltered view is the newest rounds the page came with; any
  // other view waits for the full list.
  const ready = rounds !== null;
  const pristine = serializeRoundFilters(f) === "";
  const known = rounds ?? initial;
  const label = useMemo(() => roundLabeler(known), [known]);

  const rows = useMemo(() => (rounds ? sortRounds(filterRounds(rounds, f), f.sort, f.dir) : pristine ? initial : []), [rounds, initial, pristine, f]);
  const count = ready ? rows.length : pristine ? total : 0;
  const totals = ready ? roundTotals(rows) : allTotals;
  const chips = roundChips(f, label).map((c) => ({ key: c.key, label: c.label, onRemove: () => update(c.remove(f)) }));

  const options = (facet: RoundFacet, order?: string[]): FacetOption[] => {
    const all = rounds ?? [];
    const counts = roundFacetCounts(all, f, facet);
    const values = new Set([...all.flatMap((r) => roundFacetValues(r, facet)), ...f[facet]]);
    const list = [...values].map((value) => ({ value, label: label(facet, value), count: counts.get(value) ?? 0 }));
    return order
      ? list.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
      : list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };
  const onSort = (k: RoundSortKey) => update(nextRoundSort(f, k));

  const download = () => {
    const blob = new Blob([roundsCsv(rows, window.location.origin)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hyperlore-rounds-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const loading = <ListLoading failed={failed} retry={retry} label="Loading filters" />;

  const panel = !ready ? (
    loading
  ) : (
    <div>
      <FacetGroup title="Stage" options={options("stage", STAGES.map((s) => s.id))} selected={f.stage} onToggle={(v) => update({ stage: toggle(f.stage, v) })} limit={8} />
      <RangeGroup title="Year" min={f.yearMin} max={f.yearMax} onChange={(yearMin, yearMax) => update({ yearMin, yearMax }, typing)} placeholder={["From", "To"]} />
      <RangeGroup title="Amount" unit="$M, stated in USD" min={f.amountMin} max={f.amountMax} onChange={(amountMin, amountMax) => update({ amountMin, amountMax }, typing)} />
      <FacetGroup title="Led by" options={options("led")} selected={f.led} onToggle={(v) => update({ led: toggle(f.led, v) })} limit={6} />
      <FacetGroup title="Investor" options={options("investor")} selected={f.investor} onToggle={(v) => update({ investor: toggle(f.investor, v) })} limit={6} defaultOpen={false} />
      <FacetGroup
        title="Category"
        options={options("category")}
        selected={f.category}
        onToggle={(v) => update({ category: toggle(f.category, v) })}
        empty="Categories appear as company profiles are filled in."
      />
      <FacetGroup flags title="Country" options={options("country")} selected={f.country} onToggle={(v) => update({ country: toggle(f.country, v) })} limit={5} />
      <FacetGroup title="Company" options={options("company")} selected={f.company} onToggle={(v) => update({ company: toggle(f.company, v) })} limit={5} defaultOpen={false} />
    </div>
  );

  return (
    <div className="mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-(--sticky-top) max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1">{panel}</div>
      </aside>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Full width on phones, where the buttons wrap below it; shares the row from sm up. */}
          <div className="flex w-full min-w-0 sm:w-auto sm:min-w-56 sm:flex-1">
            <SearchInput value={f.q} onChange={(q) => update({ q }, typing)} placeholder="Search companies, rounds, investors…" label="Search rounds" />
          </div>
          <FilterSheet active={chips.length} resultLabel={`Show ${count} ${count === 1 ? "round" : "rounds"}`}>
            {panel}
          </FilterSheet>
          <label className="sr-only" htmlFor="round-sort">
            Sort by
          </label>
          <select
            id="round-sort"
            value={`${f.sort}:${f.dir}`}
            onChange={(e) => {
              const [sort, dir] = e.target.value.split(":") as [RoundSortKey, "asc" | "desc"];
              update({ sort, dir });
            }}
            className={`${BUTTON} pr-1`}
          >
            {ROUND_SORTS.flatMap((s) =>
              (["desc", "asc"] as const).map((d) => (
                <option key={`${s.id}:${d}`} value={`${s.id}:${d}`}>
                  {s.label}{" "}
                  {s.id === "company" ? (d === "asc" ? "A–Z" : "Z–A") : s.id === "date" ? (d === "desc" ? "(newest)" : "(oldest)") : d === "desc" ? "↓" : "↑"}
                </option>
              )),
            )}
          </select>
          <button type="button" onClick={download} className={BUTTON} disabled={!ready || !rows.length} title="Download the rounds in this view as CSV">
            <Download aria-hidden="true" className="size-4" />
            CSV
          </button>
          <CopyLinkButton />
        </div>
        <div className="mb-4 mt-3 space-y-1.5">
          <ActiveFilters chips={chips} onClear={() => update(clearRoundFilters(f))} count={count} total={rounds?.length ?? total} noun={["round", "rounds"]} />
          {count > 0 && (
            <p className="text-xs tabular-nums text-fg-subtle">
              {totals.companies} {totals.companies === 1 ? "company" : "companies"} · {formatUsd(totals.usd)} disclosed in USD across {totals.sized}{" "}
              {totals.sized === 1 ? "round" : "rounds"} · secondaries and tenders excluded · other currencies shown as stated, not converted
            </p>
          )}
        </div>
        {/* On phones the filter panel (where the failure shows) sits in a closed sheet: say it here too. */}
        {failed && pristine && (
          <div className="mb-4 lg:hidden">
            <ListLoading failed retry={retry} label="" />
          </div>
        )}
        {!ready && !pristine ? (
          <ListLoading failed={failed} retry={retry} label="Loading rounds" rows={4} />
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
            <p className="text-sm text-fg-muted">No round in the archive matches these filters.</p>
            <button type="button" onClick={() => update(clearRoundFilters(f))} className={`${BUTTON} mt-4`}>
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="@container">
            <Rows rows={rows.slice(0, shown)} f={f} onSort={onSort} />
            {count > shown && (
              <div className="mt-4 flex justify-center">
                {/* Enabled once every round has arrived (the page only carries the first ones). */}
                <button type="button" onClick={() => setShown((n) => n + PAGE)} className={BUTTON} disabled={!ready}>
                  Show {Math.min(PAGE, count - shown)} more of {count - shown} remaining
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
