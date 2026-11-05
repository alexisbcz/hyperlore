"use client";

import Link from "next/link";
import { IconBuildingSkyscraper, IconCalendar, IconCoins, IconFileText, IconMap, IconMoneybag, IconStairs, IconTable, IconTag, IconTrendingUp, IconUsers, IconLayoutKanban } from "twenty-ui/icon";
import { Chip, Tag } from "twenty-ui/primitives/data-display";
import { RecordTable, type Column, type Facet, type View } from "../table";
import type { RoundTableRow } from "../data";
import { CompanyChip, CompanyLogo, SourceChip, StageTag, formatDate, money, usd, T } from "../ui";
import { Flag } from "../companies/view";
import { STAGES, countryName, stageLabel, stageRank } from "@/lib/directory";

const primary = (rows: RoundTableRow[]) => rows.filter((r) => !r.secondary);

const COLUMNS: Column<RoundTableRow>[] = [
  { id: "company", label: "Company", icon: IconBuildingSkyscraper, width: 200, render: (r) => <CompanyChip slug={r.company} name={r.companyName} logo={r.logo} />, sort: (r) => r.companyName.toLowerCase(), csv: (r) => r.companyName },
  { id: "date", label: "Date", icon: IconCalendar, width: 112, render: (r) => <span className="tw-num tw-cell-muted">{formatDate(r.date)}</span>, sort: (r) => r.date },
  { id: "stage", label: "Stage", icon: IconStairs, width: 120, render: (r) => <StageTag stage={r.stage} />, sort: (r) => stageRank(r.stage), csv: (r) => stageLabel(r.stage) },
  { id: "round", label: "Round", icon: IconTag, width: 170, render: (r) => <span className="tw-cell-muted">{r.round}</span>, sort: (r) => r.round },
  {
    id: "amount",
    label: "Amount",
    icon: IconCoins,
    width: 104,
    align: "end",
    render: (r) => <span className="tw-num">{money(r)}</span>,
    sort: (r) => r.amountUsd,
    agg: (rows) => (
      <>
        <span className="tw-agg">Sum</span>
        <span className="tw-num">{usd(primary(rows).reduce((s, r) => s + (r.amountUsd ?? 0), 0))}</span>
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
  {
    id: "leads",
    label: "Lead investors",
    icon: IconMoneybag,
    width: 260,
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
  { id: "investors", label: "Investors", icon: IconUsers, width: 92, align: "end", render: (r) => <span className="tw-num">{r.investors || ""}</span>, sort: (r) => r.investors || undefined },
  {
    id: "categories",
    label: "Categories",
    icon: IconTag,
    width: 200,
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
    id: "country",
    label: "Country",
    icon: IconMap,
    width: 140,
    render: (r) =>
      r.country ? (
        <span className="tw-cell-row">
          <Flag code={r.country} />
          {countryName(r.country)}
        </span>
      ) : null,
    sort: (r) => countryName(r.country) || undefined,
  },
  { id: "source", label: "Source", icon: IconFileText, width: 170, render: (r) => (r.source ? <SourceChip url={r.source} host={new URL(r.source).host} /> : null), csv: (r) => r.source },
];

const FACETS: Facet<RoundTableRow>[] = [
  { id: "stage", label: "Stage", icon: IconStairs, values: (r) => [r.stage], label_: stageLabel, order: stageRank },
  { id: "year", label: "Year", icon: IconCalendar, values: (r) => [r.date.slice(0, 4)], order: (v) => -Number(v) },
  { id: "category", label: "Category", icon: IconTag, values: (r) => r.categories },
  { id: "country", label: "Country", icon: IconMap, values: (r) => (r.country ? [r.country] : []), label_: countryName },
  { id: "lead", label: "Lead investor", icon: IconMoneybag, values: (r) => r.leads.map((l) => l.name) },
  { id: "company", label: "Company", icon: IconBuildingSkyscraper, values: (r) => [r.companyName] },
];

function Board({ rows }: { rows: RoundTableRow[] }) {
  return (
    <div className="tw-board">
      {STAGES.map((s) => {
        const items = rows.filter((r) => r.stage === s.id);
        if (!items.length) return null;
        return (
          <div key={s.id} className="tw-col">
            <div className="tw-col-head">
              <StageTag stage={s.id} />
              <span className="tw-col-count tw-num">{items.length}</span>
              <span className="tw-col-sum tw-num">{usd(items.reduce((t, r) => t + (r.amountUsd ?? 0), 0))}</span>
            </div>
            {items.slice(0, 50).map((r) => (
              <Link key={r.id} href={`${T}/${r.company}#${r.id}`} className="tw-kcard">
                <div className="tw-kcard-head">
                  <CompanyLogo name={r.companyName} logo={r.logo} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.companyName}</span>
                </div>
                <div className="tw-kfield">
                  <IconCoins size={14} aria-hidden />
                  <span>Amount</span>
                  <span className="tw-num">{money(r) || "—"}</span>
                </div>
                <div className="tw-kfield">
                  <IconCalendar size={14} aria-hidden />
                  <span>Date</span>
                  <span className="tw-num">{formatDate(r.date)}</span>
                </div>
                <div className="tw-kfield">
                  <IconMoneybag size={14} aria-hidden />
                  <span>Lead</span>
                  <span>{r.leads.map((l) => l.name).join(", ") || "—"}</span>
                </div>
              </Link>
            ))}
            {items.length > 50 && <div className="tw-table-more">+{items.length - 50} more — filter to narrow</div>}
          </div>
        );
      })}
    </div>
  );
}

const VIEWS: View<RoundTableRow>[] = [
  { id: "table", label: "All rounds", icon: IconTable },
  { id: "stage", label: "By stage", icon: IconLayoutKanban, render: (rows) => <Board rows={rows} /> },
];

export function RoundsView({ rows }: { rows: RoundTableRow[] }) {
  return (
    <RecordTable
      name="All rounds"
      rows={rows}
      columns={COLUMNS}
      rowKey={(r) => r.id}
      search={(r) => [r.companyName, r.round, ...r.leads.map((l) => l.name), ...r.categories, countryName(r.country)].join(" ")}
      facets={FACETS}
      defaultSort={{ id: "date", dir: "desc" }}
      views={VIEWS}
      csvName="hyperlore-rounds"
      searchPlaceholder="Search rounds"
    />
  );
}
