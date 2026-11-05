"use client";

import Link from "next/link";
import {
  IconAlertTriangle, IconBuildingSkyscraper, IconCalendar, IconExternalLink, IconFileText, IconGauge, IconId, IconLayoutGrid, IconLink,
  IconProgressCheck, IconTable, IconTag, IconTool, IconUsers,
} from "twenty-ui/icon";
import { Tag } from "twenty-ui/primitives/data-display";
import { Tooltip } from "twenty-ui/primitives/surfaces";
import { RecordTable, type Column, type Facet, type View } from "../table";
import type { Benchmark } from "@/components/benchmark-explorer";

// Benchmarks as a Twenty record table: kind and status as filters (the classic chips and select),
// a card view grouped by kind, and the producers table as its own view.

const STATUS_COLOR: Record<string, "green" | "gray" | "amber" | "red"> = { Active: "green", Saturated: "amber", Superseded: "gray", Retired: "red" };
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

const Long = ({ text }: { text: string | null }) =>
  text ? (
    <Tooltip content={text} delay={300}>
      <span className="tw-cell-muted">{text}</span>
    </Tooltip>
  ) : null;

function Producer({ b }: { b: Benchmark }) {
  return b.producerSlug ? (
    <Link href={`/${b.producerSlug}`} className="tw-link">
      {b.producer}
    </Link>
  ) : (
    <span>{b.producer}</span>
  );
}

const StatusTag = ({ status }: { status: string | null }) => (status ? <Tag color={STATUS_COLOR[status] ?? "gray"} truncate={false}>{status}</Tag> : null);

const COLUMNS: Column<Benchmark>[] = [
  {
    id: "name",
    label: "Benchmark",
    icon: IconGauge,
    width: 210,
    render: (b) => (
      <a href={b.url} target="_blank" rel="noreferrer" className="tw-link" style={{ fontWeight: 500 }}>
        {b.name}
      </a>
    ),
    sort: (b) => b.name.toLowerCase(),
    csv: (b) => b.name,
  },
  { id: "kind", label: "Kind", icon: IconTag, width: 150, render: (b) => <Tag color="gray" truncate={false}>{b.kind}</Tag>, sort: (b) => b.kind },
  { id: "status", label: "Status", icon: IconProgressCheck, width: 110, render: (b) => <StatusTag status={b.status} />, sort: (b) => b.status ?? undefined, csv: (b) => b.status ?? "" },
  { id: "producer", label: "Producer", icon: IconBuildingSkyscraper, width: 240, render: (b) => <Producer b={b} />, sort: (b) => b.producer, csv: (b) => b.producer },
  { id: "type", label: "Producer type", icon: IconId, width: 130, render: (b) => <span className="tw-cell-muted">{b.producerType}</span>, sort: (b) => b.producerType },
  { id: "year", label: "Year", icon: IconCalendar, width: 80, align: "end", render: (b) => <span className="tw-num">{b.year ?? ""}</span>, sort: (b) => b.year ?? undefined },
  { id: "measures", label: "Measures", icon: IconFileText, width: 340, render: (b) => <Long text={b.measures} />, csv: (b) => b.measures },
  { id: "how", label: "How it works", icon: IconTool, width: 320, render: (b) => <Long text={b.how} />, csv: (b) => b.how },
  { id: "criticism", label: "Weakness", icon: IconAlertTriangle, width: 320, render: (b) => <Long text={b.criticism} />, sort: (b) => (b.criticism ? 1 : undefined), csv: (b) => b.criticism ?? "" },
  {
    id: "sources",
    label: "Sources",
    icon: IconLink,
    width: 260,
    render: (b) => (
      <span className="tw-cell-row">
        {b.sources.map((s) => (
          <a key={s} href={s} target="_blank" rel="noreferrer" className="tw-link tw-cell-muted">
            {host(s)}
          </a>
        ))}
      </span>
    ),
    csv: (b) => b.sources.join(" "),
  },
];

const FACETS: Facet<Benchmark>[] = [
  { id: "kind", label: "Kind", icon: IconTag, values: (b) => [b.kind] },
  { id: "status", label: "Status", icon: IconProgressCheck, values: (b) => (b.status ? [b.status] : []) },
  { id: "type", label: "Producer type", icon: IconId, values: (b) => [b.producerType] },
  { id: "producer", label: "Producer", icon: IconBuildingSkyscraper, values: (b) => [b.producer] },
  { id: "weakness", label: "Weakness", icon: IconAlertTriangle, values: (b) => [b.criticism ? "Has a documented weakness" : "None recorded"] },
];

function Cards({ rows }: { rows: Benchmark[] }) {
  const byKind = new Map<string, Benchmark[]>();
  for (const b of rows) byKind.set(b.kind, [...(byKind.get(b.kind) ?? []), b]);
  return (
    <div className="tw-bench-groups">
      {[...byKind].sort((a, b) => b[1].length - a[1].length).map(([kind, list]) => (
        <section key={kind}>
          <h2 className="tw-tl-year">
            {kind} <span className="tw-col-count tw-num">{list.length}</span>
          </h2>
          <ul className="tw-bench-grid">
            {list.map((b) => (
              <li key={b.id} className="tw-bench-card">
                <div className="tw-bench-head">
                  <a href={b.url} target="_blank" rel="noreferrer" className="tw-link tw-bench-name">
                    {b.name}
                  </a>
                  <StatusTag status={b.status} />
                </div>
                <div className="tw-bench-meta">
                  <Producer b={b} />
                  {b.year ? <span className="tw-num"> · {b.year}</span> : null}
                </div>
                <p className="tw-bench-text">{b.measures}</p>
                <p className="tw-bench-how">{b.how}</p>
                {b.criticism && (
                  <p className="tw-bench-weak">
                    <strong>Weakness: </strong>
                    {b.criticism}
                  </p>
                )}
                <div className="tw-bench-sources">
                  {b.sources.slice(0, 3).map((s) => (
                    <a key={s} href={s} target="_blank" rel="noreferrer" className="tw-ext">
                      {host(s)} <IconExternalLink size={11} aria-hidden />
                    </a>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** The classic page's "Who makes them" table: producers by number of benchmarks. */
function Producers({ rows }: { rows: Benchmark[] }) {
  const producers = new Map<string, Benchmark[]>();
  for (const b of rows) producers.set(b.producer, [...(producers.get(b.producer) ?? []), b]);
  const ranked = [...producers].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  return (
    <table className="tw-table" style={{ width: "100%" }}>
      <colgroup>
        <col style={{ width: 280 }} />
        <col style={{ width: 140 }} />
        <col style={{ width: 90 }} />
        <col />
      </colgroup>
      <thead>
        <tr>
          {[
            [IconBuildingSkyscraper, "Producer"],
            [IconId, "Type"],
            [IconGauge, "Count"],
            [IconUsers, "Benchmarks"],
          ].map(([I, l], k) => {
            const Icon = I as typeof IconGauge;
            return (
              <th key={k} data-align={k === 2 ? "end" : undefined}>
                <span className="tw-th">
                  <Icon size={16} stroke={1.6} aria-hidden />
                  <span className="tw-th-label">{l as string}</span>
                </span>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {ranked.map(([name, list]) => (
          <tr key={name}>
            <td>
              <Producer b={list[0]} />
            </td>
            <td className="tw-cell-muted">{list[0].producerType}</td>
            <td data-align="end" className="tw-num">
              {list.length}
            </td>
            <td className="tw-cell-muted">{list.map((b) => b.name).join(", ")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const VIEWS: View<Benchmark>[] = [
  { id: "table", label: "All benchmarks", icon: IconTable },
  { id: "cards", label: "Cards by kind", icon: IconLayoutGrid, render: (rows) => <Cards rows={rows} /> },
  { id: "producers", label: "Who makes them", icon: IconBuildingSkyscraper, render: (rows) => <Producers rows={rows} /> },
];

export function BenchmarksView({ benchmarks }: { benchmarks: Benchmark[] }) {
  return (
    <RecordTable
      name="All benchmarks"
      rows={benchmarks}
      columns={COLUMNS}
      rowKey={(b) => b.id}
      search={(b) => [b.name, b.kind, b.producer, b.measures, b.how, b.criticism ?? ""].join(" ")}
      facets={FACETS}
      defaultSort={{ id: "kind", dir: "asc" }}
      views={VIEWS}
      csvName="hyperlore-ai-benchmarks"
      searchPlaceholder="Search benchmarks, producers, weaknesses"
    />
  );
}
