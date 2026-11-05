"use client";

// Filter building blocks shared by the directories (companies, investors, people) and the timeline:
// URL-backed state, facet checkbox lists with counts, ranges, chips, and a sheet for phones.
import { Flag } from "./flag";
import { usePathname, useSearchParams } from "next/navigation";
import { type ReactNode, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Link2, SlidersHorizontal, X } from "lucide-react";

export const INPUT =
  "w-full rounded-md border border-border bg-bg px-2.5 text-[16px] text-fg outline-none placeholder:text-fg-subtle focus-visible:border-fg-subtle focus-visible:ring-2 focus-visible:ring-accent/30 sm:text-sm";
export const BUTTON =
  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md border border-border bg-bg px-2.5 text-sm text-fg-muted transition-[color,border-color,transform] duration-150 ease-out active:scale-[0.97] hover:border-border-strong hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:h-8";

/**
 * Filter state kept in the URL, so every filtered view is a shareable link. Writes use the native
 * History API (Next syncs useSearchParams with it): no server round trip. Discrete changes (a
 * checkbox, a chip, a sort) push an entry so Back undoes them; typing replaces, so it never spams
 * the history.
 */
export function useUrlState<T>(
  parse: (p: URLSearchParams) => T,
  serialize: (t: T) => string,
): [T, (t: T, opts?: { replace?: boolean }) => void] {
  const params = useSearchParams();
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => parse(new URLSearchParams(params.toString())), [params]);
  const set = useCallback(
    (next: T, opts?: { replace?: boolean }) => {
      const qs = serialize(next);
      const url = `${pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
      if (url === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
      // State must be null: Next skips its router sync for objects carrying its own markers (__NA),
      // and copies its internal tree into the new entry itself.
      if (opts?.replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathname],
  );
  return [value, set];
}

export type UrlState<T> = [T, (t: T, opts?: { replace?: boolean }) => void];

function ReadUrlState<T>({ parse, serialize, children }: { parse: (p: URLSearchParams) => T; serialize: (t: T) => string; children: (state: UrlState<T>) => ReactNode }) {
  return children(useUrlState(parse, serialize));
}

const ignore = () => {};

/**
 * Renders `children` with the URL's filter state. Pages built from the snapshot are prerendered, with no
 * query string to read: there useSearchParams would leave the whole view to the client, so the HTML
 * carries the unfiltered view instead (the Suspense fallback) and the URL's state takes over on load.
 * Rendered per request (live data), the state is read on the server and the fallback never shows.
 */
export function WithUrlState<T>(props: { parse: (p: URLSearchParams) => T; serialize: (t: T) => string; children: (state: UrlState<T>) => ReactNode }) {
  return (
    <Suspense fallback={props.children([props.parse(new URLSearchParams()), ignore])}>
      <ReadUrlState {...props} />
    </Suspense>
  );
}

/**
 * A list the page doesn't carry in full (it renders the first rows only): fetched from `src` after load.
 * Without `src`, `ready` is the list itself. `items` is null until it has arrived.
 */
export function useFullList<T>(ready: T[] | undefined, src: string | undefined) {
  const [fetched, setFetched] = useState<T[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (ready || !src) return;
    let current = true;
    fetch(src)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(
        (list: T[]) => current && setFetched(list),
        () => current && setFailed(true),
      );
    return () => {
      current = false;
    };
  }, [ready, src, attempt]);
  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };
  return { items: ready ?? fetched, failed, retry };
}

/** Stands in for a filter panel (or a filtered view) until the full list has arrived. */
export function ListLoading({ failed, retry, label, rows = 6 }: { failed: boolean; retry: () => void; label: string; rows?: number }) {
  if (failed)
    return (
      <div role="status" className="rounded-lg border border-dashed border-border-strong p-4 text-sm text-fg-muted">
        The full list did not load.
        <button type="button" onClick={retry} className={`${BUTTON} mt-3 flex`}>
          Try again
        </button>
      </div>
    );
  return (
    <div aria-busy="true" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-24 rounded bg-bg-hover" />
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

export const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export type FacetOption = { value: string; label: string; count: number; hint?: ReactNode };

/** A titled, collapsible group of checkboxes with result counts; long lists get a finder and "show all". */
export function FacetGroup({
  title,
  options,
  selected,
  onToggle,
  limit = 6,
  defaultOpen = true,
  empty,
  flags,
  children,
}: {
  title: string;
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  limit?: number;
  defaultOpen?: boolean;
  empty?: string;
  /** Option values are country codes: show their flags. */
  flags?: boolean;
  children?: ReactNode;
}) {
  const [all, setAll] = useState(false);
  const [find, setFind] = useState("");
  const id = useId();
  // Selected options always stay visible, even when another filter brings their count to zero.
  const visible = options.filter((o) => o.count > 0 || selected.includes(o.value));
  const found = find ? visible.filter((o) => o.label.toLowerCase().includes(find.toLowerCase())) : visible;
  const shown = all || find ? found : [...found.filter((o) => selected.includes(o.value)), ...found.filter((o) => !selected.includes(o.value))].slice(0, Math.max(limit, selected.length));
  return (
    <details open={defaultOpen || selected.length > 0} className="group/facet border-b border-border py-3 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded text-xs font-medium text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {selected.length > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 py-px text-[10px] tabular-nums text-on-primary">{selected.length}</span>}
        </span>
        <span aria-hidden="true" className="text-fg-subtle transition-transform group-open/facet:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-2">
        {children}
        {visible.length > 10 && (
          <input
            type="search"
            value={find}
            onChange={(e) => setFind(e.target.value)}
            placeholder={`Find ${title.toLowerCase()}…`}
            aria-label={`Find in ${title}`}
            className={`${INPUT} mb-2 h-10 sm:h-8`}
          />
        )}
        {!visible.length ? (
          <p className="text-xs text-fg-subtle">{empty ?? "Nothing to filter by yet."}</p>
        ) : (
          <ul className="space-y-px" aria-label={title}>
            {shown.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <li key={o.value}>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded px-1.5 py-2.5 text-sm hover:bg-bg-hover lg:py-1 has-focus-visible:outline-2 has-focus-visible:outline-accent ${
                      o.count === 0 && !checked ? "opacity-50" : ""
                    }`}
                  >
                    <input type="checkbox" checked={checked} onChange={() => onToggle(o.value)} className="peer sr-only" />
                    <span
                      aria-hidden="true"
                      className="flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border border-border-strong bg-bg text-on-primary peer-checked:border-fg peer-checked:bg-primary"
                    >
                      {checked && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-fg-muted peer-checked:text-fg">{flags && <Flag code={o.value} className="mr-1.5" />}
{o.label}</span>
                    {o.hint}
                    <span className="shrink-0 text-xs tabular-nums text-fg-subtle">{o.count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
        {!find && found.length > shown.length && (
          <button type="button" id={id} onClick={() => setAll(true)} className="mt-1 rounded px-1.5 py-2 text-xs text-fg-muted hover:text-fg lg:py-0 focus-visible:outline-2 focus-visible:outline-accent">
            Show all {found.length}
          </button>
        )}
        {all && !find && found.length > limit && (
          <button type="button" onClick={() => setAll(false)} className="mt-1 rounded px-1.5 py-2 text-xs text-fg-muted hover:text-fg lg:py-0 focus-visible:outline-2 focus-visible:outline-accent">
            Show fewer
          </button>
        )}
      </div>
    </details>
  );
}

/** Min–max number inputs. Values commit as you type; an empty field means "no bound". */
export function RangeGroup({
  title,
  unit,
  min,
  max,
  onChange,
  placeholder = ["Min", "Max"],
  step,
  defaultOpen = true,
  minOnly,
}: {
  title: string;
  unit?: string;
  min?: number;
  max?: number;
  onChange: (min?: number, max?: number) => void;
  placeholder?: [string, string];
  step?: number;
  defaultOpen?: boolean;
  /** A single "at least" field. */
  minOnly?: boolean;
}) {
  const num = (s: string) => (s.trim() === "" || !Number.isFinite(Number(s)) ? undefined : Number(s));
  return (
    <details open={defaultOpen || min !== undefined || max !== undefined} className="group/facet border-b border-border py-3 last:border-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded text-xs font-medium text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        <span>
          {title}
          {unit && <span className="ml-1 font-normal text-fg-subtle">{unit}</span>}
        </span>
        <span aria-hidden="true" className="text-fg-subtle transition-transform group-open/facet:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={step}
          value={min ?? ""}
          onChange={(e) => onChange(num(e.target.value), max)}
          placeholder={placeholder[0]}
          aria-label={`${title}, minimum`}
          className={`${INPUT} h-10 tabular-nums sm:h-8`}
        />
        {!minOnly && (
          <>
            <span aria-hidden="true" className="text-fg-subtle">
              –
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              step={step}
              value={max ?? ""}
              onChange={(e) => onChange(min, num(e.target.value))}
              placeholder={placeholder[1]}
              aria-label={`${title}, maximum`}
              className={`${INPUT} h-10 tabular-nums sm:h-8`}
            />
          </>
        )}
      </div>
    </details>
  );
}

export function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="mb-2 flex cursor-pointer items-center gap-2 rounded px-1.5 py-2.5 text-sm lg:py-1 text-fg-muted hover:bg-bg-hover has-focus-visible:outline-2 has-focus-visible:outline-accent">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-4 w-7 shrink-0 rounded-full bg-border-strong transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-3 after:rounded-full after:bg-bg after:transition-transform peer-checked:bg-fg peer-checked:after:translate-x-3"
      />
      <span className="peer-checked:text-fg">{label}</span>
    </label>
  );
}

/** Active filters as removable chips, the result count, and "clear all". */
export function ActiveFilters({
  chips,
  onClear,
  count,
  total,
  noun,
}: {
  chips: { key: string; label: string; onRemove: () => void }[];
  onClear: () => void;
  count: number;
  total: number;
  noun: [string, string];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <p aria-live="polite" className="mr-1 text-sm tabular-nums text-fg-muted">
        {count === total ? (
          <>
            {total} {total === 1 ? noun[0] : noun[1]}
          </>
        ) : (
          <>
            <span className="font-medium text-fg">{count}</span> of {total} {total === 1 ? noun[0] : noun[1]}
          </>
        )}
      </p>
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          aria-label={`Remove filter: ${c.label}`}
          className="inline-flex h-8 max-w-64 items-center gap-1 rounded-full sm:h-6 border border-border bg-bg-subtle pl-2.5 pr-1.5 text-xs text-fg transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-accent"
        >
          <span className="truncate">{c.label}</span>
          <X aria-hidden="true" className="size-3 shrink-0 text-fg-subtle" />
        </button>
      ))}
      {chips.length > 0 && (
        <button type="button" onClick={onClear} className="ml-1 rounded py-2 text-xs text-fg-muted underline-offset-2 sm:py-0 hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          Clear all
        </button>
      )}
    </div>
  );
}

/** Copies the current URL (which holds the filters) to the clipboard. */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setCopied(true);
        } catch {
          window.prompt("Copy this link", window.location.href);
        }
      }}
      className={BUTTON}
      title="Copy a link to this filtered view"
    >
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Link2 aria-hidden="true" className="size-4" />}
      <span aria-live="polite">{copied ? "Link copied" : "Save view as link"}</span>
    </button>
  );
}

/**
 * Filters on phones: a modal sheet (native <dialog>: focus trap, Escape and inert page for free).
 * On large screens the same panel sits in a sidebar instead, so this button is hidden there.
 */
export function FilterSheet({ active, resultLabel, children }: { active: number; resultLabel: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // The panel is only rendered while open: the sidebar already has a copy, and a closed sheet
  // would double the filter markup on every page load.
  const [open, setOpen] = useState(false);
  // Growing past the breakpoint hides the sheet with CSS, but a hidden modal still leaves the page
  // inert: close it instead.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 64rem)");
    const onChange = () => mq.matches && ref.current?.close();
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          ref.current?.showModal();
        }}
        className={`${BUTTON} lg:hidden`}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filters
        {active > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] tabular-nums text-on-primary">{active}</span>}
      </button>
      <dialog
        ref={ref}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-[min(24rem,100vw)] max-w-none border-l border-border bg-bg p-0 text-fg backdrop:bg-black/40 lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 id={titleId} className="text-base font-semibold">
              Filters
            </h2>
            <button type="button" onClick={() => ref.current?.close()} className={BUTTON} aria-label="Close filters">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4">{open && children}</div>
          <div className="border-t border-border p-4">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="h-10 w-full rounded-md bg-primary text-sm font-medium text-on-primary transition-opacity hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {resultLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** A search box that keeps its own text (so typing never lags) and reports changes upward. */
export function SearchInput({ value, onChange, placeholder, label }: { value: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const [text, setText] = useState(value);
  // Follow outside changes (clear all, a chip removed, back/forward).
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) setText(value);
    last.current = value;
  }, [value]);
  return (
    <div className="relative min-w-0 flex-[1_1_100%] sm:flex-1">
      <svg aria-hidden="true" viewBox="0 0 16 16" className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          last.current = e.target.value;
          onChange(e.target.value);
        }}
        placeholder={placeholder}
        aria-label={label}
        maxLength={100}
        className={`${INPUT} h-10 pl-8 sm:h-8`}
      />
    </div>
  );
}
