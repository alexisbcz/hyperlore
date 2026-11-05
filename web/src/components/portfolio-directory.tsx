"use client";

import { ArrowUpRight, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// One row of public/portfolios/*.json (see portfolios.py). Short keys: these files hold thousands of rows.
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

const PAGE = 60;

const options = (rows: Row[], key: "s" | "i" | "g") => {
  const counts = new Map<string, number>();
  for (const r of rows) if (r[key]) counts.set(r[key]!, (counts.get(r[key]!) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]);
};

function Pick({ label, value, onChange, items }: { label: string; value: string; onChange: (v: string) => void; items: [string, number][] }) {
  if (!items.length) return null;
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.currentTarget.value)} className="h-10 max-w-44 rounded-lg border border-border bg-bg px-2.5 text-sm text-fg">
      <option value="">{`Any ${label.toLowerCase()}`}</option>
      {items.map(([v, n]) => (
        <option key={v} value={v}>
          {v} ({n})
        </option>
      ))}
    </select>
  );
}

function Item({ r }: { r: Row }) {
  const title = r.h ? (
    <Link href={`/${r.h}`} className="font-semibold text-fg after:absolute after:inset-0 hover:underline">
      {r.n}
    </Link>
  ) : (
    <a href={r.w ?? r.u} target="_blank" rel="noreferrer" className="font-semibold text-fg after:absolute after:inset-0 hover:underline">
      {r.n}
    </a>
  );
  return (
    <li className="pad flex gap-3 rounded-xl p-3 has-[a:hover]:border-border-strong">
      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-xs font-semibold text-neutral-700">
        {r.l ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.l} alt="" loading="lazy" className="size-7 object-contain" />
        ) : (
          r.n[0]
        )}
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="truncate">{title}</span>
          {r.h ? (
            <span className="shrink-0 rounded-full border border-accent/40 px-1.5 text-[10px] font-medium leading-4 text-accent">Lore</span>
          ) : (
            <ArrowUpRight aria-hidden="true" className="size-3 shrink-0 text-fg-subtle" />
          )}
        </span>
        {r.o && <span className="mt-0.5 line-clamp-2 text-pretty text-xs leading-relaxed text-fg-muted">{r.o}</span>}
        {r.b && <span className="mt-0.5 block truncate text-[11px] text-fg-subtle">{r.b}</span>}
        <span className="mt-1 block truncate text-[11px] text-fg-subtle">{[r.g, r.x ?? r.s, r.i, r.t ? `${r.t} people` : undefined].filter(Boolean).join(" · ")}</span>
      </span>
    </li>
  );
}

export function PortfolioDirectory({ fund, periodLabel }: { fund: string; periodLabel: string }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [industry, setIndustry] = useState("");
  const [period, setPeriod] = useState("");
  const [loreOnly, setLoreOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    fetch(`/portfolios/${fund}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(setRows)
      .catch(() => setFailed(true));
  }, [fund]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (!status || r.s === status) &&
        (!industry || r.i === industry) &&
        (!period || r.g === period) &&
        (!loreOnly || r.h) &&
        (!q || [r.n, r.o, r.b, r.x, ...(r.f ?? [])].join(" ").toLowerCase().includes(q)),
    );
  }, [rows, query, status, industry, period, loreOnly]);

  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setLimit(PAGE);
  };

  if (failed) return <p className="mt-6 text-sm text-fg-subtle">The directory didn&apos;t load. Refresh to try again.</p>;
  if (!rows) return <p role="status" className="mt-6 font-mono text-xs text-fg-subtle motion-safe:animate-pulse">Loading the directory…</p>;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-52 flex-1">
          <span className="sr-only">Search companies</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
          <input
            value={query}
            onChange={(e) => reset(setQuery)(e.currentTarget.value)}
            placeholder={`Search ${rows.length.toLocaleString("en")} companies…`}
            className="h-10 w-full rounded-lg border border-border bg-bg pl-9 pr-3 text-[16px] text-fg outline-none placeholder:text-fg-subtle focus-visible:border-accent sm:text-sm"
          />
        </label>
        <Pick label="Status" value={status} onChange={reset(setStatus)} items={options(rows, "s")} />
        <Pick label="Industry" value={industry} onChange={reset(setIndustry)} items={options(rows, "i")} />
        <Pick label={periodLabel} value={period} onChange={reset(setPeriod)} items={options(rows, "g")} />
        <label className="flex h-10 items-center gap-2 rounded-lg border border-border px-2.5 text-sm text-fg-muted">
          <input type="checkbox" checked={loreOnly} onChange={(e) => reset(setLoreOnly)(e.currentTarget.checked)} className="accent-[var(--accent)]" />
          With lore
        </label>
      </div>
      <p aria-live="polite" className="mt-4 text-sm tabular-nums text-fg-subtle">
        {shown.length.toLocaleString("en")} companies · {rows.filter((r) => r.h).length} with full lore
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {shown.slice(0, limit).map((r) => (
          <Item key={`${r.n}${r.g ?? ""}${r.w ?? ""}`} r={r} />
        ))}
      </ul>
      {shown.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE * 2)}
          className="mt-4 h-11 w-full rounded-lg border border-border text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          Show more ({(shown.length - limit).toLocaleString("en")} left)
        </button>
      )}
    </div>
  );
}
