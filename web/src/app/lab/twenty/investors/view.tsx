"use client";

import Link from "next/link";
import { IconBuildingSkyscraper, IconCalendar, IconFileText, IconHash, IconMoneybag, IconStairs, IconStar } from "twenty-ui/icon";
import { Avatar, Chip, Tag } from "twenty-ui/primitives/data-display";
import { RecordTable, type Column, type Facet } from "../table";
import type { InvestorRow, Logo } from "../data";
import { CompanyLogo, formatDate, T } from "../ui";
import { stageRank, STAGES } from "@/lib/directory";

type Lookup = Record<string, { name: string; logo?: Logo }>;

const stageOrder = (label: string) => stageRank(STAGES.find((s) => s.label === label)?.id);

function columns(lookup: Lookup): Column<InvestorRow>[] {
  return [
    {
      id: "name",
      label: "Name",
      icon: IconMoneybag,
      width: 230,
      render: (r) => (
        <Chip startElement={<Avatar name={r.name} colorSeed={r.name} shape="square" size="md" />} render={<Link href={`${T}/investors/${r.slug}`} />} clickable maxWidth={220}>
          {r.name}
        </Chip>
      ),
      sort: (r) => r.name.toLowerCase(),
      csv: (r) => r.name,
    },
    { id: "companies", label: "Companies", icon: IconBuildingSkyscraper, width: 110, align: "end", render: (r) => <span className="tw-num">{r.companies}</span>, sort: (r) => r.companies, agg: (rows) => <span className="tw-num"><span className="tw-agg">Sum</span>{rows.reduce((s, r) => s + r.companies, 0).toLocaleString("en")}</span> },
    { id: "leads", label: "Rounds led", icon: IconStar, width: 110, align: "end", render: (r) => <span className="tw-num">{r.leads || ""}</span>, sort: (r) => r.leads, agg: (rows) => <span className="tw-num"><span className="tw-agg">Sum</span>{rows.reduce((s, r) => s + r.leads, 0).toLocaleString("en")}</span> },
    { id: "rounds", label: "Rounds", icon: IconHash, width: 90, align: "end", render: (r) => <span className="tw-num">{r.rounds}</span>, sort: (r) => r.rounds },
    {
      id: "portfolio",
      label: "Portfolio",
      icon: IconBuildingSkyscraper,
      width: 320,
      render: (r) => (
        <span className="tw-cell-row">
          {r.portfolio.map((c) => (
            <Chip key={c} startElement={<CompanyLogo name={lookup[c]?.name ?? c} logo={lookup[c]?.logo} size="sm" />} render={<Link href={`${T}/${c}`} />} clickable>
              {lookup[c]?.name ?? c}
            </Chip>
          ))}
        </span>
      ),
      csv: (r) => r.portfolio.map((c) => lookup[c]?.name ?? c).join("; "),
    },
    {
      id: "stages",
      label: "Stages",
      icon: IconStairs,
      width: 240,
      render: (r) => (
        <span className="tw-cell-row">
          {r.stages.map((s) => (
            <Tag key={s} color="gray" truncate={false}>
              {s}
            </Tag>
          ))}
        </span>
      ),
      sort: (r) => (r.stages[0] ? stageOrder(r.stages[0]) : undefined),
      csv: (r) => r.stages.join("; "),
    },
    { id: "first", label: "First round", icon: IconCalendar, width: 112, render: (r) => <span className="tw-num tw-cell-muted">{formatDate(r.firstDate)}</span>, sort: (r) => r.firstDate },
    { id: "last", label: "Latest round", icon: IconCalendar, width: 112, render: (r) => <span className="tw-num tw-cell-muted">{formatDate(r.lastDate)}</span>, sort: (r) => r.lastDate },
    { id: "summary", label: "About", icon: IconFileText, width: 360, render: (r) => <span className="tw-cell-muted">{r.summary}</span>, csv: (r) => r.summary },
  ];
}

const FACETS: Facet<InvestorRow>[] = [
  { id: "stage", label: "Stage", icon: IconStairs, values: (r) => r.stages, order: stageOrder },
  { id: "led", label: "Leads rounds", icon: IconStar, values: (r) => [r.leads ? "Has led a round" : "Never led"] },
  { id: "active", label: "Latest round", icon: IconCalendar, values: (r) => (r.lastDate ? [r.lastDate.slice(0, 4)] : []), order: (v) => -Number(v) },
];

export function InvestorsView({ rows, lookup }: { rows: InvestorRow[]; lookup: Lookup }) {
  return (
    <RecordTable
      name="All investors"
      rows={rows}
      columns={columns(lookup)}
      rowKey={(r) => r.slug}
      search={(r) => [r.name, r.summary, ...r.portfolio.map((c) => lookup[c]?.name ?? c)].join(" ")}
      facets={FACETS}
      defaultSort={{ id: "companies", dir: "desc" }}
      csvName="hyperlore-investors"
      searchPlaceholder="Search investors"
    />
  );
}
