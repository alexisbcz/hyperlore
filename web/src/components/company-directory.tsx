"use client";

import { Flag } from "./flag";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Check, ChevronsUpDown, Columns2, LayoutGrid, Rows3, X } from "lucide-react";
import {
  type CompanyFilters,
  DEFAULT_FILTERS,
  DESC_FIRST,
  type Facet,
  HAS_OPTIONS,
  STAGES,
  STATUSES,
  type SortKey,
  activeChips,
  clearFilters,
  countryName,
  facetCounts,
  facetValues,
  filterCompanies,
  parseFilters,
  serializeFilters,
  slugifyName,
  sortCompanies,
  stageLabel,
  statusLabel,
  MAX_COMPARE,
} from "@/lib/directory";
import type { CompanySummary } from "@/lib/types";
import { ActiveFilters, BUTTON, CopyLinkButton, FacetGroup, type FacetOption, FilterSheet, RangeGroup, SearchInput, ToggleRow, ListLoading, toggle, type UrlState, useFullList, WithUrlState } from "./filters";
import { Avatar, CompanyMark, formatDate, formatUsd, kindLabel } from "./lore";
import { TableScroll } from "./table-scroll";

const ACRONYMS: Record<string, string> = { ai: "AI", saas: "SaaS", api: "API", b2b: "B2B", hr: "HR", ml: "ML", crm: "CRM", devtools: "Devtools" };
/** "spend-management" → "Spend management", "ai" → "AI". */
export const categoryLabel = (c: string) =>
  c
    .replace(/[-_]+/g, " ")
    .split(/(\s+|\/)/)
    .map((w, i) => (Object.hasOwn(ACRONYMS, w) ? ACRONYMS[w] : undefined) ?? (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join("");

const founderKey = (f: { name: string; slug?: string }) => f.slug ?? slugifyName(f.name);

function Status({ c }: { c: CompanySummary }) {
  const tone = {
    active: "border-border text-fg-muted",
    public: "border-accent/40 text-accent",
    acquired: "border-border-strong text-fg",
    closed: "border-dashed border-border-strong text-fg-subtle",
  }[c.status];
  const title = [
    c.status === "acquired" && c.acquiredBy ? `Acquired by ${c.acquiredBy}` : "",
    c.stock ?? "",
    c.statusDerived ? "Deduced from the timeline" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <span title={title || undefined} className={`inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium ${tone}`}>
      {statusLabel(c.status)}
      {c.status === "public" && c.stock && <span className="ml-1 font-mono font-normal">{c.stock.split(":").at(-1)}</span>}
    </span>
  );
}

function Place({ c }: { c: CompanySummary }) {
  if (!c.city && !c.country) return c.hq ? <>{c.hq}</> : <Dash />;
  return (
    <>
      <Flag code={c.country} className="mr-1.5" />
      {c.city && <span className="text-fg">{c.city}</span>}
      {c.city && c.country && ", "}
      {c.country && <span className="text-fg-subtle">{countryName(c.country)}</span>}
    </>
  );
}

const Dash = () => <span className="text-fg-subtle">—</span>;

function Founders({ c }: { c: CompanySummary }) {
  if (!c.founders.length) return <Dash />;
  const [first, ...rest] = c.founders;
  return (
    <span className="flex max-w-[13rem] items-center gap-2" title={c.founders.map((f) => f.name).join(", ")}>
      <span className="flex -space-x-1.5">
        {c.founders.slice(0, 3).map((f) => (
          <Avatar key={f.name} photo={f.photo} name={f.name} size="xs" />
        ))}
      </span>
      <span className="truncate">
        {first.name}
        {rest.length > 0 && <span className="text-fg-subtle"> +{rest.length}</span>}
      </span>
    </span>
  );
}

type Column = { key: SortKey | "categories" | "founders"; label: string; align?: "right"; className?: string };

const COLUMNS: Column[] = [
  { key: "name", label: "Company", className: "sm:min-w-[17rem]" },
  { key: "founded", label: "Founded" },
  { key: "hq", label: "HQ", className: "min-w-[9rem]" },
  { key: "categories", label: "Categories" },
  { key: "status", label: "Status" },
  { key: "raised", label: "Raised", align: "right" },
  { key: "lastRound", label: "Last round", className: "min-w-[9rem]" },
  { key: "valuation", label: "Valuation", align: "right" },
  { key: "founders", label: "Founders", className: "min-w-[10rem]" },
  { key: "investors", label: "Investors", align: "right" },
  { key: "events", label: "Events", align: "right" },
  { key: "sources", label: "Sources", align: "right" },
  { key: "lastActivity", label: "Last activity" },
];

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  founded: "Founded",
  hq: "HQ",
  status: "Status",
  raised: "Total raised",
  lastRound: "Last round date",
  valuation: "Valuation",
  investors: "Investors",
  events: "Events",
  sources: "Sources",
  lastActivity: "Last activity",
};

type Picking = { picked: string[]; onPick: (slug: string) => void };

/** Row checkbox for the comparison tray; disabled once four companies are picked. */
function PickBox({ c, picked, onPick }: { c: CompanySummary } & Picking) {
  const checked = picked.includes(c.slug);
  const full = !checked && picked.length >= MAX_COMPARE;
  return (
    <label
      // A 40px target on touch screens, the same footprint in the layout.
      className={`-m-1.5 flex shrink-0 cursor-pointer items-center justify-center rounded p-1.5 pointer-coarse:-m-3 pointer-coarse:p-3 has-focus-visible:outline-2 has-focus-visible:outline-accent ${full ? "cursor-not-allowed opacity-40" : ""}`}
      title={full ? `Up to ${MAX_COMPARE} companies` : `Compare ${c.name}`}
    >
      <input type="checkbox" checked={checked} disabled={full} onChange={() => onPick(c.slug)} className="peer sr-only" aria-label={`Select ${c.name} to compare`} />
      <span
        aria-hidden="true"
        className="flex size-4 items-center justify-center rounded-[4px] border border-border-strong bg-bg text-on-primary peer-checked:border-fg peer-checked:bg-primary"
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
    </label>
  );
}

function Table({ rows, f, onSort, picked, onPick }: { rows: CompanySummary[]; f: CompanyFilters; onSort: (k: SortKey) => void } & Picking) {
  return (
    <TableScroll label="Companies table" className="tbl-hover">
      <table className="min-w-[72rem] sm:min-w-[78rem]">
        <caption className="sr-only">Companies in the archive, sorted by {SORT_LABELS[f.sort].toLowerCase()}, {f.dir === "asc" ? "ascending" : "descending"}</caption>
        <thead>
          <tr>
            {COLUMNS.map((col, i) => {
              const sortable = col.key !== "categories" && col.key !== "founders";
              const active = f.sort === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={active ? (f.dir === "asc" ? "ascending" : "descending") : undefined}
                  className={`py-0 ${col.align === "right" ? "text-right" : ""} ${i === 0 ? "tbl-pin" : ""} ${col.className ?? ""}`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key as SortKey)}
                      className={`inline-flex h-10 items-center gap-1 rounded hover:text-fg focus-visible:outline-2 focus-visible:outline-accent sm:h-9 ${active ? "text-fg" : ""}`}
                    >
                      {col.label}
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
                  ) : (
                    <span className="inline-flex h-10 items-center sm:h-9">{col.label}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        {/* Cell styles come from .tbl (globals.css), not every <td>: the table is the bulk of the page's HTML. */}
        <tbody className="[&_td]:whitespace-nowrap">
          {rows.map((c) => (
            <tr key={c.slug} className="group align-top">
              <th scope="row" className="tbl-pin font-normal">
                <span className="flex items-start gap-2.5">
                <PickBox c={c} picked={picked} onPick={onPick} />
                <Link href={`/${c.slug}`} className="flex min-w-0 items-start gap-2.5 rounded focus-visible:outline-2 focus-visible:outline-accent">
                  <CompanyMark logo={c.icon} name={c.name} size="sm" />
                  {/* Capped so the pinned column leaves room on a phone; long names wrap. */}
                  <span className="min-w-0 max-w-[6rem] sm:max-w-[15rem]">
                    <span className="block font-medium text-fg group-hover:underline">{c.name}</span>
                    {c.summary && <span className="hidden max-w-[15rem] truncate text-xs text-fg-subtle sm:block">{c.summary}</span>}
                  </span>
                </Link>
                </span>
              </th>
              <Cell>{c.founded ? <span className="tabular-nums">{c.founded.slice(0, 4)}</span> : <Dash />}</Cell>
              <Cell>
                <span className="block max-w-[13rem] truncate" title={[c.city, c.country && countryName(c.country)].filter(Boolean).join(", ") || c.hq}>
                  <Place c={c} />
                </span>
              </Cell>
              <Cell>
                {c.categories.length ? (
                  // One line, so every row keeps the same height; the rest are in the title.
                  <span className="flex items-center gap-1" title={c.categories.length > 2 ? c.categories.map(categoryLabel).join(", ") : undefined}>
                    {c.categories.slice(0, 2).map((cat) => (
                      <span key={cat} className="rounded border border-border px-1.5 text-[11px] text-fg-muted">
                        {categoryLabel(cat)}
                      </span>
                    ))}
                    {c.categories.length > 2 && <span className="text-[11px] text-fg-subtle">+{c.categories.length - 2}</span>}
                  </span>
                ) : (
                  <Dash />
                )}
              </Cell>
              <Cell>
                <Status c={c} />
              </Cell>
              <Cell right>{c.raisedUsd ? formatUsd(c.raisedUsd) : <Dash />}</Cell>
              <Cell>
                {c.lastRound ? (
                  <span title={c.lastRound.round}>
                    <span className="text-fg">{stageLabel(c.lastRound.stage)}</span>
                    {c.lastRound.amountUsd ? <span className="text-fg-muted"> · {formatUsd(c.lastRound.amountUsd)}</span> : null}
                    <span className="block text-xs text-fg-subtle">{formatDate(c.lastRound.date)}</span>
                  </span>
                ) : (
                  <Dash />
                )}
              </Cell>
              <Cell right>{c.valuationUsd ? formatUsd(c.valuationUsd) : <Dash />}</Cell>
              <Cell>
                <Founders c={c} />
              </Cell>
              <Cell right>
                {c.investors.length ? (
                  <span title={c.investors.slice(0, 12).map((i) => i.name).join(", ") + (c.investors.length > 12 ? "…" : "")}>{c.investors.length}</span>
                ) : (
                  <Dash />
                )}
              </Cell>
              <Cell right>{c.events}</Cell>
              <Cell right>{c.sources}</Cell>
              <Cell>{c.lastEvent ? formatDate(c.lastEvent) : <Dash />}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

function Cell({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    // Shared cell styles come from .tbl and <tbody>.
    <td className={right ? "num" : undefined}>{children}</td>
  );
}

function Grid({ rows }: { rows: CompanySummary[] }) {
  return (
    <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((c) => (
        <li key={c.slug} className="bg-bg">
          <Link href={`/${c.slug}`} className="flex h-full flex-col p-5 transition-colors hover:bg-bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
            <span className="flex items-center gap-3">
              <CompanyMark logo={c.icon} name={c.name} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-fg">{c.name}</span>
                <span className="block truncate text-xs text-fg-subtle">
                  <Place c={c} />
                </span>
              </span>
              <Status c={c} />
            </span>
            <span className="mt-3 line-clamp-2 text-pretty text-sm leading-relaxed text-fg-muted">{c.summary ?? "Sourced timeline, funding and quotes."}</span>
            {c.categories.length > 0 && (
              <span className="mt-3 flex flex-wrap gap-1">
                {c.categories.slice(0, 4).map((cat) => (
                  <span key={cat} className="rounded border border-border px-1.5 text-[11px] text-fg-muted">
                    {categoryLabel(cat)}
                  </span>
                ))}
              </span>
            )}
            <span className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-5 text-xs tabular-nums text-fg-subtle">
              {c.founded && <span>Founded {c.founded.slice(0, 4)}</span>}
              {c.raisedUsd > 0 && <span>Raised {formatUsd(c.raisedUsd)}</span>}
              {c.lastRound && <span>{stageLabel(c.lastRound.stage)} · {formatDate(c.lastRound.date)}</span>}
              <span>{c.events} {c.events === 1 ? "event" : "events"}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Every company given (`companies`), or, for the whole archive, the first ones in the default order
 * (`initial`) with the full list fetched from `src` after load: shipping all of them made /companies
 * weigh 600 KB.
 */
export function CompanyDirectory({
  companies,
  initial,
  total,
  src,
}: { companies: CompanySummary[]; initial?: never; total?: never; src?: never } | { companies?: never; initial: CompanySummary[]; total: number; src: string }) {
  const { items, failed, retry } = useFullList<CompanySummary>(companies, src);
  return (
    <WithUrlState parse={parseFilters} serialize={serializeFilters}>
      {(state) => (
        <Directory companies={items} initial={initial ?? companies ?? []} total={total ?? companies?.length ?? 0} failed={failed} retry={retry} state={state} />
      )}
    </WithUrlState>
  );
}

function Directory({
  companies,
  initial,
  total,
  failed,
  retry,
  state: [f, setF],
}: {
  companies: CompanySummary[] | null;
  initial: CompanySummary[];
  total: number;
  failed: boolean;
  retry: () => void;
  state: UrlState<CompanyFilters>;
}) {
  const update = (patch: Partial<CompanyFilters>, opts?: { replace?: boolean }) => setF({ ...f, ...patch }, opts);
  // Typing (search, ranges) replaces the history entry instead of pushing one per keystroke.
  const typing = { replace: true };

  // Labels for facet values that are ids (slugs, ISO codes).
  const names = useMemo(() => {
    const investors = new Map<string, string>();
    const founders = new Map<string, string>();
    for (const c of companies ?? initial) {
      for (const i of c.investors) if (!investors.has(i.slug)) investors.set(i.slug, i.name);
      for (const p of c.founders) founders.set(founderKey(p), p.name);
    }
    return { investors, founders };
  }, [companies, initial]);

  const label = (facet: Facet, v: string): string => {
    switch (facet) {
      case "category":
        return categoryLabel(v);
      case "country":
        return countryName(v);
      case "status":
        return statusLabel(v);
      case "stage":
        return stageLabel(v);
      case "investor":
        return names.investors.get(v) ?? v;
      case "founder":
        return names.founders.get(v) ?? v;
      case "kind":
        return kindLabel(v);
      case "has":
        return HAS_OPTIONS.find((o) => o.id === v)?.label ?? v;
      default:
        return v;
    }
  };

  // Until the full list has arrived, the unfiltered view shows the companies the page came with (the
  // layout is not a filter); any other view waits for the full list.
  const pristine = serializeFilters({ ...f, view: DEFAULT_FILTERS.view }) === "";
  const rows = useMemo(
    () => (companies ? sortCompanies(filterCompanies(companies, f), f.sort, f.dir) : pristine ? initial : []),
    [companies, initial, pristine, f],
  );
  const count = companies ? rows.length : pristine ? total : 0;
  // Companies ticked for comparison: kept across filter changes, so a pick survives a new search.
  const [picked, setPicked] = useState<string[]>([]);
  const onPick = (slug: string) =>
    setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : p.length >= MAX_COMPARE ? p : [...p, slug]));
  const chips = activeChips(f, label).map((c) => ({ key: c.key, label: c.label, onRemove: () => setF(c.remove(f)) }));

  const options = (facet: Facet, order?: string[]): FacetOption[] => {
    const counts = facetCounts(companies ?? [], f, facet);
    const all = new Set([...(facet === "has" ? HAS_OPTIONS.map((o) => o.id) : (companies ?? []).flatMap((c) => facetValues(c, facet))), ...f[facet]]);
    const list = [...all].map((value) => ({ value, label: label(facet, value), count: counts.get(value) ?? 0 }));
    return order
      ? list.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value))
      : list.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };

  const onSort = (key: SortKey) =>
    update(f.sort === key ? { dir: f.dir === "asc" ? "desc" : "asc" } : { sort: key, dir: DESC_FIRST.includes(key) ? "desc" : "asc" });

  const panel = !companies ? (
    <ListLoading failed={failed} retry={retry} label="Loading filters" />
  ) : (
    <div>
      <FacetGroup title="Status" options={options("status", STATUSES.map((s) => s.id))} selected={f.status} onToggle={(v) => update({ status: toggle(f.status, v) })} />
      <FacetGroup
        title="Category"
        options={options("category")}
        selected={f.category}
        onToggle={(v) => update({ category: toggle(f.category, v) })}
        empty="Categories appear as company profiles are filled in."
      />
      <FacetGroup title="Last round" options={options("stage", STAGES.map((s) => s.id))} selected={f.stage} onToggle={(v) => update({ stage: toggle(f.stage, v) })} limit={8} />
      <FacetGroup flags title="Country" options={options("country")} selected={f.country} onToggle={(v) => update({ country: toggle(f.country, v) })} limit={5} />
      <FacetGroup title="City" options={options("city")} selected={f.city} onToggle={(v) => update({ city: toggle(f.city, v) })} limit={5} defaultOpen={false} />
      <RangeGroup title="Founded" min={f.foundedMin} max={f.foundedMax} onChange={(foundedMin, foundedMax) => update({ foundedMin, foundedMax }, typing)} placeholder={["From", "To"]} />
      <RangeGroup title="Total raised" unit="$M" min={f.raisedMin} max={f.raisedMax} onChange={(raisedMin, raisedMax) => update({ raisedMin, raisedMax }, typing)} />
      <RangeGroup title="Latest valuation" unit="$M" min={f.valuationMin} max={f.valuationMax} onChange={(valuationMin, valuationMax) => update({ valuationMin, valuationMax }, typing)} defaultOpen={false} />
      <FacetGroup title="Backed by" options={options("investor")} selected={f.investor} onToggle={(v) => update({ investor: toggle(f.investor, v) })} limit={6}>
        <ToggleRow label="Only where they led a round" checked={f.lead} onChange={(lead) => update({ lead })} />
      </FacetGroup>
      <FacetGroup title="Founder" options={options("founder")} selected={f.founder} onToggle={(v) => update({ founder: toggle(f.founder, v) })} limit={5} defaultOpen={false} />
      <FacetGroup title="Has" options={options("has", HAS_OPTIONS.map((o) => o.id))} selected={f.has} onToggle={(v) => update({ has: toggle(f.has, v) })} />
      <FacetGroup
        title="Timeline includes"
        options={options("kind")}
        selected={f.kind}
        onToggle={(v) => update({ kind: toggle(f.kind, v) })}
        limit={8}
        defaultOpen={false}
      />
    </div>
  );

  return (
    <div className="mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-(--sticky-top) max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1">{panel}</div>
      </aside>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={f.q} onChange={(q) => update({ q }, typing)} placeholder="Search names, founders, investors, places…" label="Search companies" />
          <FilterSheet active={chips.length} resultLabel={`Show ${count} ${count === 1 ? "company" : "companies"}`}>
            {panel}
          </FilterSheet>
          <label className="sr-only" htmlFor="company-sort">
            Sort by
          </label>
          <select
            id="company-sort"
            value={`${f.sort}:${f.dir}`}
            onChange={(e) => {
              const [sort, dir] = e.target.value.split(":") as [SortKey, "asc" | "desc"];
              update({ sort, dir });
            }}
            className={`${BUTTON} pr-1 ${f.view === "table" ? "md:hidden" : ""}`}
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).flatMap((k) =>
              (["desc", "asc"] as const).map((d) => (
                <option key={`${k}:${d}`} value={`${k}:${d}`}>
                  {SORT_LABELS[k]} {k === "name" || k === "hq" || k === "status" ? (d === "asc" ? "A–Z" : "Z–A") : d === "asc" ? "↑" : "↓"}
                </option>
              )),
            )}
          </select>
          <div role="group" aria-label="Layout" className="flex rounded-md border border-border p-0.5">
            {(
              [
                ["table", "Table", Rows3],
                ["grid", "Cards", LayoutGrid],
              ] as const
            ).map(([view, text, Icon]) => (
              <button
                key={view}
                type="button"
                aria-pressed={f.view === view}
                onClick={() => update({ view })}
                className="inline-flex h-9 items-center gap-1 rounded px-2 text-xs sm:h-6 text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent aria-pressed:bg-bg-hover aria-pressed:text-fg"
              >
                <Icon aria-hidden="true" className="size-3.5" />
                {text}
              </button>
            ))}
          </div>
          <CopyLinkButton />
        </div>
        <div className="mb-4 mt-3">
          <ActiveFilters chips={chips} onClear={() => setF(clearFilters(f))} count={count} total={companies?.length ?? total} noun={["company", "companies"]} />
        </div>
        {/* On phones the filter panel (where the failure shows) sits in a closed sheet: say it here too. */}
        {failed && pristine && (
          <div className="mb-4 lg:hidden">
            <ListLoading failed retry={retry} label="" />
          </div>
        )}
        {!companies && !pristine ? (
          <ListLoading failed={failed} retry={retry} label="Loading companies" rows={4} />
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border-strong px-6 py-12 text-center">
            <p className="text-sm text-fg-muted">No company in the archive matches these filters.</p>
            <button type="button" onClick={() => setF(clearFilters(f))} className={`${BUTTON} mt-4`}>
              Clear all filters
            </button>
          </div>
        ) : f.view === "grid" ? (
          <Grid rows={rows} />
        ) : (
          <Table rows={rows} f={f} onSort={onSort} picked={picked} onPick={onPick} />
        )}
        {!companies && pristine && total > rows.length && (
          <p aria-busy={!failed} className="mt-3 text-center text-xs text-fg-subtle">
            {failed ? (
              <>
                The other {total - rows.length} companies did not load.{" "}
                <button type="button" onClick={retry} className="underline underline-offset-2 hover:text-fg">
                  Try again
                </button>
              </>
            ) : (
              `Loading the other ${total - rows.length} companies…`
            )}
          </p>
        )}
      </div>
      {picked.length > 0 && (
        <div role="region" aria-label="Comparison" className="fixed inset-x-0 bottom-24 z-30 flex lg:bottom-4 justify-center px-4">
          <div className="flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-border bg-bg p-2 pl-3 shadow-lg">
            <span className="min-w-0 truncate text-sm text-fg-muted">
              {picked.map((s) => (companies ?? initial).find((c) => c.slug === s)?.name ?? s).join(", ")}
            </span>
            {picked.length >= 2 ? (
              <Link href={`/compare?c=${picked.join(",")}`} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-on-primary hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-8">
                <Columns2 aria-hidden="true" className="size-4" />
                Compare {picked.length}
              </Link>
            ) : (
              <span className="shrink-0 text-xs text-fg-subtle">Pick one more to compare</span>
            )}
            <button type="button" onClick={() => setPicked([])} className={BUTTON} aria-label="Clear the comparison">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
