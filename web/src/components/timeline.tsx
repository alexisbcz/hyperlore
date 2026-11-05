"use client";

import { useEffect, useState } from "react";
import type { LoreEvent } from "@/lib/types";
import { BUTTON } from "./filters";
import { EventList, SOURCE_LABELS, kindLabel } from "./lore";

const FILTERS: { id: string; label: string; kinds?: string[] }[] = [
  { id: "all", label: "All" },
  { id: "funding", label: "Funding", kinds: ["funding", "acquisition", "acquired"] },
  { id: "product", label: "Product", kinds: ["product", "launch", "open-source", "pricing"] },
  { id: "identity", label: "Identity", kinds: ["rename", "domain", "logo", "rebrand"] },
  { id: "people", label: "People", kinds: ["founding", "hire", "departure", "office", "layoff"] },
  {
    id: "moments",
    label: "Moments",
    kinds: ["milestone", "event", "conference", "controversy", "outage", "partnership", "pivot", "other"],
  },
];

type Refine = { kind: string; year: string; confidence: string; source: string };
const ANY: Refine = { kind: "", year: "", confidence: "", source: "" };

const SELECT = `${BUTTON} h-10 pr-1 text-xs sm:h-7`;

export function Timeline({ events }: { events: LoreEvent[] }) {
  const [filter, setFilter] = useState("all");
  const [refine, setRefine] = useState<Refine>(ANY);
  const active = FILTERS.find((f) => f.id === filter)!;

  // A link to one event (from /rounds, /compare, search) can arrive before the timeline has streamed in;
  // the router then finds nothing to scroll to and leaves the page at the top. Scroll once it is here.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id && events.some((e) => e.id === id)) document.getElementById(id)?.scrollIntoView();
    // Only on arrival: later hash changes are the browser's.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The finer filters stack on the group chips; their options count events under every other choice.
  const passes = (e: LoreEvent, r: Refine, skip?: keyof Refine) =>
    (skip === "kind" || !r.kind || e.kind === r.kind) &&
    (skip === "year" || !r.year || e.date.startsWith(r.year)) &&
    (skip === "confidence" || !r.confidence || e.confidence === r.confidence) &&
    (skip === "source" || !r.source || e.sources.some((s) => s.type === r.source));
  const inGroup = (e: LoreEvent) => !active.kinds || active.kinds.includes(e.kind);
  const shown = events.filter((e) => inGroup(e) && passes(e, refine));

  const count = (key: keyof Refine, values: (e: LoreEvent) => string[]) => {
    const m = new Map<string, number>();
    for (const e of events.filter((e) => inGroup(e) && passes(e, refine, key))) for (const v of new Set(values(e))) m.set(v, (m.get(v) ?? 0) + 1);
    return m;
  };
  const kinds = count("kind", (e) => [e.kind]);
  const years = count("year", (e) => [e.date.slice(0, 4)]);
  const confidence = count("confidence", (e) => [e.confidence]);
  const sources = count("source", (e) => e.sources.map((s) => s.type));
  const refined = Object.values(refine).some(Boolean);

  const byYear = new Map<string, LoreEvent[]>();
  for (const e of shown) byYear.set(e.date.slice(0, 4), [...(byYear.get(e.date.slice(0, 4)) ?? []), e]);

  const select = (key: keyof Refine, label: string, counts: Map<string, number>, name: (v: string) => string, order?: (a: string, b: string) => number) => (
    <label className="flex items-center">
      <span className="sr-only">{label}</span>
      <select value={refine[key]} onChange={(e) => setRefine({ ...refine, [key]: e.target.value })} className={`${SELECT} ${refine[key] ? "border-fg text-fg" : ""}`}>
        <option value="">{label}: any</option>
        {[...counts.keys()]
          .sort(order ?? ((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b)))
          .map((v) => (
            <option key={v} value={v}>
              {name(v)} ({counts.get(v)})
            </option>
          ))}
        {refine[key] && !counts.has(refine[key]) && <option value={refine[key]}>{name(refine[key])} (0)</option>}
      </select>
    </label>
  );

  // A handful of events reads at a glance: filters would only add noise.
  const filterable = events.length > 6;

  return (
    <div>
      {filterable && (
        <>
          <div role="group" aria-label="Filter events" className="mb-3 flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const n = f.kinds ? events.filter((e) => f.kinds!.includes(e.kind)).length : events.length;
              // No dead chips: a group with nothing in it is left out.
              if (!n) return null;
              return (
                <button
                  key={f.id}
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => {
                    setFilter(f.id);
                    // A kind outside the new group would leave nothing to show.
                    if (refine.kind && f.kinds && !f.kinds.includes(refine.kind)) setRefine({ ...refine, kind: "" });
                  }}
                  className="h-10 rounded-full border border-border px-3 text-xs sm:h-7 text-fg-muted transition-colors hover:border-border-strong hover:text-fg aria-pressed:border-fg aria-pressed:bg-primary aria-pressed:text-on-primary"
                >
                  {f.label} <span className="tabular-nums opacity-80">{n}</span>
                </button>
              );
            })}
          </div>
          <div role="group" aria-label="Refine events" className="mb-6 flex flex-wrap items-center gap-1.5">
            {select("kind", "Kind", kinds, kindLabel)}
            {select("year", "Year", years, (v) => v, (a, b) => b.localeCompare(a))}
            {select("source", "Source", sources, (v) => SOURCE_LABELS[v] ?? v.charAt(0).toUpperCase() + v.slice(1))}
            {select("confidence", "Confidence", confidence, (v) => (v === "sourced" ? "Stated by a source" : "Inferred"))}
            {(refined || filter !== "all") && (
              <>
                <span aria-live="polite" className="ml-1 text-xs tabular-nums text-fg-subtle">
                  {shown.length} of {events.length}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRefine(ANY);
                    setFilter("all");
                  }}
                  className="rounded py-2 text-xs text-fg-muted underline-offset-2 hover:text-fg sm:py-0 hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </>
      )}
      <div className="space-y-10">
        {[...byYear].map(([year, list]) => (
          <section key={year} aria-labelledby={`year-${year}`} className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[4rem_minmax(0,1fr)]">
            <h3 id={`year-${year}`} className="font-mono text-sm font-medium tabular-nums text-fg-subtle md:sticky md:top-(--sticky-top) md:self-start">
              {year}
            </h3>
            <EventList events={list} />
          </section>
        ))}
        {!shown.length && <p className="text-sm text-fg-subtle">No event matches these filters.</p>}
      </div>
    </div>
  );
}
