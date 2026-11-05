"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { INVESTORS_PAGE, STAGES, stageLabel } from "@/lib/directory";
import type { DirectoryInvestor as Investor } from "@/lib/types";
import { categoryLabel } from "./company-directory";
import { TableScroll } from "./table-scroll";
import {
  ActiveFilters,
  BUTTON,
  CopyLinkButton,
  FacetGroup,
  type FacetOption,
  FilterSheet,
  ListLoading,
  RangeGroup,
  SearchInput,
  ToggleRow,
  toggle,
  type UrlState,
  useFullList,
  WithUrlState,
} from "./filters";

type CompanyInfo = { slug: string; name: string; categories: string[] };

type State = {
  q: string;
  category: string[];
  stage: string[];
  company: string[];
  lead: boolean;
  minCompanies?: number;
  sort: "companies" | "leads" | "rounds" | "name";
};

const SORTS: { id: State["sort"]; label: string }[] = [
  { id: "companies", label: "Most companies" },
  { id: "leads", label: "Most rounds led" },
  { id: "rounds", label: "Most rounds" },
  { id: "name", label: "Name A–Z" },
];

const list = (p: URLSearchParams, k: string) => (p.get(k) ?? "").split(",").filter(Boolean);

function parse(p: URLSearchParams): State {
  const min = Number(p.get("min_companies"));
  const sort = p.get("sort") as State["sort"];
  return {
    q: (p.get("q") ?? "").slice(0, 100),
    category: list(p, "category"),
    stage: list(p, "stage"),
    company: list(p, "company"),
    lead: p.get("lead") === "1",
    minCompanies: p.get("min_companies") && Number.isFinite(min) && min > 0 ? min : undefined,
    sort: SORTS.some((s) => s.id === sort) ? sort : "companies",
  };
}

function serialize(s: State) {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set("q", s.q.trim());
  for (const k of ["category", "stage", "company"] as const) if (s[k].length) p.set(k, s[k].join(","));
  if (s.lead) p.set("lead", "1");
  if (s.minCompanies !== undefined) p.set("min_companies", String(s.minCompanies));
  if (s.sort !== "companies") p.set("sort", s.sort);
  return p.toString().replace(/%2C/g, ",");
}

type Facet = "category" | "stage" | "company";

/** Portfolio companies named in a row; the rest are on the investor's page. */
const SHOWN_COMPANIES = 8;

/**
 * The page renders the first investors in the default order (`initial`); every investor, which the
 * filters and sorts work on, is fetched from `src` after load. Shipping all of them made /investors
 * weigh 750 KB.
 */
export function InvestorDirectory({ initial, total, companies, src }: { initial: Investor[]; total: number; companies: CompanyInfo[]; src: string }) {
  const { items, failed, retry } = useFullList<Investor>(undefined, src);
  return (
    <WithUrlState parse={parse} serialize={serialize}>
      {(state) => <Directory investors={items} initial={initial} total={total} companies={companies} failed={failed} retry={retry} state={state} />}
    </WithUrlState>
  );
}

function Directory({
  investors: all,
  initial,
  total,
  companies,
  failed,
  retry,
  state: [s, set],
}: {
  investors: Investor[] | null;
  initial: Investor[];
  total: number;
  companies: CompanyInfo[];
  failed: boolean;
  retry: () => void;
  state: UrlState<State>;
}) {
  const [shown, setShown] = useState(INVESTORS_PAGE);
  const update = (patch: Partial<State>, opts?: { replace?: boolean }) => {
    setShown(INVESTORS_PAGE);
    set({ ...s, ...patch }, opts);
  };
  // Until every investor has arrived, the unfiltered default view is the investors the page came with;
  // any other view waits for the full list.
  const ready = all !== null;
  const pristine = serialize(s) === "";
  const investors = all ?? initial;
  const bySlug = useMemo(() => new Map(companies.map((c) => [c.slug, c])), [companies]);

  // With "lead only", the facets look at the rounds an investor led, not every round it joined.
  const values = (i: Investor, facet: Facet): string[] => {
    const stakes = s.lead ? i.stakes.filter((x) => x.lead) : i.stakes;
    const cos = [...new Set(stakes.map((x) => x.company))];
    if (facet === "company") return cos;
    if (facet === "category") return [...new Set(cos.flatMap((c) => bySlug.get(c)?.categories ?? []))];
    return [...new Set(stakes.map((x) => x.stage ?? "other"))];
  };

  const match = (i: Investor, skip?: Facet) => {
    if (s.q.trim() && !i.name.toLowerCase().includes(s.q.trim().toLowerCase())) return false;
    if (s.lead && !i.leads) return false;
    if (s.minCompanies !== undefined && i.companies.length < s.minCompanies) return false;
    for (const f of ["category", "stage", "company"] as const) {
      if (f === skip || !s[f].length) continue;
      const have = values(i, f);
      if (!s[f].some((v) => have.includes(v))) return false;
    }
    return true;
  };

  const rows = (ready ? investors : pristine ? initial : [])
    .filter((i) => match(i))
    .sort((a, b) =>
      s.sort === "name"
        ? a.name.localeCompare(b.name)
        : s.sort === "leads"
          ? b.leads - a.leads || b.companies.length - a.companies.length
          : s.sort === "rounds"
            ? b.stakes.length - a.stakes.length || b.companies.length - a.companies.length
            : b.companies.length - a.companies.length || b.leads - a.leads || a.name.localeCompare(b.name),
    );

  const label = (facet: Facet, v: string) => (facet === "category" ? categoryLabel(v) : facet === "stage" ? stageLabel(v) : (bySlug.get(v)?.name ?? v));
  const options = (facet: Facet, order?: string[]): FacetOption[] => {
    const counts = new Map<string, number>();
    for (const i of investors.filter((i) => match(i, facet))) for (const v of values(i, facet)) counts.set(v, (counts.get(v) ?? 0) + 1);
    const seen = new Set([...investors.flatMap((i) => values(i, facet)), ...s[facet]]);
    const opts = [...seen].map((value) => ({ value, label: label(facet, value), count: counts.get(value) ?? 0 }));
    return order ? opts.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value)) : opts.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };

  const chips = [
    ...(s.q.trim() ? [{ key: "q", label: `“${s.q.trim()}”`, onRemove: () => update({ q: "" }) }] : []),
    ...(["category", "stage", "company"] as const).flatMap((f) =>
      s[f].map((v) => ({
        key: `${f}:${v}`,
        label: f === "company" ? `Backed ${label(f, v)}` : label(f, v),
        onRemove: () => update({ [f]: s[f].filter((x) => x !== v) }),
      })),
    ),
    ...(s.lead ? [{ key: "lead", label: "Led a round", onRemove: () => update({ lead: false }) }] : []),
    ...(s.minCompanies !== undefined
      ? [{ key: "min", label: `≥ ${s.minCompanies} companies`, onRemove: () => update({ minCompanies: undefined }) }]
      : []),
  ];
  const clear = () => update({ q: "", category: [], stage: [], company: [], lead: false, minCompanies: undefined });
  const count = ready ? rows.length : pristine ? total : 0;

  const panel = !ready ? (
    <ListLoading failed={failed} retry={retry} label="Loading filters" />
  ) : (
    <div>
      <div className="border-b border-border py-3">
        <ToggleRow label="Led at least one round" checked={s.lead} onChange={(lead) => update({ lead })} />
      </div>
      <RangeGroup title="Portfolio companies" min={s.minCompanies} onChange={(minCompanies) => update({ minCompanies }, { replace: true })} placeholder={["At least", ""]} minOnly />
      <FacetGroup title="Stage" options={options("stage", STAGES.map((x) => x.id))} selected={s.stage} onToggle={(v) => update({ stage: toggle(s.stage, v) })} limit={8} />
      <FacetGroup
        title="Company category"
        options={options("category")}
        selected={s.category}
        onToggle={(v) => update({ category: toggle(s.category, v) })}
        empty="Categories appear as company profiles are filled in."
      />
      <FacetGroup title="Backed company" options={options("company")} selected={s.company} onToggle={(v) => update({ company: toggle(s.company, v) })} />
    </div>
  );

  return (
    <div className="mt-8 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
      <aside aria-label="Filters" className="hidden lg:block">
        <div className="sticky top-(--sticky-top) max-h-[calc(100dvh-6rem)] overflow-y-auto pr-1">{panel}</div>
      </aside>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={s.q} onChange={(q) => update({ q }, { replace: true })} placeholder="Search investors…" label="Search investors" />
          <FilterSheet active={chips.length} resultLabel={`Show ${count} investors`}>
            {panel}
          </FilterSheet>
          <label htmlFor="investor-sort" className="sr-only">
            Sort by
          </label>
          <select id="investor-sort" value={s.sort} onChange={(e) => update({ sort: e.target.value as State["sort"] })} className={`${BUTTON} pr-1`}>
            {SORTS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <CopyLinkButton />
        </div>
        <div className="mb-4 mt-3">
          <ActiveFilters chips={chips} onClear={clear} count={count} total={all?.length ?? total} noun={["investor", "investors"]} />
        </div>
        {/* On phones the filter panel (where the failure shows) sits in a closed sheet: say it here too. */}
        {failed && pristine && (
          <div className="mb-4 lg:hidden">
            <ListLoading failed retry={retry} label="" />
          </div>
        )}
        {!ready && !pristine ? (
          <ListLoading failed={failed} retry={retry} label="Loading investors" rows={4} />
        ) : !rows.length ? (
          <p className="rounded-lg border border-dashed border-border-strong px-6 py-12 text-center text-sm text-fg-subtle">No investor matches these filters.</p>
        ) : (
          // A card per investor in a narrow column (.tbl-cards), columns where they fit.
          <TableScroll label="Investors table" className="tbl-cards tbl-hover">
            <table role="table">
              <caption className="sr-only">Investors in the archive, {SORTS.find((o) => o.id === s.sort)?.label.toLowerCase()}</caption>
              <thead role="rowgroup">
                <tr role="row">
                  <th scope="col" role="columnheader" className="min-w-[9rem]">
                    Investor
                  </th>
                  <th scope="col" role="columnheader" className="min-w-[15rem]">
                    Companies
                  </th>
                  <th scope="col" role="columnheader" className="min-w-[11rem]">
                    Stages
                  </th>
                  <th scope="col" role="columnheader" className="num">
                    Rounds
                  </th>
                  <th scope="col" role="columnheader" className="num">
                    Led
                  </th>
                </tr>
              </thead>
              <tbody role="rowgroup">
                {rows.slice(0, shown).map((i) => (
                  <tr key={i.slug} role="row">
                    <th scope="row" role="rowheader" className="font-medium">
                      <Link href={`/investors/${i.slug}`} className="text-fg hover:underline pointer-coarse:-my-2.5 pointer-coarse:inline-block pointer-coarse:py-2.5">
                        {i.name}
                      </Link>
                    </th>
                    <td role="cell" data-label="Companies">
                      <span className="tbl-v">
                        {i.companies.slice(0, SHOWN_COMPANIES).map((c, n) => (
                          <span key={c}>
                            {n > 0 && ", "}
                            <Link href={`/${c}`} className="hover:text-fg hover:underline">
                              {bySlug.get(c)?.name ?? c}
                            </Link>
                          </span>
                        ))}
                        {i.companies.length > SHOWN_COMPANIES && (
                          <Link href={`/investors/${i.slug}`} className="whitespace-nowrap text-fg-subtle hover:text-fg hover:underline">
                            {" "}
                            +{i.companies.length - SHOWN_COMPANIES} more
                          </Link>
                        )}
                      </span>
                    </td>
                    <td role="cell" data-label="Stages" className="text-xs leading-5 text-fg-subtle">
                      <span className="tbl-v">
                        {[...(i.stages ?? [])].sort((a, b) => STAGES.findIndex((x) => x.id === a) - STAGES.findIndex((x) => x.id === b)).map(stageLabel).join(", ")}
                      </span>
                    </td>
                    <td role="cell" data-label="Rounds" className="num">
                      <span className="tbl-v">{i.stakes.length}</span>
                    </td>
                    <td role="cell" data-label="Led" className="num">
                      <span className="tbl-v">{i.leads || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
        {(ready || pristine) && count > shown && (
          <div className="mt-4 flex justify-center">
            {/* Enabled once every investor has arrived (the page only carries the first ones). */}
            <button type="button" onClick={() => setShown((n) => n + INVESTORS_PAGE)} className={BUTTON} disabled={!ready}>
              Show {Math.min(INVESTORS_PAGE, count - shown)} more of {count - shown} remaining
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
