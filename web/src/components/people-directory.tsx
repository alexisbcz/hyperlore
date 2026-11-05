"use client";

import Link from "next/link";
import { useState } from "react";
import { PEOPLE_PAGE } from "@/lib/directory";
import type { DirectoryPerson as Person } from "@/lib/types";
import {
  ActiveFilters,
  BUTTON,
  CopyLinkButton,
  FacetGroup,
  type FacetOption,
  FilterSheet,
  ListLoading,
  SearchInput,
  toggle,
  type UrlState,
  useFullList,
  WithUrlState,
} from "./filters";
import { Avatar } from "./lore";

type State = { q: string; role: string[]; company: string[]; photo: boolean };

const ROLES = [
  { id: "founder", label: "Founder" },
  { id: "investor", label: "Investor / angel" },
  { id: "employee", label: "Employee / executive" },
  { id: "none", label: "Not linked to a company" },
];

const list = (p: URLSearchParams, k: string) => (p.get(k) ?? "").split(",").filter(Boolean);
const parse = (p: URLSearchParams): State => ({ q: (p.get("q") ?? "").slice(0, 100), role: list(p, "role"), company: list(p, "company"), photo: p.get("photo") === "1" });
function serialize(s: State) {
  const p = new URLSearchParams();
  if (s.q.trim()) p.set("q", s.q.trim());
  if (s.role.length) p.set("role", s.role.join(","));
  if (s.company.length) p.set("company", s.company.join(","));
  if (s.photo) p.set("photo", "1");
  return p.toString().replace(/%2C/g, ",");
}

const rolesOf = (p: Person) => (p.roles?.length ? p.roles : ["none"]);

/**
 * The page renders the first people by name (`initial`); everyone, which the filters work on, is
 * fetched from `src` after load. Shipping all of them made /people weigh 600 KB.
 */
export function PeopleDirectory({ initial, total, companyNames, src }: { initial: Person[]; total: number; companyNames: Record<string, string>; src: string }) {
  const { items, failed, retry } = useFullList<Person>(undefined, src);
  return (
    <WithUrlState parse={parse} serialize={serialize}>
      {(state) => <Directory people={items} initial={initial} total={total} companyNames={companyNames} failed={failed} retry={retry} state={state} />}
    </WithUrlState>
  );
}

function Directory({
  people: all,
  initial,
  total,
  companyNames,
  failed,
  retry,
  state: [s, set],
}: {
  people: Person[] | null;
  initial: Person[];
  total: number;
  companyNames: Record<string, string>;
  failed: boolean;
  retry: () => void;
  state: UrlState<State>;
}) {
  const [shown, setShown] = useState(PEOPLE_PAGE);
  const update = (patch: Partial<State>, opts?: { replace?: boolean }) => {
    setShown(PEOPLE_PAGE);
    set({ ...s, ...patch }, opts);
  };
  // Until everyone has arrived, the unfiltered view is the people the page came with; any other view
  // waits for the full list.
  const ready = all !== null;
  const pristine = serialize(s) === "";
  const people = all ?? initial;
  const name = (slug: string) => companyNames[slug] ?? slug;

  const match = (p: Person, skip?: "role" | "company" | "photo") => {
    const q = s.q.trim().toLowerCase();
    if (q && ![p.name, ...p.aliases, p.summary ?? ""].some((x) => x.toLowerCase().includes(q))) return false;
    if (skip !== "photo" && s.photo && !p.photo) return false;
    if (skip !== "role" && s.role.length && !s.role.some((r) => rolesOf(p).includes(r as never))) return false;
    if (skip !== "company" && s.company.length && !s.company.some((c) => p.companies?.includes(c))) return false;
    return true;
  };
  const rows = ready ? people.filter((p) => match(p)) : pristine ? initial : [];
  const count = ready ? rows.length : pristine ? total : 0;

  const options = (facet: "role" | "company"): FacetOption[] => {
    const counts = new Map<string, number>();
    for (const p of people.filter((p) => match(p, facet)))
      for (const v of facet === "role" ? rolesOf(p) : (p.companies ?? [])) counts.set(v, (counts.get(v) ?? 0) + 1);
    if (facet === "role") return ROLES.map((r) => ({ value: r.id, label: r.label, count: counts.get(r.id) ?? 0 }));
    const all = new Set([...people.flatMap((p) => p.companies ?? []), ...s.company]);
    return [...all]
      .map((value) => ({ value, label: name(value), count: counts.get(value) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  };

  const chips = [
    ...(s.q.trim() ? [{ key: "q", label: `“${s.q.trim()}”`, onRemove: () => update({ q: "" }) }] : []),
    ...s.role.map((r) => ({ key: `role:${r}`, label: ROLES.find((x) => x.id === r)?.label ?? r, onRemove: () => update({ role: s.role.filter((x) => x !== r) }) })),
    ...s.company.map((c) => ({ key: `company:${c}`, label: name(c), onRemove: () => update({ company: s.company.filter((x) => x !== c) }) })),
    ...(s.photo ? [{ key: "photo", label: "With photo", onRemove: () => update({ photo: false }) }] : []),
  ];

  const panel = !ready ? (
    <ListLoading failed={failed} retry={retry} label="Loading filters" />
  ) : (
    <div>
      <FacetGroup title="Role" options={options("role")} selected={s.role} onToggle={(v) => update({ role: toggle(s.role, v) })} />
      <FacetGroup title="Company" options={options("company")} selected={s.company} onToggle={(v) => update({ company: toggle(s.company, v) })} limit={8} />
      <FacetGroup
        title="Photo"
        options={[{ value: "1", label: "Has a photo", count: people.filter((p) => p.photo && match(p, "photo")).length }]}
        selected={s.photo ? ["1"] : []}
        onToggle={() => update({ photo: !s.photo })}
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
          <SearchInput value={s.q} onChange={(q) => update({ q }, { replace: true })} placeholder="Search people…" label="Search people" />
          <FilterSheet active={chips.length} resultLabel={`Show ${count} people`}>
            {panel}
          </FilterSheet>
          <CopyLinkButton />
        </div>
        <div className="mb-4 mt-3">
          <ActiveFilters chips={chips} onClear={() => update({ q: "", role: [], company: [], photo: false })} count={count} total={all?.length ?? total} noun={["person", "people"]} />
        </div>
        {/* On phones the filter panel (where the failure shows) sits in a closed sheet: say it here too. */}
        {failed && pristine && (
          <div className="mb-4 lg:hidden">
            <ListLoading failed retry={retry} label="" />
          </div>
        )}
        {!ready && !pristine ? (
          <ListLoading failed={failed} retry={retry} label="Loading people" rows={4} />
        ) : !rows.length ? (
          <p className="rounded-lg border border-dashed border-border-strong px-6 py-12 text-center text-sm text-fg-subtle">No one matches these filters.</p>
        ) : (
          <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {rows.slice(0, shown).map((p) => (
              <li key={p.slug} className="bg-bg">
                <Link href={`/people/${p.slug}`} className="flex h-full gap-3 p-4 transition-colors hover:bg-bg-subtle focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent">
                  <Avatar photo={p.photo} name={p.name} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-fg">{p.name}</span>
                    {(p.roles?.length || p.companies?.length) ? (
                      <span className="block truncate text-xs text-fg-subtle">
                        {[p.roles?.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(", "), p.companies?.slice(0, 3).map(name).join(", ")].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                    {p.summary && <span className="mt-1 line-clamp-2 text-pretty text-sm text-fg-muted">{p.summary}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {(ready || pristine) && count > shown && (
          <div className="mt-4 flex justify-center">
            {/* Enabled once everyone has arrived (the page only carries the first people). */}
            <button type="button" onClick={() => setShown((n) => n + PEOPLE_PAGE)} className={BUTTON} disabled={!ready}>
              Show {Math.min(PEOPLE_PAGE, count - shown)} more of {count - shown} remaining
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
