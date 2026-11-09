"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBook2, IconBuildingSkyscraper, IconCalendar, IconFileText, IconProgressCheck, IconTag, IconUser, IconUsers, IconWorldWww } from "twenty-ui/icon";
import { Tag } from "twenty-ui/primitives/data-display";
import { Skeleton } from "twenty-ui/primitives/feedback";
import { RecordTable, type Column, type Facet } from "../../table";
import { CompanyLogo } from "../../ui";
import { withBase } from "@/lib/base";

// One row of public/portfolios/<fund>.json (see portfolios.py): short keys, thousands of rows.
type Row = {
  /** name */ n: string;
  /** one-liner */ o?: string;
  /** batch, or year of first investment */ g?: string;
  /** status */ s?: string;
  /** industry */ i?: string;
  /** team size */ t?: number;
  /** website */ w?: string;
  /** source page */ u?: string;
  /** logo */ l?: string;
  /** former names */ f?: string[];
  /** Hyperlore slug */ h?: string;
  /** exit, e.g. "Acquired by Google" */ x?: string;
  /** founders */ b?: string;
};

const STATUS_COLOR: Record<string, "green" | "blue" | "purple" | "gray"> = { Active: "green", Public: "blue", Acquired: "purple", Inactive: "gray" };
const site = (u?: string) => u?.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

function columns(periodLabel: string): Column<Row>[] {
  return [
    {
      id: "name",
      label: "Company",
      icon: IconBuildingSkyscraper,
      width: 230,
      render: (r) => {
        const inner = (
          <span className="tw-cell-row">
            <CompanyLogo name={r.n} logo={r.l ? { src: r.l } : undefined} />
            <span className="tw-shrink" style={{ overflow: "hidden", textOverflow: "ellipsis", fontWeight: 500 }}>
              {r.n}
            </span>
          </span>
        );
        return r.h ? (
          <Link href={`/${r.h}`} className="tw-link">
            {inner}
          </Link>
        ) : (
          <a href={r.w ?? r.u} target="_blank" rel="noreferrer" className="tw-link">
            {inner}
          </a>
        );
      },
      sort: (r) => r.n.toLowerCase(),
      csv: (r) => r.n,
    },
    {
      id: "lore",
      label: "Lore",
      icon: IconBook2,
      width: 84,
      render: (r) => (r.h ? <Tag color="green" truncate={false}>Lore</Tag> : null),
      sort: (r) => (r.h ? 1 : undefined),
      csv: (r) => (r.h ? `/${r.h}` : ""),
    },
    { id: "oneliner", label: "One-liner", icon: IconFileText, width: 360, render: (r) => <span className="tw-cell-muted" title={r.o}>{r.o}</span>, csv: (r) => r.o },
    { id: "period", label: periodLabel, icon: IconCalendar, width: 100, render: (r) => <span className="tw-num tw-cell-muted">{r.g}</span>, sort: (r) => r.g },
    {
      id: "status",
      label: "Status",
      icon: IconProgressCheck,
      width: 190,
      render: (r) =>
        r.x ? (
          <span className="tw-cell-muted" title={r.x}>{r.x}</span>
        ) : r.s ? (
          <Tag color={STATUS_COLOR[r.s] ?? "gray"} truncate={false}>{r.s}</Tag>
        ) : null,
      sort: (r) => r.x ?? r.s,
      csv: (r) => r.x ?? r.s,
    },
    { id: "industry", label: "Industry", icon: IconTag, width: 200, render: (r) => (r.i ? <Tag color="gray">{r.i}</Tag> : null), sort: (r) => r.i },
    { id: "founders", label: "Founders", icon: IconUser, width: 240, render: (r) => <span className="tw-cell-muted" title={r.b}>{r.b}</span>, sort: (r) => r.b, csv: (r) => r.b },
    { id: "team", label: "Team", icon: IconUsers, width: 84, align: "end", render: (r) => <span className="tw-num">{r.t ?? ""}</span>, sort: (r) => r.t },
    {
      id: "website",
      label: "Website",
      icon: IconWorldWww,
      width: 190,
      render: (r) =>
        r.w ? (
          <a href={r.w} target="_blank" rel="noreferrer" className="tw-link tw-cell-muted">
            {site(r.w)}
          </a>
        ) : null,
      sort: (r) => site(r.w),
      csv: (r) => r.w,
    },
  ];
}

function facets(periodLabel: string): Facet<Row>[] {
  return [
    { id: "status", label: "Status", icon: IconProgressCheck, values: (r) => (r.s ? [r.s] : []) },
    { id: "industry", label: "Industry", icon: IconTag, values: (r) => (r.i ? [r.i] : []) },
    { id: "period", label: periodLabel, icon: IconCalendar, values: (r) => (r.g ? [r.g] : []), order: (v) => -(Number(v.match(/\d{2,4}/)?.[0]) || 0) },
    { id: "lore", label: "Lore", icon: IconBook2, values: (r) => [r.h ? "With lore" : "Without lore"] },
  ];
}

export function PortfolioView({ fund, label, periodLabel }: { fund: string; label: string; periodLabel: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetch(withBase(`/portfolios/${fund}.json`))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setRows)
      .catch(() => setFailed(true));
  }, [fund]);

  if (failed) return <div className="tw-empty">The directory didn’t load. Refresh to try again.</div>;
  if (!rows)
    return (
      <div role="status" aria-label="Loading the directory" style={{ padding: 8, display: "grid", gap: 10 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} height={14} width={`${92 - (i % 4) * 9}%`} />
        ))}
      </div>
    );
  return (
    <RecordTable
      name={`${label} · ${rows.filter((r) => r.h).length} with lore`}
      rows={rows}
      columns={columns(periodLabel)}
      rowKey={(r) => `${r.n}|${r.g ?? ""}|${r.w ?? ""}`}
      search={(r) => [r.n, r.o, r.b, r.x, r.i, ...(r.f ?? [])].join(" ")}
      facets={facets(periodLabel)}
      defaultSort={{ id: "lore", dir: "desc" }}
      csvName={`hyperlore-portfolio-${fund}`}
      searchPlaceholder={`Search ${rows.length.toLocaleString("en")} companies`}
    />
  );
}
