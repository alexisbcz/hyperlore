"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Dropdown } from "twenty-ui/components/navigation";
import { LightButton, LightIconButton, SearchInput } from "twenty-ui/components/input";
import { Chip } from "twenty-ui/primitives/data-display";
import { Text } from "twenty-ui/primitives/typography";
import { IconArrowDown, IconArrowUp, IconChevronDown, IconFilter, IconSortDescending, IconX, IconTable, IconDownload } from "twenty-ui/icon";

type IconComp = typeof IconTable;

export type Column<R> = {
  id: string;
  label: string;
  icon: IconComp;
  width: number;
  render: (r: R) => ReactNode;
  /** Sort key; columns without one aren't sortable. */
  sort?: (r: R) => string | number | undefined;
  align?: "end";
  /** Footer aggregate over the visible (filtered) rows. */
  agg?: (rows: R[]) => ReactNode;
  /** CSV value; defaults to the sort key. */
  csv?: (r: R) => string | number | undefined;
};

export type Facet<R> = {
  id: string;
  label: string;
  icon: IconComp;
  values: (r: R) => string[];
  /** Display label for a stored value. */
  label_?: (v: string) => string;
  /** Option order: by count (default) or by this rank. */
  order?: (v: string) => number;
};

export type View<R> = { id: string; label: string; icon: IconComp; render?: (rows: R[]) => ReactNode };

type Sort = { id: string; dir: "asc" | "desc" };

const PAGE = 120;

function compare(a: string | number | undefined, b: string | number | undefined) {
  // Empty values sort last in both directions.
  if (a === undefined || a === "") return b === undefined || b === "" ? 0 : 1;
  if (b === undefined || b === "") return -1;
  return typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b));
}

function readParams(facets: Facet<unknown>[]) {
  const p = new URLSearchParams(window.location.search);
  const filters: Record<string, string[]> = {};
  for (const f of facets) {
    const v = p.getAll(f.id).flatMap((x) => x.split(",")).filter(Boolean);
    if (v.length) filters[f.id] = v;
  }
  return { filters, q: p.get("q") ?? "", view: p.get("view") ?? undefined };
}

function writeParams(filters: Record<string, string[]>, q: string, view?: string) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (view) p.set("view", view);
  for (const [k, v] of Object.entries(filters)) if (v.length) p.set(k, v.join(","));
  const s = p.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${s ? `?${s}` : ""}`);
}

export function RecordTable<R>({
  name,
  rows,
  columns,
  rowKey,
  search,
  facets = [],
  defaultSort,
  views,
  csvName,
  searchPlaceholder = "Search",
}: {
  name: string;
  rows: R[];
  columns: Column<R>[];
  rowKey: (r: R) => string;
  search: (r: R) => string;
  facets?: Facet<R>[];
  defaultSort: Sort;
  views?: View<R>[];
  csvName?: string;
  searchPlaceholder?: string;
}) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [sort, setSort] = useState<Sort>(defaultSort);
  const [view, setView] = useState(views?.[0]?.id ?? "table");
  const [limit, setLimit] = useState(PAGE);
  const scroller = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  // Filters live in the URL, so a filtered view can be shared; read once after hydration.
  useEffect(() => {
    const s = readParams(facets as Facet<unknown>[]);
    /* eslint-disable react-hooks/set-state-in-effect */
    setFilters(s.filters);
    setQ(s.q);
    if (s.view && views?.some((v) => v.id === s.view)) setView(s.view);
    /* eslint-enable react-hooks/set-state-in-effect */
    restored.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (restored.current) writeParams(filters, q, view === (views?.[0]?.id ?? "table") ? undefined : view);
  }, [filters, q, view, views]);

  const haystack = useMemo(() => new Map(rows.map((r) => [r, search(r).toLowerCase()])), [rows, search]);

  const matchesExcept = (r: R, skip?: string) => {
    for (const f of facets) {
      if (f.id === skip) continue;
      const want = filters[f.id];
      if (want?.length && !f.values(r).some((v) => want.includes(v))) return false;
    }
    return true;
  };

  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const searched = terms.length ? rows.filter((r) => terms.every((t) => haystack.get(r)!.includes(t))) : rows;
  const filtered = searched.filter((r) => matchesExcept(r));
  const col = columns.find((c) => c.id === sort.id);
  const sorted = col?.sort
    ? filtered.toSorted((a, b) => {
        const x = col.sort!(a);
        const y = col.sort!(b);
        if (x === undefined || x === "" || y === undefined || y === "") return compare(x, y);
        return sort.dir === "asc" ? compare(x, y) : compare(y, x);
      })
    : filtered;
  const shown = sorted.slice(0, limit);

  // Render more rows as the end of the table scrolls into view.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => es[0].isIntersecting && setLimit((l) => l + PAGE), { root: scroller.current, rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [shown.length, sorted.length]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setLimit(PAGE), [q, filters, sort]);

  const toggleSort = (id: string) =>
    setSort((s) => (s.id === id ? { id, dir: s.dir === "asc" ? "desc" : "asc" } : { id, dir: typeof columns.find((c) => c.id === id)?.sort?.(rows[0]) === "number" ? "desc" : "asc" }));

  const active = facets.filter((f) => filters[f.id]?.length);
  const current = views?.find((v) => v.id === view);

  const exportCsv = () => {
    const esc = (v: unknown) => {
      const s = v === undefined || v === null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [columns.map((c) => esc(c.label)).join(","), ...sorted.map((r) => columns.map((c) => esc((c.csv ?? c.sort)?.(r))).join(","))];
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `${csvName ?? "export"}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="tw-viewbar">
        {views && views.length > 1 ? (
          <Dropdown.Root type="picker">
            <Dropdown.Trigger
              render={
                <LightButton startIcon={current ? <current.icon /> : undefined} endIcon={<IconChevronDown />}>
                  {current?.label ?? name}
                  <span className="tw-viewbar-count tw-num">&nbsp;·&nbsp;{filtered.length.toLocaleString("en")}</span>
                </LightButton>
              }
            />
            <Dropdown.Content aria-label="Views" width={220}>
              <Dropdown.Section label="Layout">
                <Dropdown.SelectionGroup id="view" aria-label="Layout" value={view} onValueChange={(v: string | null) => v && setView(v)}>
                  {views.map((v) => (
                    <Dropdown.OptionItem key={v.id} value={v.id} startIcon={<v.icon />} indicator="check">
                      {v.label}
                    </Dropdown.OptionItem>
                  ))}
                </Dropdown.SelectionGroup>
              </Dropdown.Section>
            </Dropdown.Content>
          </Dropdown.Root>
        ) : (
          <div className="tw-viewbar-name">
            <IconTable size={16} aria-hidden style={{ color: "var(--t-font-color-tertiary)" }} />
            {name}
            <span className="tw-viewbar-count tw-num">· {filtered.length.toLocaleString("en")}</span>
          </div>
        )}
        <div className="tw-viewbar-spacer" />
        <div className="tw-viewbar-search">
          <SearchInput size="sm" aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={q} onValueChange={setQ} />
        </div>
        {facets.length > 0 && (
          <Dropdown.Root type="menu">
            <Dropdown.Trigger render={<LightButton startIcon={<IconFilter />} color={active.length ? "accent" : undefined}>Filter</LightButton>} />
            <Dropdown.Content aria-label="Filter" width={260} align="end">
              <Dropdown.Page id="root">
                <Dropdown.Section>
                  {facets.map((f) => (
                    <Dropdown.ActionItem key={f.id} page={f.id} startIcon={<f.icon />} hasSubmenu description={filters[f.id]?.length ? `${filters[f.id].length}` : undefined} descriptionPlacement="end">
                      {f.label}
                    </Dropdown.ActionItem>
                  ))}
                </Dropdown.Section>
              </Dropdown.Page>
              {facets.map((f) => (
                <Dropdown.Page key={f.id} id={f.id} type="picker">
                  <FacetPage
                    facet={f}
                    rows={searched.filter((r) => matchesExcept(r, f.id))}
                    value={filters[f.id] ?? []}
                    onChange={(v) => setFilters((all) => ({ ...all, [f.id]: v }))}
                  />
                </Dropdown.Page>
              ))}
            </Dropdown.Content>
          </Dropdown.Root>
        )}
        <Dropdown.Root type="picker">
          <Dropdown.Trigger render={<LightButton startIcon={<IconSortDescending />}>Sort</LightButton>} />
          <Dropdown.Content aria-label="Sort" width={220} align="end">
            <Dropdown.Section label="Direction">
              <Dropdown.SelectionGroup id="dir" aria-label="Direction" value={sort.dir} closeOnSelect={false} onValueChange={(v: string | null) => v && setSort((s) => ({ ...s, dir: v as Sort["dir"] }))}>
                <Dropdown.OptionItem value="asc" startIcon={<IconArrowUp />} indicator="check">
                  Ascending
                </Dropdown.OptionItem>
                <Dropdown.OptionItem value="desc" startIcon={<IconArrowDown />} indicator="check">
                  Descending
                </Dropdown.OptionItem>
              </Dropdown.SelectionGroup>
            </Dropdown.Section>
            <Dropdown.Separator />
            <Dropdown.Section label="Field" scrollable>
              <Dropdown.SelectionGroup id="field" aria-label="Field" value={sort.id} onValueChange={(v: string | null) => v && setSort((s) => ({ ...s, id: v }))}>
                {columns
                  .filter((c) => c.sort)
                  .map((c) => (
                    <Dropdown.OptionItem key={c.id} value={c.id} startIcon={<c.icon />} indicator="check">
                      {c.label}
                    </Dropdown.OptionItem>
                  ))}
              </Dropdown.SelectionGroup>
            </Dropdown.Section>
          </Dropdown.Content>
        </Dropdown.Root>
        {csvName && (
          <LightIconButton aria-label="Export as CSV" tooltip="Export the filtered rows as CSV" onClick={exportCsv}>
            <IconDownload />
          </LightIconButton>
        )}
      </div>
      {(active.length > 0 || q) && (
        <div className="tw-filterbar">
          {q && (
            <Chip
              variant="outline"
              size="md"
              endElementDivider
              endElement={
                <LightIconButton aria-label="Clear search" size="xs" emphasis="subtle" onClick={() => setQ("")}>
                  <IconX />
                </LightIconButton>
              }
            >
              <Text render={<span />} color="tertiary">
                Search:
              </Text>
              &nbsp;{q}
            </Chip>
          )}
          {active.map((f) => (
            <Chip
              key={f.id}
              variant="outline"
              size="md"
              startElement={<f.icon size={14} aria-hidden />}
              endElementDivider
              maxWidth={360}
              endElement={
                <LightIconButton aria-label={`Remove ${f.label} filter`} size="xs" emphasis="subtle" onClick={() => setFilters((all) => ({ ...all, [f.id]: [] }))}>
                  <IconX />
                </LightIconButton>
              }
              tooltipContent={filters[f.id].map((v) => f.label_?.(v) ?? v).join(", ")}
            >
              {f.label}: {filters[f.id].map((v) => f.label_?.(v) ?? v).join(", ")}
            </Chip>
          ))}
          <LightButton emphasis="subtle" onClick={() => (setFilters({}), setQ(""))}>
            Reset
          </LightButton>
        </div>
      )}
      <div className="tw-scroll" ref={scroller}>
        {current?.render ? (
          current.render(sorted)
        ) : (
          <table className="tw-table">
            <colgroup>
              <col style={{ width: 40 }} />
              {columns.map((c) => (
                <col key={c.id} style={{ width: c.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th aria-label="Row" />
                {columns.map((c, i) => (
                  <th key={c.id} className={i === 0 ? "tw-sticky" : undefined} data-align={c.align} aria-sort={sort.id === c.id ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.sort ? (
                      <button type="button" className="tw-th" data-sortable data-sorted={sort.id === c.id || undefined} onClick={() => toggleSort(c.id)}>
                        <c.icon size={16} stroke={1.6} aria-hidden />
                        <span className="tw-th-label">{c.label}</span>
                        {sort.id === c.id && (sort.dir === "asc" ? <IconArrowUp size={12} aria-hidden /> : <IconArrowDown size={12} aria-hidden />)}
                      </button>
                    ) : (
                      <span className="tw-th">
                        <c.icon size={16} stroke={1.6} aria-hidden />
                        <span className="tw-th-label">{c.label}</span>
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={rowKey(r)}>
                  <td className="tw-index tw-num">{i + 1}</td>
                  {columns.map((c, j) => (
                    <td key={c.id} className={j === 0 ? "tw-sticky" : undefined} data-align={c.align}>
                      {c.render(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {columns.some((c) => c.agg) && (
              <tfoot>
                <tr>
                  <td />
                  {columns.map((c, j) => (
                    <td key={c.id} className={j === 0 ? "tw-sticky" : undefined} data-align={c.align}>
                      {j === 0 ? (
                        <>
                          <span className="tw-agg">Count</span>
                          <span className="tw-num">{filtered.length.toLocaleString("en")}</span>
                        </>
                      ) : (
                        c.agg?.(filtered)
                      )}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        )}
        {!current?.render && shown.length < sorted.length && (
          <div ref={sentinel} className="tw-table-more">
            Loading more rows…
          </div>
        )}
        {!filtered.length && <div className="tw-empty">No records match these filters.</div>}
      </div>
    </>
  );
}

function FacetPage<R>({ facet, rows, value, onChange }: { facet: Facet<R>; rows: R[]; value: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState("");
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) for (const v of new Set(facet.values(r))) m.set(v, (m.get(v) ?? 0) + 1);
    for (const v of value) if (!m.has(v)) m.set(v, 0);
    return [...m].sort((a, b) => (facet.order ? facet.order(a[0]) - facet.order(b[0]) : b[1] - a[1] || a[0].localeCompare(b[0])));
  }, [rows, facet, value]);
  const label = (v: string) => facet.label_?.(v) ?? v;
  const shown = counts.filter(([v]) => !q || label(v).toLowerCase().includes(q.toLowerCase())).slice(0, 200);
  return (
    <>
      <Dropdown.Back>{facet.label}</Dropdown.Back>
      <Dropdown.Search aria-label={`Search ${facet.label}`} value={q} onValueChange={setQ} />
      <Dropdown.Section scrollable>
        <Dropdown.SelectionGroup id={`facet-${facet.id}`} aria-label={facet.label} multiple value={value} onValueChange={(v: string[]) => onChange(v)}>
          {shown.map(([v, n]) => (
            <Dropdown.OptionItem key={v} value={v} indicator="checkbox" description={n.toLocaleString("en")} descriptionPlacement="end">
              {label(v)}
            </Dropdown.OptionItem>
          ))}
        </Dropdown.SelectionGroup>
        {!shown.length && <Dropdown.Empty>No options</Dropdown.Empty>}
      </Dropdown.Section>
    </>
  );
}
