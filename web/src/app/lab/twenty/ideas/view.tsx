"use client";

import {
  IconBolt, IconBuildingSkyscraper, IconCalendar, IconTag, IconChartBar, IconCoins, IconCpu, IconFileText, IconFlag, IconLayoutKanban,
  IconLink, IconPlug, IconShield, IconSparkles, IconStar, IconTable, IconTarget, IconUser, IconAlertTriangle, IconTool,
} from "twenty-ui/icon";
import { Tag } from "twenty-ui/primitives/data-display";
import { Tooltip } from "twenty-ui/primitives/surfaces";
import type { CSSProperties } from "react";
import { RecordTable, type Column, type Facet, type View } from "../table";
import type { Idea } from "@/components/idea-sheet";

// The ideas sheet as a Twenty record table: every column of the classic spreadsheet, the category
// tabs as a filter (and a board), scores tinted like conditional formatting, CSV of the filtered rows.

export const score = (i: Idea) => (i.scores.demand + i.scores.feasibility + i.scores.moat + i.scores.fundability) / 4;
const list = (v: string[]) => v.join(", ");
const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

/** A 1–5 score as a tinted cell value: the stronger, the greener. */
function Score({ v, decimals = 0 }: { v: number; decimals?: number }) {
  const p = Math.max(0, Math.min(1, (v - 1) / 4));
  return (
    <span className="tw-idea-score tw-num" style={{ "--p": p } as CSSProperties}>
      {v.toFixed(decimals)}
    </span>
  );
}

/** Long text: one line in the cell, the whole text on hover. */
const Long = ({ text }: { text: string }) =>
  text ? (
    <Tooltip content={text} delay={300}>
      <span className="tw-cell-muted">{text}</span>
    </Tooltip>
  ) : null;

const muted = (text: string) => <span className="tw-cell-muted">{text}</span>;

const COLUMNS: Column<Idea>[] = [
  { id: "name", label: "Idea", icon: IconSparkles, width: 190, render: (i) => <strong style={{ fontWeight: 500 }}>{i.name}</strong>, sort: (i) => i.name.toLowerCase(), csv: (i) => i.name },
  { id: "category", label: "Category", icon: IconTag, width: 130, render: (i) => <Tag color="gray" truncate={false}>{i.category}</Tag>, sort: (i) => i.category },
  {
    id: "score",
    label: "Score",
    icon: IconStar,
    width: 86,
    align: "end",
    render: (i) => <Score v={score(i)} decimals={2} />,
    sort: (i) => score(i),
    csv: (i) => score(i).toFixed(2),
    agg: (rows) => (
      <>
        <span className="tw-agg">Avg</span>
        <span className="tw-num">{rows.length ? (rows.reduce((s, i) => s + score(i), 0) / rows.length).toFixed(2) : ""}</span>
      </>
    ),
  },
  { id: "pitch", label: "Pitch", icon: IconFileText, width: 340, render: (i) => <Long text={i.pitch} />, csv: (i) => i.pitch },
  { id: "models", label: "AI models", icon: IconCpu, width: 240, render: (i) => (
    <span className="tw-cell-row">{i.models.map((m) => <Tag key={m} color="violet" truncate={false}>{m}</Tag>)}</span>
  ), sort: (i) => i.models[0], csv: (i) => list(i.models) },
  { id: "saas", label: "SaaS and APIs", icon: IconPlug, width: 260, render: (i) => (
    <span className="tw-cell-row">{i.saas.map((m) => <Tag key={m} color="sky" truncate={false}>{m}</Tag>)}</span>
  ), sort: (i) => i.saas[0], csv: (i) => list(i.saas) },
  { id: "stack", label: "How it fits", icon: IconTool, width: 320, render: (i) => <Long text={i.stackNotes} />, csv: (i) => i.stackNotes },
  { id: "wedge", label: "First wedge", icon: IconTarget, width: 300, render: (i) => <Long text={i.wedge} />, csv: (i) => i.wedge },
  { id: "customer", label: "Buyer", icon: IconUser, width: 200, render: (i) => <Long text={i.customer} />, sort: (i) => i.customer, csv: (i) => i.customer },
  { id: "pricing", label: "Pricing", icon: IconCoins, width: 220, render: (i) => <Long text={i.pricing} />, csv: (i) => i.pricing },
  {
    id: "mvp",
    label: "MVP weeks",
    icon: IconCalendar,
    width: 104,
    align: "end",
    render: (i) => <span className="tw-num">{i.mvpWeeks}</span>,
    sort: (i) => i.mvpWeeks,
    agg: (rows) => (
      <>
        <span className="tw-agg">Avg</span>
        <span className="tw-num">{rows.length ? (rows.reduce((s, i) => s + i.mvpWeeks, 0) / rows.length).toFixed(1) : ""}</span>
      </>
    ),
  },
  { id: "demand", label: "Demand", icon: IconChartBar, width: 96, align: "end", render: (i) => <Score v={i.scores.demand} />, sort: (i) => i.scores.demand },
  { id: "feasibility", label: "Feasibility", icon: IconBolt, width: 106, align: "end", render: (i) => <Score v={i.scores.feasibility} />, sort: (i) => i.scores.feasibility },
  { id: "moatScore", label: "Moat", icon: IconShield, width: 86, align: "end", render: (i) => <Score v={i.scores.moat} />, sort: (i) => i.scores.moat },
  { id: "fundability", label: "Fundability", icon: IconCoins, width: 108, align: "end", render: (i) => <Score v={i.scores.fundability} />, sort: (i) => i.scores.fundability },
  { id: "competitors", label: "Competitors", icon: IconBuildingSkyscraper, width: 240, render: (i) => muted(list(i.competitors)), sort: (i) => i.competitors[0], csv: (i) => list(i.competitors) },
  {
    id: "precedent",
    label: "Precedent",
    icon: IconFlag,
    width: 170,
    render: (i) =>
      i.precedent.name ? (
        i.precedent.url ? (
          <a href={i.precedent.url} target="_blank" rel="noreferrer" className="tw-link">
            {i.precedent.name}
          </a>
        ) : (
          muted(i.precedent.name)
        )
      ) : null,
    sort: (i) => i.precedent.name ?? undefined,
    csv: (i) => i.precedent.name ?? "",
  },
  { id: "moat", label: "Defensibility", icon: IconShield, width: 300, render: (i) => <Long text={i.moat} />, csv: (i) => i.moat },
  { id: "risk", label: "Main risk", icon: IconAlertTriangle, width: 300, render: (i) => <Long text={i.risk} />, csv: (i) => i.risk },
  {
    id: "sources",
    label: "Sources",
    icon: IconLink,
    width: 300,
    render: (i) => (
      <span className="tw-cell-row">
        {i.sources.map((u) => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="tw-link tw-cell-muted">
            {host(u)}
          </a>
        ))}
      </span>
    ),
    csv: (i) => list(i.sources),
  },
];

const FACETS: Facet<Idea>[] = [
  { id: "category", label: "Category", icon: IconTag, values: (i) => [i.category] },
  { id: "model", label: "AI model", icon: IconCpu, values: (i) => i.models },
  { id: "saas", label: "SaaS or API", icon: IconPlug, values: (i) => i.saas },
  { id: "score", label: "Score", icon: IconStar, values: (i) => [`${Math.floor(score(i))}+`], order: (v) => -Number(v[0]) },
  { id: "mvp", label: "MVP time", icon: IconCalendar, values: (i) => [i.mvpWeeks <= 4 ? "Up to 4 weeks" : i.mvpWeeks <= 8 ? "5–8 weeks" : "Over 8 weeks"], order: (v) => (v.startsWith("Up") ? 0 : v.startsWith("5") ? 1 : 2) },
];

function Board({ rows }: { rows: Idea[] }) {
  const categories = [...new Set(rows.map((i) => i.category))];
  return (
    <div className="tw-board">
      {categories.map((c) => {
        const items = rows.filter((i) => i.category === c);
        return (
          <div key={c} className="tw-col" style={{ width: 280 }}>
            <div className="tw-col-head">
              <Tag color="gray">{c}</Tag>
              <span className="tw-col-count tw-num">{items.length}</span>
              <span className="tw-col-sum tw-num">avg {(items.reduce((s, i) => s + score(i), 0) / items.length).toFixed(2)}</span>
            </div>
            {items.map((i) => (
              <div key={i.id} className="tw-kcard">
                <div className="tw-kcard-head">
                  <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.name}</span>
                  <Score v={score(i)} decimals={2} />
                </div>
                <p className="tw-idea-pitch">{i.pitch}</p>
                <div className="tw-kfield">
                  <IconCpu size={14} aria-hidden />
                  <span>Models</span>
                  <span>{list(i.models)}</span>
                </div>
                <div className="tw-kfield">
                  <IconUser size={14} aria-hidden />
                  <span>Buyer</span>
                  <span>{i.customer}</span>
                </div>
                <div className="tw-kfield">
                  <IconCalendar size={14} aria-hidden />
                  <span>MVP</span>
                  <span className="tw-num">{i.mvpWeeks} weeks</span>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const VIEWS: View<Idea>[] = [
  { id: "table", label: "All ideas", icon: IconTable },
  { id: "board", label: "By category", icon: IconLayoutKanban, render: (rows) => <Board rows={rows} /> },
];

const searchText = (i: Idea) =>
  [i.name, i.category, i.pitch, i.wedge, i.customer, i.stackNotes, i.pricing, i.moat, i.risk, i.precedent.name ?? "", ...i.models, ...i.saas, ...i.competitors].join(" ");

export function IdeasView({ ideas }: { ideas: Idea[] }) {
  return (
    <RecordTable
      name="All ideas"
      rows={ideas}
      columns={COLUMNS}
      rowKey={(i) => i.id}
      search={searchText}
      facets={FACETS}
      defaultSort={{ id: "score", dir: "desc" }}
      views={VIEWS}
      csvName="hyperlore-startup-ideas"
      searchPlaceholder="Search ideas"
    />
  );
}
