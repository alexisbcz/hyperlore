"use client";

import { ArrowDown, ArrowUp, Download, Search } from "lucide-react";
import { useMemo, useRef, useState, type KeyboardEvent } from "react";

export type Idea = {
  id: string;
  name: string;
  category: string;
  pitch: string;
  wedge: string;
  customer: string;
  models: string[];
  saas: string[];
  stackNotes: string;
  pricing: string;
  competitors: string[];
  precedent: { name: string | null; url: string | null };
  moat: string;
  risk: string;
  mvpWeeks: number;
  scores: { demand: number; feasibility: number; moat: number; fundability: number };
  sources: string[];
};

/** The score column's formula, shown in the formula bar like a real sheet. */
const SCORE_FORMULA = "=AVERAGE(Demand, Feasibility, Moat, Fundability)";
const score = (i: Idea) => (i.scores.demand + i.scores.feasibility + i.scores.moat + i.scores.fundability) / 4;

type Cell = string | number;
type Column = { label: string; width: number; value: (i: Idea) => Cell; num?: boolean; formula?: string };

const list = (v: string[]) => v.join(", ");

const COLUMNS: Column[] = [
  { label: "Idea", width: 170, value: (i) => i.name },
  { label: "Category", width: 110, value: (i) => i.category },
  { label: "Score", width: 72, value: (i) => score(i), num: true, formula: SCORE_FORMULA },
  { label: "Pitch", width: 340, value: (i) => i.pitch },
  { label: "AI models", width: 240, value: (i) => list(i.models) },
  { label: "SaaS and APIs", width: 260, value: (i) => list(i.saas) },
  { label: "How it fits", width: 320, value: (i) => i.stackNotes },
  { label: "First wedge", width: 300, value: (i) => i.wedge },
  { label: "Buyer", width: 180, value: (i) => i.customer },
  { label: "Pricing", width: 200, value: (i) => i.pricing },
  { label: "MVP wks", width: 80, value: (i) => i.mvpWeeks, num: true },
  { label: "Demand", width: 76, value: (i) => i.scores.demand, num: true },
  { label: "Feasibility", width: 86, value: (i) => i.scores.feasibility, num: true },
  { label: "Moat", width: 66, value: (i) => i.scores.moat, num: true },
  { label: "Fundability", width: 90, value: (i) => i.scores.fundability, num: true },
  { label: "Competitors", width: 240, value: (i) => list(i.competitors) },
  { label: "Precedent", width: 170, value: (i) => i.precedent.name ?? "" },
  { label: "Defensibility", width: 300, value: (i) => i.moat },
  { label: "Main risk", width: 300, value: (i) => i.risk },
  { label: "Sources", width: 300, value: (i) => list(i.sources) },
];

const SCORE_COLUMN = 2;
const letter = (n: number) => (n < 26 ? String.fromCharCode(65 + n) : `A${String.fromCharCode(65 + n - 26)}`);
const show = (c: Column, v: Cell) => (c.formula ? (v as number).toFixed(2) : String(v));

function toCsv(rows: Idea[]) {
  const esc = (v: Cell) => `"${String(v).replaceAll('"', '""')}"`;
  return [COLUMNS.map((c) => esc(c.label)).join(","), ...rows.map((r) => COLUMNS.map((c) => esc(c.value(r))).join(","))].join("\n");
}

/** A heat tint for 1-5 scores, so the eye finds the strong rows the way conditional formatting does. */
const heat = (c: Column, v: Cell) =>
  c.num && !["MVP wks"].includes(c.label) ? `color-mix(in srgb, var(--primary) ${Math.round(((Number(v) - 1) / 4) ** 2 * 30)}%, transparent)` : undefined;

export function IdeaSheet({ ideas }: { ideas: Idea[] }) {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ col: number; desc: boolean }>({ col: SCORE_COLUMN, desc: true });
  const [at, setAt] = useState({ row: 0, col: 0 });
  const grid = useRef<HTMLDivElement>(null);

  const tabs = useMemo(() => ["All", ...new Set(ideas.map((i) => i.category))], [ideas]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const col = COLUMNS[sort.col];
    return ideas
      .filter((i) => tab === "All" || i.category === tab)
      .filter((i) => !q || COLUMNS.some((c) => String(c.value(i)).toLowerCase().includes(q)))
      .toSorted((a, b) => {
        const [x, y] = [col.value(a), col.value(b)];
        const d = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
        return sort.desc ? -d : d;
      });
  }, [ideas, tab, query, sort]);

  const row = Math.min(at.row, Math.max(rows.length - 1, 0));
  const current = rows[row];
  const column = COLUMNS[at.col];

  const move = (dr: number, dc: number) => {
    const next = { row: Math.max(0, Math.min(rows.length - 1, row + dr)), col: Math.max(0, Math.min(COLUMNS.length - 1, at.col + dc)) };
    setAt(next);
    grid.current?.querySelector(`[data-cell="${next.row}-${next.col}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const onKey = (e: KeyboardEvent) => {
    const step = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1], Tab: [0, e.shiftKey ? -1 : 1], Enter: [1, 0] }[e.key];
    if (!step) return;
    e.preventDefault();
    move(step[0], step[1]);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "hyperlore-startup-ideas.csv" });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pad flex h-[calc(100dvh-13rem)] min-h-[28rem] flex-col overflow-hidden rounded-xl">
      {/* Formula bar: the selected cell's address and its full text. */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border p-2">
        <span className="w-14 rounded-md bg-bg-hover px-2 py-1 text-center font-mono text-xs text-fg-muted">{current ? `${letter(at.col)}${row + 1}` : "–"}</span>
        <span aria-hidden="true" className="font-mono text-sm italic text-fg-subtle">
          fx
        </span>
        <p aria-live="polite" className="order-last line-clamp-3 w-full min-w-0 text-sm text-fg sm:order-none sm:h-10 sm:w-auto sm:flex-1 sm:line-clamp-2">
          {current && (column.formula ?? show(column, column.value(current)))}
        </p>
        <label className="relative ml-auto">
          <span className="sr-only">Filter ideas</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Filter…"
            className="h-8 w-36 rounded-md border border-border bg-bg pl-7 pr-2 text-[16px] text-fg outline-none placeholder:text-fg-subtle focus-visible:border-accent sm:text-sm"
          />
        </label>
        <button
          type="button"
          onClick={download}
          className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          <Download aria-hidden="true" className="size-3.5" />
          CSV
        </button>
      </div>

      <div ref={grid} role="grid" aria-label="Startup ideas" aria-rowcount={rows.length + 1} tabIndex={0} onKeyDown={onKey} className="min-h-0 flex-1 overflow-auto bg-bg font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent">
        <table className="border-separate border-spacing-0" style={{ width: 44 + COLUMNS.reduce((n, c) => n + c.width, 0) }}>
          <colgroup>
            <col style={{ width: 44 }} />
            {COLUMNS.map((c) => (
              <col key={c.label} style={{ width: c.width }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 h-5 border-b border-r border-border bg-bg-subtle" />
              {COLUMNS.map((c, i) => (
                <th key={c.label} className={`sticky top-0 z-20 h-5 border-b border-r border-border text-center text-[10px] font-normal ${at.col === i ? "bg-primary text-on-primary" : "bg-bg-subtle text-fg-subtle"} ${i === 0 ? "left-11 z-30" : ""}`}>
                  {letter(i)}
                </th>
              ))}
            </tr>
            <tr>
              <th className="sticky left-0 top-5 z-30 h-8 border-b border-r border-border bg-bg-subtle" />
              {COLUMNS.map((c, i) => (
                <th key={c.label} aria-sort={sort.col === i ? (sort.desc ? "descending" : "ascending") : undefined} className={`sticky top-5 z-20 h-8 border-b border-r border-border bg-bg-subtle p-0 text-left font-sans font-semibold ${i === 0 ? "left-11 z-30" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setSort((s) => ({ col: i, desc: s.col === i ? !s.desc : !!c.num }))}
                    className="flex size-full items-center justify-between gap-1 px-2 text-fg-muted hover:text-fg"
                  >
                    <span className="truncate">{c.label}</span>
                    {sort.col === i && (sort.desc ? <ArrowDown aria-hidden="true" className="size-3 shrink-0" /> : <ArrowUp aria-hidden="true" className="size-3 shrink-0" />)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((idea, r) => (
              <tr key={idea.id}>
                <th scope="row" className={`sticky left-0 z-10 h-8 border-b border-r border-border text-center text-[10px] font-normal ${r === row ? "bg-primary text-on-primary" : "bg-bg-subtle text-fg-subtle"}`}>
                  {r + 1}
                </th>
                {COLUMNS.map((c, i) => {
                  const v = c.value(idea);
                  const selected = r === row && i === at.col;
                  return (
                    <td
                      key={c.label}
                      role="gridcell"
                      aria-selected={selected}
                      data-cell={`${r}-${i}`}
                      onClick={() => setAt({ row: r, col: i })}
                      style={{ background: heat(c, v) }}
                      title={show(c, v)}
                      className={`h-8 max-w-0 cursor-cell truncate border-b border-r border-border px-2 ${c.num ? "text-right tabular-nums" : ""} ${i === 0 ? "sticky left-11 z-10 !bg-bg font-sans font-semibold text-fg" : "text-fg-muted"} ${selected ? "outline outline-2 -outline-offset-2 outline-accent" : ""}`}
                    >
                      {show(c, v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-4 font-sans text-sm text-fg-subtle">No ideas match that filter.</p>}
      </div>

      {/* Sheet tabs. */}
      <div role="tablist" aria-label="Category" className="flex shrink-0 gap-0.5 overflow-x-auto border-t border-border bg-bg-subtle px-2 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={t === tab}
            onClick={() => {
              setTab(t);
              setAt({ row: 0, col: at.col });
            }}
            className="-mt-px shrink-0 border-t-2 border-transparent px-3 py-2 text-xs text-fg-subtle transition-colors hover:text-fg aria-selected:border-accent aria-selected:bg-bg aria-selected:font-medium aria-selected:text-fg"
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
