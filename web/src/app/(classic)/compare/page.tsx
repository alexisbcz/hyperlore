import { Flag } from "@/components/flag";
import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { CompanyHeading, FundingTimeline, RoundsTable, ValuationChart, sharedAxis } from "@/components/compare-charts";
import { ComparePicker } from "@/components/compare-picker";
import { Avatar, CompanyMark, formatDate, formatUsd, kindLabel } from "@/components/lore";
import { Page } from "@/components/page";
import { TableScroll } from "@/components/table-scroll";
import { MAX_COMPARE, categoryLabel, countryName, isSecondaryStage, stageLabel, statusLabel } from "@/lib/directory";
import { type ComparedCompany, getComparison, listCompanies } from "@/lib/lore";
import { isLive } from "@/lib/store";
import { PanelSkeleton } from "@/components/skeletons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Compare companies",
  description:
    "Two to four companies side by side: profile, funding rounds on a shared timeline, valuations, key events by year and founders, every figure sourced.",
  path: "/compare",
});

// Comparisons people reach for, offered when fewer than two companies are picked (only those in the archive).
const SUGGESTED = [
  ["vercel", "netlify", "render"],
  ["revolut", "monzo", "n26"],
  ["brex", "ramp", "mercury"],
  ["anthropic", "openai", "mistral"],
  ["stripe", "plaid", "wise"],
  ["coursera", "udemy", "udacity"],
  ["supabase", "railway", "flyio"],
];

export default function ComparePage({ searchParams }: PageProps<"/compare">) {
  return (
    <Page>
      <h1 className="text-balance text-3xl font-semibold text-fg">Compare companies</h1>
      <p className="mt-2 max-w-3xl text-pretty text-fg-muted">
        Up to {MAX_COMPARE} companies side by side, on one time axis. Every figure comes from the same sourced records as the company pages.
      </p>
      <Suspense fallback={<PanelSkeleton label="Loading comparison" />}>
        <Comparison searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function comparisonData(slugs: string[]) {
  const [items, all] = await Promise.all([getComparison(slugs), listCompanies()]);
  return { items, all: all.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon, iconDark: c.iconDark })) };
}

/**
 * From the snapshot, each comparison's data is computed once per deployment. The query is first
 * narrowed to companies in the archive (deduped, at most four), so stray or repeated slugs share an
 * entry.
 */
async function knownSlugs(slugs: string[]) {
  const known = new Set(await cachedSlugs());
  return [...new Set(slugs)].filter((s) => known.has(s)).slice(0, MAX_COMPARE);
}

async function cachedSlugs() {
  "use cache";
  cacheLife("max");
  return (await listCompanies()).map((c) => c.slug);
}

async function cachedComparisonData(slugs: string[]) {
  "use cache";
  cacheLife("max");
  return comparisonData(slugs);
}

async function Comparison({ searchParams }: { searchParams: PageProps<"/compare">["searchParams"] }) {
  const raw = (await searchParams).c;
  const slugs = (Array.isArray(raw) ? raw.join(",") : (raw ?? ""))
    .split(",")
    .map((s) => s.trim().toLowerCase().slice(0, 60))
    .filter(Boolean);
  // Per request either way: without it, the query-dependent view would also be inlined into the page's
  // prefetch payload, doubling the HTML.
  await connection();
  const { items, all } = await (isLive() ? comparisonData(slugs) : cachedComparisonData(await knownSlugs(slugs)));
  const options = all.map((c) => ({ slug: c.slug, name: c.name })).sort((a, b) => a.name.localeCompare(b.name));
  const known = new Set(all.map((c) => c.slug));
  const suggestions = SUGGESTED.map((g) => g.filter((s) => known.has(s))).filter((g) => g.length >= 2);

  return (
    <div className="mt-6 space-y-12">
      <ComparePicker selected={items.map((i) => ({ slug: i.company.slug, name: i.company.name }))} options={options} />
      {items.length < 2 ? (
        <section aria-labelledby="suggested-title">
          <h2 id="suggested-title" className="text-lg font-semibold text-fg">
            {items.length ? "Add at least one more company" : "Start with a comparison"}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((g) => {
              const group = g.map((s) => all.find((c) => c.slug === s)!);
              return (
                <li key={g.join()}>
                  <Link
                    href={`/compare?c=${[...new Set([...items.map((i) => i.company.slug), ...g])].slice(0, MAX_COMPARE).join(",")}`}
                    className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <span className="flex -space-x-1.5">
                      {group.map((c) => (
                        <CompanyMark key={c.slug} logo={c.icon} dark={c.iconDark} name={c.name} size="sm" />
                      ))}
                    </span>
                    <span className="text-sm text-fg">{group.map((c) => c.name).join(" vs ")}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <Sections items={items} />
      )}
    </div>
  );
}

function Section({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} className="min-w-0">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-fg">
          {title}
        </h2>
        {aside && <span className="text-sm text-fg-subtle">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

const Dash = () => <span className="text-fg-subtle">—</span>;

/** A row label and one cell per company, in a table that scrolls inside itself on phones. */
function FactsTable({ items }: { items: ComparedCompany[] }) {
  const rows: { label: string; cell: (i: ComparedCompany) => ReactNode }[] = [
    { label: "Founded", cell: ({ company: c }) => (c.founded ? <span className="tabular-nums">{formatDate(c.founded)}</span> : <Dash />) },
    { label: "HQ", cell: ({ company: c }) => ([c.city, countryName(c.country)].filter(Boolean).length ? <><Flag code={c.country} className="mr-1.5" />{[c.city, countryName(c.country)].filter(Boolean).join(", ")}</> : c.hq) || <Dash /> },
    {
      label: "Status",
      cell: ({ company: c }) => (
        <>
          {statusLabel(c.status)}
          {c.status === "acquired" && c.acquiredBy && <span className="text-fg-subtle"> by {c.acquiredBy}</span>}
          {c.stock && <span className="font-mono text-xs text-fg-subtle"> {c.stock}</span>}
        </>
      ),
    },
    { label: "Categories", cell: ({ company: c }) => (c.categories.length ? c.categories.slice(0, 4).map(categoryLabel).join(", ") : <Dash />) },
    {
      label: "Employees",
      cell: ({ company: c }) =>
        c.employees ? (
          <span className="tabular-nums">
            {c.employees.count.toLocaleString("en")}
            {c.employees.asOf && <span className="text-fg-subtle"> ({c.employees.asOf})</span>}
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
            <span className="font-medium tabular-nums text-fg">{c.raisedUsd ? formatUsd(c.raisedUsd) : "—"}</span>
            {native > 0 && (
              <span className="block text-xs text-fg-subtle">
                + {native} {native === 1 ? "round" : "rounds"} in other currencies
              </span>
            )}
          </>
        );
      },
    },
    { label: "Rounds", cell: ({ rounds }) => <span className="tabular-nums">{rounds.length || "—"}</span> },
    {
      label: "Last round",
      cell: ({ company: c }) =>
        c.lastRound ? (
          <>
            {stageLabel(c.lastRound.stage)}
            {c.lastRound.amountUsd ? <span className="tabular-nums"> · {formatUsd(c.lastRound.amountUsd)}</span> : null}
            <span className="block text-xs text-fg-subtle">{formatDate(c.lastRound.date)}</span>
          </>
        ) : (
          <Dash />
        ),
    },
    { label: "Latest valuation", cell: ({ company: c }) => (c.valuationUsd ? <span className="tabular-nums">{formatUsd(c.valuationUsd)}</span> : <Dash />) },
    {
      label: "Investors",
      cell: ({ company: c }) =>
        c.investors.length ? (
          <>
            <span className="tabular-nums">{c.investors.length}</span>
            <span className="block text-xs text-fg-subtle">
              {c.investors
                .filter((i) => i.lead)
                .slice(0, 3)
                .map((i) => i.name)
                .join(", ")}
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
          <a href={c.website} target="_blank" rel="noreferrer" className="break-all text-fg text-link underline decoration-accent/45 underline-offset-2 hover:decoration-accent">
            {c.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
          </a>
        ) : (
          <Dash />
        ),
    },
    { label: "In the archive", cell: ({ company: c }) => <span className="tabular-nums">{c.events} events · {c.sources} sources</span> },
  ];
  return (
    // The row labels stay pinned while the companies scroll past them on phones.
    <TableScroll label="Profile facts, one column per company">
      <table style={{ minWidth: `${6 + items.length * 11}rem` }}>
        <caption className="sr-only">Profile facts, one column per company</caption>
        <thead>
          <tr>
            <td className="tbl-pin w-24 sm:w-32" />
            {items.map((it, i) => (
              <th key={it.company.slug} scope="col" className="py-2.5 text-sm font-normal text-fg whitespace-normal">
                <CompanyHeading c={it.company} i={i} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className="tbl-pin text-xs leading-5 font-medium text-fg-subtle">
                {row.label}
              </th>
              {items.map((it) => (
                <td key={it.company.slug}>
                  {row.cell(it)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

const PER_CELL = 3;
const PRIORITY = ["founding", "rename", "acquired", "acquisition", "pivot", "rebrand", "launch", "product", "milestone", "open-source", "layoff", "controversy"];

function EventsByYear({ items }: { items: ComparedCompany[] }) {
  const years = [...new Set(items.flatMap((i) => i.events.map((e) => e.date.slice(0, 4))))].sort();
  if (!years.length) return <p className="text-sm text-fg-subtle">No key events on record yet.</p>;
  return (
    <TableScroll label="Key events by year, one column per company">
      <table style={{ minWidth: `${4 + items.length * 12}rem` }}>
        <caption className="sr-only">Key events by year, one column per company</caption>
        <thead>
          <tr>
            <td className="tbl-pin w-16" />
            {items.map((it, i) => (
              <th key={it.company.slug} scope="col" className="py-2.5 text-sm font-normal text-fg whitespace-normal">
                <CompanyHeading c={it.company} i={i} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((y) => (
            <tr key={y}>
              <th scope="row" className="tbl-pin font-mono text-xs leading-5 font-medium text-fg-subtle">
                {y}
              </th>
              {items.map((it) => {
                const inYear = it.events.filter((e) => e.date.startsWith(y));
                const shown = [...inYear].sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind) || a.date.localeCompare(b.date)).slice(0, PER_CELL);
                return (
                  <td key={it.company.slug}>
                    {shown.length ? (
                      <ul className="space-y-1.5">
                        {shown
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map((e) => (
                            <li key={e.id} className="text-[13px] leading-snug">
                              <span className="block text-[11px] text-fg-subtle">{kindLabel(e.kind)}</span>
                              <a href={`/${it.company.slug}#${e.id}`} className="text-fg-muted hover:text-fg hover:underline">
                                {e.title}
                              </a>
                            </li>
                          ))}
                        {inYear.length > PER_CELL && (
                          <li>
                            <a href={`/${it.company.slug}#timeline`} className="text-xs text-fg-subtle hover:text-fg">
                              +{inYear.length - PER_CELL} more in {y}
                            </a>
                          </li>
                        )}
                      </ul>
                    ) : null}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

function Founders({ items }: { items: ComparedCompany[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((it, i) => (
        <li key={it.company.slug} className="rounded-lg border border-border p-4">
          <CompanyHeading c={it.company} i={i} />
          {it.company.founders.length ? (
            <ul className="mt-3 space-y-2">
              {it.company.founders.map((f) => (
                <li key={f.name} className="flex items-center gap-2 text-sm">
                  <Avatar photo={f.photo} name={f.name} size="sm" />
                  {f.slug ? (
                    <Link href={`/people/${f.slug}`} className="text-fg hover:underline">
                      {f.name}
                    </Link>
                  ) : (
                    <span className="text-fg">{f.name}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-fg-subtle">No founders on record yet.</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function Sections({ items }: { items: ComparedCompany[] }) {
  const axis = sharedAxis(items.flatMap((i) => [i.company.founded ?? "", ...i.rounds.map((r) => r.date)]));
  const slugs = items.map((i) => i.company.slug).join(",");
  return (
    <>
      <Section id="profile" title="Profile">
        <FactsTable items={items} />
      </Section>
      <Section
        id="funding"
        title="Funding timeline"
        aside={
          <Link href={`/rounds?company=${slugs}`} className="hover:text-fg">
            These rounds in the feed →
          </Link>
        }
      >
        {items.some((i) => i.rounds.length) ? (
          <div className="space-y-6">
            <FundingTimeline items={items} axis={axis} />
            <details className="group/table">
              <summary className="w-fit cursor-pointer rounded text-sm text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-accent">
                Show every round as a table
              </summary>
              <div className="mt-3">
                <RoundsTable items={items} />
              </div>
            </details>
          </div>
        ) : (
          <p className="text-sm text-fg-subtle">No funding rounds on record for these companies.</p>
        )}
      </Section>
      <Section id="valuations" title="Valuations">
        <ValuationChart items={items} axis={axis} />
      </Section>
      <Section id="events" title="Key events by year" aside="Founding, renames, launches, acquisitions, pivots and milestones">
        <EventsByYear items={items} />
      </Section>
      <Section id="founders" title="Founders">
        <Founders items={items} />
      </Section>
    </>
  );
}
