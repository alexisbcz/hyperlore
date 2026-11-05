"use client";

import Link from "next/link";
import {
  IconBuildingSkyscraper,
  IconCalendar,
  IconCalendarEvent,
  IconCoins,
  IconFileText,
  IconHash,
  IconLayoutKanban,
  IconMap,
  IconMoneybag,
  IconProgressCheck,
  IconStairs,
  IconTable,
  IconTag,
  IconTrendingUp,
  IconUser,
  IconUsers,
  IconWorldWww,
  IconBlockquote,
  IconTimelineEvent,
} from "twenty-ui/icon";
import { Chip, Tag } from "twenty-ui/primitives/data-display";
import { RecordTable, type Column, type Facet, type View } from "../table";
import type { CompanyRow } from "../data";
import { CompanyChip, CompanyLogo, PersonChip, StageTag, StatusTag, formatDate, usd, year, T } from "../ui";
import { STAGES, STATUSES, countryName, stageLabel, stageRank, statusLabel } from "@/lib/directory";

export function Flag({ code }: { code?: string }) {
  if (!code || !/^[a-z]{2}$/i.test(code)) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`/flags/${code.toLowerCase()}.svg`} alt="" width={14} height={10} style={{ borderRadius: 2, objectFit: "cover", flexShrink: 0 }} />;
}

const num = (n?: number) => (n ? n.toLocaleString("en") : "");
const sum = (rows: CompanyRow[], f: (r: CompanyRow) => number | undefined) => rows.reduce((s, r) => s + (f(r) ?? 0), 0);

const COLUMNS: Column<CompanyRow>[] = [
  {
    id: "name",
    label: "Name",
    icon: IconBuildingSkyscraper,
    width: 210,
    render: (r) => <CompanyChip slug={r.slug} name={r.name} logo={r.logo} />,
    sort: (r) => r.name.toLowerCase(),
    csv: (r) => r.name,
  },
  { id: "status", label: "Status", icon: IconProgressCheck, width: 104, render: (r) => <StatusTag status={r.status} />, sort: (r) => statusLabel(r.status) },
  { id: "stage", label: "Last stage", icon: IconStairs, width: 116, render: (r) => <StageTag stage={r.stage} />, sort: (r) => (r.stage ? stageRank(r.stage) : undefined), csv: (r) => (r.stage ? stageLabel(r.stage) : "") },
  {
    id: "raised",
    label: "Raised",
    icon: IconCoins,
    width: 100,
    align: "end",
    render: (r) => <span className="tw-num">{usd(r.raisedUsd)}</span>,
    sort: (r) => r.raisedUsd || undefined,
    agg: (rows) => (
      <>
        <span className="tw-agg">Sum</span>
        <span className="tw-num">{usd(sum(rows, (r) => r.raisedUsd))}</span>
      </>
    ),
  },
  {
    id: "valuation",
    label: "Valuation",
    icon: IconTrendingUp,
    width: 104,
    align: "end",
    render: (r) => <span className="tw-num">{usd(r.valuationUsd)}</span>,
    sort: (r) => r.valuationUsd,
    agg: (rows) => (
      <>
        <span className="tw-agg">Max</span>
        <span className="tw-num">{usd(Math.max(0, ...rows.map((r) => r.valuationUsd ?? 0)))}</span>
      </>
    ),
  },
  { id: "lastRound", label: "Last round", icon: IconCalendar, width: 112, render: (r) => <span className="tw-num tw-cell-muted">{formatDate(r.lastRoundDate)}</span>, sort: (r) => r.lastRoundDate },
  { id: "founded", label: "Founded", icon: IconCalendarEvent, width: 84, align: "end", render: (r) => <span className="tw-num">{year(r.founded)}</span>, sort: (r) => r.founded },
  {
    id: "hq",
    label: "HQ",
    icon: IconMap,
    width: 160,
    render: (r) =>
      r.country || r.city ? (
        <span className="tw-cell-row">
          <Flag code={r.country} />
          <span className="tw-shrink" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
            {r.city ?? countryName(r.country)}
          </span>
        </span>
      ) : null,
    sort: (r) => (r.city ?? countryName(r.country)) || undefined,
  },
  {
    id: "categories",
    label: "Categories",
    icon: IconTag,
    width: 220,
    render: (r) => (
      <span className="tw-cell-row">
        {r.categories.map((c) => (
          <Tag key={c} color="gray" truncate={false}>
            {c}
          </Tag>
        ))}
      </span>
    ),
    sort: (r) => r.categories[0],
    csv: (r) => r.categories.join("; "),
  },
  {
    id: "founders",
    label: "Founders",
    icon: IconUser,
    width: 230,
    render: (r) => (
      <span className="tw-cell-row">
        {r.founders.map((f) => (
          <PersonChip key={f.name} slug={f.slug} name={f.name} photo={f.photo} />
        ))}
      </span>
    ),
    sort: (r) => r.founders[0]?.name,
    csv: (r) => r.founders.map((f) => f.name).join("; "),
  },
  {
    id: "leads",
    label: "Lead investors",
    icon: IconMoneybag,
    width: 240,
    render: (r) => (
      <span className="tw-cell-row">
        {r.leads.map((l) => (
          <Chip key={l.slug} variant="soft" render={<Link href={`${T}/investors/${l.slug}`} />} clickable>
            {l.name}
          </Chip>
        ))}
      </span>
    ),
    sort: (r) => r.leads[0]?.name,
    csv: (r) => r.leads.map((l) => l.name).join("; "),
  },
  { id: "investors", label: "Investors", icon: IconUsers, width: 92, align: "end", render: (r) => <span className="tw-num">{num(r.investors)}</span>, sort: (r) => r.investors || undefined },
  { id: "rounds", label: "Rounds", icon: IconHash, width: 84, align: "end", render: (r) => <span className="tw-num">{num(r.rounds)}</span>, sort: (r) => r.rounds || undefined },
  {
    id: "events",
    label: "Events",
    icon: IconTimelineEvent,
    width: 84,
    align: "end",
    render: (r) => <span className="tw-num">{num(r.events)}</span>,
    sort: (r) => r.events,
    agg: (rows) => (
      <>
        <span className="tw-agg">Sum</span>
        <span className="tw-num">{num(sum(rows, (r) => r.events))}</span>
      </>
    ),
  },
  {
    id: "sources",
    label: "Sources",
    icon: IconFileText,
    width: 88,
    align: "end",
    render: (r) => <span className="tw-num">{num(r.sources)}</span>,
    sort: (r) => r.sources,
    agg: (rows) => (
      <>
        <span className="tw-agg">Sum</span>
        <span className="tw-num">{num(sum(rows, (r) => r.sources))}</span>
      </>
    ),
  },
  { id: "quotes", label: "Quotes", icon: IconBlockquote, width: 84, align: "end", render: (r) => <span className="tw-num">{num(r.quotes)}</span>, sort: (r) => r.quotes || undefined },
  { id: "employees", label: "Employees", icon: IconUsers, width: 100, align: "end", render: (r) => <span className="tw-num">{num(r.employees)}</span>, sort: (r) => r.employees },
  {
    id: "website",
    label: "Website",
    icon: IconWorldWww,
    width: 170,
    render: (r) =>
      r.website ? (
        <a href={r.website} target="_blank" rel="noreferrer" className="tw-link tw-cell-muted">
          {r.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
        </a>
      ) : null,
    sort: (r) => r.website,
  },
  { id: "lastEvent", label: "Last activity", icon: IconCalendar, width: 116, render: (r) => <span className="tw-num tw-cell-muted">{formatDate(r.lastEvent)}</span>, sort: (r) => r.lastEvent },
];

const FACETS: Facet<CompanyRow>[] = [
  { id: "status", label: "Status", icon: IconProgressCheck, values: (r) => [r.status], label_: statusLabel, order: (v) => STATUSES.findIndex((s) => s.id === v) },
  { id: "stage", label: "Last stage", icon: IconStairs, values: (r) => (r.stage ? [r.stage] : []), label_: stageLabel, order: stageRank },
  { id: "category", label: "Category", icon: IconTag, values: (r) => r.categories },
  { id: "country", label: "Country", icon: IconMap, values: (r) => (r.country ? [r.country] : []), label_: countryName },
  { id: "decade", label: "Founded", icon: IconCalendarEvent, values: (r) => (r.founded ? [`${r.founded.slice(0, 3)}0s`] : []), order: (v) => -Number(v.slice(0, 4)) },
  { id: "lead", label: "Lead investor", icon: IconMoneybag, values: (r) => r.leads.map((l) => l.name) },
];

function Card({ r }: { r: CompanyRow }) {
  return (
    <Link href={`${T}/${r.slug}`} className="tw-kcard">
      <div className="tw-kcard-head">
        <CompanyLogo name={r.name} logo={r.logo} size="md" />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
      </div>
      <div className="tw-kfield">
        <IconCoins size={14} aria-hidden />
        <span>Raised</span>
        <span className="tw-num">{usd(r.raisedUsd) || "—"}</span>
      </div>
      <div className="tw-kfield">
        <IconTrendingUp size={14} aria-hidden />
        <span>Valuation</span>
        <span className="tw-num">{usd(r.valuationUsd) || "—"}</span>
      </div>
      <div className="tw-kfield">
        <IconMap size={14} aria-hidden />
        <span>HQ</span>
        <span>{r.city ?? (countryName(r.country) || "—")}</span>
      </div>
      <div className="tw-kfield">
        <IconCalendar size={14} aria-hidden />
        <span>Last round</span>
        <span className="tw-num">{formatDate(r.lastRoundDate) || "—"}</span>
      </div>
    </Link>
  );
}

function Board({ rows, groups }: { rows: CompanyRow[]; groups: { id: string; tag: React.ReactNode; match: (r: CompanyRow) => boolean }[] }) {
  return (
    <div className="tw-board">
      {groups.map((g) => {
        const items = rows.filter(g.match);
        if (!items.length) return null;
        return (
          <div key={g.id} className="tw-col">
            <div className="tw-col-head">
              {g.tag}
              <span className="tw-col-count tw-num">{items.length}</span>
              <span className="tw-col-sum tw-num">{usd(sum(items, (r) => r.raisedUsd))}</span>
            </div>
            {items.slice(0, 60).map((r) => (
              <Card key={r.slug} r={r} />
            ))}
            {items.length > 60 && <div className="tw-table-more">+{items.length - 60} more — filter to narrow</div>}
          </div>
        );
      })}
    </div>
  );
}

const STAGE_GROUPS = [
  ...STAGES.map((s) => ({ id: s.id, tag: <StageTag stage={s.id} />, match: (r: CompanyRow) => r.stage === s.id })),
  { id: "none", tag: <Tag color="transparent" variant="outline" borderStyle="dashed">No rounds</Tag>, match: (r: CompanyRow) => !r.stage },
];
const STATUS_GROUPS = STATUSES.map((s) => ({ id: s.id, tag: <StatusTag status={s.id} />, match: (r: CompanyRow) => r.status === s.id }));

const views = (name: string): View<CompanyRow>[] => [
  { id: "table", label: name, icon: IconTable },
  { id: "stage", label: "By last stage", icon: IconLayoutKanban, render: (rows) => <Board rows={rows} groups={STAGE_GROUPS} /> },
  { id: "status", label: "By status", icon: IconLayoutKanban, render: (rows) => <Board rows={rows} groups={STATUS_GROUPS} /> },
];

const searchText = (r: CompanyRow) => [r.name, r.summary, r.city, countryName(r.country), ...r.categories, ...r.founders.map((f) => f.name), ...r.leads.map((l) => l.name)].join(" ");

/** `name` titles the table view, e.g. "Fintech companies" on a category page. */
export function CompaniesView({ rows, name = "All companies" }: { rows: CompanyRow[]; name?: string }) {
  return (
    <RecordTable
      name={name}
      rows={rows}
      columns={COLUMNS}
      rowKey={(r) => r.slug}
      search={searchText}
      facets={FACETS}
      defaultSort={{ id: "raised", dir: "desc" }}
      views={views(name)}
      csvName="hyperlore-companies"
      searchPlaceholder="Search companies"
    />
  );
}
