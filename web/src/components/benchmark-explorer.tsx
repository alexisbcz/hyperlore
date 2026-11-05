"use client";

import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type Benchmark = {
  id: string;
  name: string;
  kind: string;
  producer: string;
  producerType: string;
  producerSlug: string | null;
  year: number | null;
  measures: string;
  how: string;
  /** Null when no source states it. */
  status: string | null;
  criticism: string | null;
  url: string;
  sources: string[];
};

const STATUS_TONE: Record<string, string> = {
  Active: "border-accent/40 text-accent",
  Saturated: "border-border-strong text-fg-muted",
  Superseded: "border-border-strong text-fg-muted",
  Retired: "border-border text-fg-subtle",
};

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

function Chip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg aria-pressed:border-accent/50 aria-pressed:bg-bg-hover aria-pressed:text-fg"
    >
      {label}
      <span className="text-xs tabular-nums text-fg-subtle">{count}</span>
    </button>
  );
}

function Card({ b }: { b: Benchmark }) {
  return (
    <li className="pad flex flex-col rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-[15px] font-semibold leading-snug text-fg">
          <a href={b.url} target="_blank" rel="noreferrer" className="hover:underline">
            {b.name}
          </a>
        </h3>
        {b.status && <span className={`shrink-0 rounded-full border px-2 text-[11px] font-medium leading-5 ${STATUS_TONE[b.status] ?? STATUS_TONE.Retired}`}>{b.status}</span>}
      </div>
      <p className="mt-1 text-xs text-fg-subtle">
        {b.producerSlug ? (
          <Link href={`/${b.producerSlug}`} className="link-u">
            {b.producer}
          </Link>
        ) : (
          b.producer
        )}
        {b.year ? <span className="tabular-nums"> · {b.year}</span> : null}
      </p>
      <p className="mt-3 text-pretty text-sm leading-relaxed text-fg-muted">{b.measures}</p>
      <p className="mt-1.5 text-pretty text-xs leading-relaxed text-fg-subtle">{b.how}</p>
      {b.criticism && (
        <p className="mt-3 text-pretty border-l-2 border-border-strong pl-2.5 text-xs leading-relaxed text-fg-muted">
          <span className="font-medium text-fg">Weakness: </span>
          {b.criticism}
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 pt-3 text-xs text-fg-subtle">
        {b.sources.slice(0, 3).map((s) => (
          <a key={s} href={s} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-0.5 py-1 hover:text-fg">
            <span className="truncate">{hostOf(s)}</span>
            <ArrowUpRight aria-hidden="true" className="size-3 shrink-0" />
          </a>
        ))}
      </div>
    </li>
  );
}

export function BenchmarkExplorer({ benchmarks }: { benchmarks: Benchmark[] }) {
  const [kind, setKind] = useState("All");
  const [status, setStatus] = useState("All");
  const [query, setQuery] = useState("");

  const kinds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of benchmarks) counts.set(b.kind, (counts.get(b.kind) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [benchmarks]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return benchmarks
      .filter((b) => kind === "All" || b.kind === kind)
      .filter((b) => status === "All" || b.status === status)
      .filter((b) => !q || [b.name, b.producer, b.measures, b.how, b.criticism ?? ""].join(" ").toLowerCase().includes(q));
  }, [benchmarks, kind, status, query]);

  const groups = useMemo(() => {
    const byKind = new Map<string, Benchmark[]>();
    for (const b of shown) byKind.set(b.kind, [...(byKind.get(b.kind) ?? []), b]);
    return [...byKind].sort((a, b) => b[1].length - a[1].length);
  }, [shown]);

  const statuses = ["All", ...new Set(benchmarks.flatMap((b) => (b.status ? [b.status] : [])))];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-48 flex-1">
          <span className="sr-only">Search benchmarks</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Search benchmarks, producers, weaknesses…"
            className="h-10 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-[16px] text-fg outline-none placeholder:text-fg-subtle focus-visible:border-accent sm:text-sm"
          />
        </label>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.currentTarget.value)}
          className="h-10 rounded-lg border border-border bg-bg px-2.5 text-sm text-fg"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "Any status" : s}
            </option>
          ))}
        </select>
      </div>
      <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip label="All" count={benchmarks.length} active={kind === "All"} onClick={() => setKind("All")} />
        {kinds.map(([k, n]) => (
          <Chip key={k} label={k} count={n} active={kind === k} onClick={() => setKind(k)} />
        ))}
      </div>

      <p className="mt-4 text-sm tabular-nums text-fg-subtle" aria-live="polite">
        {shown.length} {shown.length === 1 ? "benchmark" : "benchmarks"}
      </p>
      {groups.map(([k, list]) => (
        <section key={k} aria-labelledby={`kind-${k}`} className="mt-6">
          <h2 id={`kind-${k}`} className="mb-3 text-lg font-semibold text-fg">
            {k}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((b) => (
              <Card key={b.id} b={b} />
            ))}
          </ul>
        </section>
      ))}
      {shown.length === 0 && <p className="mt-6 text-sm text-fg-subtle">No benchmark matches that.</p>}
    </div>
  );
}
