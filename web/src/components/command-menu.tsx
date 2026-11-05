"use client";

import { Command } from "cmdk";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Gauge,
  GitCompareArrows,
  Landmark,
  LayoutGrid,
  Lightbulb,
  LoaderCircle,
  MapPin,
  Moon,
  Quote,
  Rocket,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CompanyIndexEntry } from "@/lib/lore";
import type { Logo, SearchHit } from "@/lib/types";
import { Gloss, type GlossItem } from "./gloss";
import { CompanyMark } from "./lore";
import { nextTheme, setTheme, themeLabel, useTheme } from "./theme-toggle";

// The compact company list, fetched once per page session (on first open, or when the pointer or
// focus reaches the search button), then matched locally on every keystroke.
let companyList: Promise<CompanyIndexEntry[]> | undefined;
export function loadCompanyIndex() {
  companyList ??= fetch("/api/v1/search/companies")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { companies?: CompanyIndexEntry[] }) => d.companies ?? [])
    .catch(() => {
      companyList = undefined;
      return [];
    });
  return companyList;
}

/** Same ranking as the server: exact name, prefix, word prefix, then anywhere in a name. */
function matchCompanies(list: CompanyIndexEntry[], q: string) {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return [];
  const rank = (c: CompanyIndexEntry) => {
    const names = [c.name, c.slug, ...c.aka].map((n) => n.toLowerCase());
    if (names.some((n) => n === query)) return 0;
    if (names.some((n) => n.startsWith(query))) return 1;
    if (names.some((n) => n.includes(` ${query}`) || n.includes(`-${query}`))) return 2;
    return query.length > 3 && names.some((n) => n.includes(query)) ? 3 : -1;
  };
  return list
    .map((c) => ({ c, r: rank(c) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.c.name.localeCompare(b.c.name))
    .slice(0, 12)
    .map((x) => x.c);
}

const asLogo = (slug: string, l?: Pick<Logo, "src" | "variant">): Logo | undefined =>
  l && { id: l.src, company: slug, kind: "icon", src: l.src, variant: l.variant, sourceUrl: "" };

const GROUPS: { type: SearchHit["type"]; label: string; item: GlossItem }[] = [
  { type: "company", label: "Companies", item: { icon: Building2, hue: 215 } },
  { type: "person", label: "People", item: { icon: Users, hue: 262 } },
  { type: "investor", label: "Investors", item: { icon: Landmark, hue: 38 } },
  { type: "place", label: "Places", item: { icon: MapPin, hue: 10 } },
  { type: "story", label: "Stories", item: { icon: BookOpen, hue: 330 } },
  { type: "event", label: "Events", item: { icon: CalendarDays, hue: 185 } },
  { type: "quote", label: "Quotes", item: { icon: Quote, hue: 0, sat: 0 } },
];

const GROUP_CLASS =
  "[&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle";

const ROW = "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 data-[selected=true]:bg-bg-hover";

/** The query's first match in a result, lit up. */
function Lit({ text, q }: { text: string; q: string }) {
  const i = q.length < 2 ? -1 : text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent font-semibold text-accent">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

// Directory pages, offered when the box is empty or the query names one ("comp", "investors", "vc").
const PAGES = [
  { href: "/companies", item: { icon: Building2, hue: 215 }, title: "All companies (table and filters)", match: ["companies", "directory", "table", "browse", "startups"] },
  { href: "/categories", item: { icon: LayoutGrid, hue: 185 }, title: "Categories (AI, devtools, fintech…)", match: ["categories", "sectors", "industries", "verticals", "markets"] },
  { href: "/rounds", item: { icon: CircleDollarSign, hue: 145 }, title: "Funding rounds (every round, filterable, CSV)", match: ["rounds", "funding", "raises", "deals", "series", "seed", "csv"] },
  { href: "/portfolios/yc", item: { icon: Rocket, hue: 28 }, title: "Every Y Combinator company", match: ["yc", "y combinator", "portfolios", "batch"] },
  { href: "/portfolios/a16z", item: { icon: Rocket, hue: 28 }, title: "Every a16z investment", match: ["a16z", "andreessen", "portfolios"] },
  { href: "/portfolios/kima", item: { icon: Rocket, hue: 28 }, title: "Every Kima Ventures company", match: ["kima", "xavier niel", "portfolios"] },
  { href: "/portfolios/frst", item: { icon: Rocket, hue: 28 }, title: "Frst portfolio", match: ["frst", "first", "french vc", "portfolios"] },
  { href: "/benchmarks", item: { icon: Gauge, hue: 20 }, title: "AI benchmarks (who runs them, what they measure)", match: ["benchmarks", "evals", "leaderboards", "swe-bench", "arc"] },
  { href: "/ideas", item: { icon: Lightbulb, hue: 74 }, title: "Startup ideas (spreadsheet)", match: ["ideas", "spreadsheet", "sheet", "stack"] },
  { href: "/compare", item: { icon: GitCompareArrows, hue: 200 }, title: "Compare companies side by side", match: ["compare", "versus", "vs", "side by side"] },
  { href: "/stats", item: { icon: BarChart3, hue: 280 }, title: "Archive statistics", match: ["stats", "statistics", "numbers", "totals"] },
  { href: "/investors", item: { icon: Landmark, hue: 38 }, title: "All investors", match: ["investors", "vc", "funds", "backers"] },
  { href: "/people", item: { icon: Users, hue: 262 }, title: "All people", match: ["people", "founders", "persons"] },
  { href: "/places", item: { icon: MapPin, hue: 10 }, title: "Places", match: ["places", "offices", "garages"] },
  { href: "/stories", item: { icon: BookOpen, hue: 330 }, title: "Stories", match: ["stories", "sagas"] },
];

export function SearchButton({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("hyperlore:search"))}
      onPointerEnter={() => void loadCompanyIndex()}
      onFocus={() => void loadCompanyIndex()}
      className={
        size === "lg"
          ? "flex h-12 w-full items-center gap-3 rounded-lg border border-border bg-bg px-4 text-left text-fg-subtle shadow-sm transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          : "flex h-10 w-full max-w-60 items-center gap-2 rounded-lg border border-border bg-bg-subtle px-2.5 text-left text-sm text-fg-subtle transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      }
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" strokeLinecap="round" />
      </svg>
      <span className="flex-1 truncate">
        {size === "lg" ? "Search companies, founders, investors, events…" : "Search…"}
      </span>
      <kbd className="hidden rounded border border-border px-1.5 font-mono text-[11px] sm:inline">⌘K</kbd>
    </button>
  );
}

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyIndexEntry[] | null>(null);
  const latest = useRef(0);
  const inflight = useRef<AbortController | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const theme = useTheme();
  const showTheme = query.trim().length < 2 || /theme|dark|light|mode|system/i.test(query);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("hyperlore:search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hyperlore:search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open || companies) return;
    let live = true;
    loadCompanyIndex().then((list) => live && list.length && setCompanies(list));
    return () => {
      live = false;
    };
  }, [open, companies]);

  // Opened with ⌘K there is no trigger to return to: remember what had focus and restore it on close.
  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return;
    }
    const el = returnFocus.current;
    returnFocus.current = null;
    if (el?.isConnected) requestAnimationFrame(() => el.focus({ preventScroll: true }));
  }, [open]);

  const runSearch = async (q: string) => {
    setQuery(q);
    const id = ++latest.current;
    if (q.trim().length < 2) {
      inflight.current?.abort();
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Wait for a pause in typing, and cancel the request a newer keystroke made obsolete.
    await new Promise((r) => setTimeout(r, 120));
    if (id !== latest.current) return;
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    let results: SearchHit[] = [];
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
      if (res.ok) results = ((await res.json()) as { results?: SearchHit[] }).results ?? [];
    } catch {
      // Offline or a failed request: show "nothing matches" rather than a spinner forever.
    }
    // Ignore responses that arrive after a newer keystroke.
    if (id === latest.current) {
      setHits(results);
      setLoading(false);
    }
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const q = query.trim();
  // With the local list loaded, companies come from it (instantly); the server answers the rest.
  const localCompanies = companies ? matchCompanies(companies, q) : [];
  const serverHits = companies ? hits.filter((h) => h.type !== "company") : hits;
  const browse: { href: string; title: string; item: GlossItem }[] = [
    ...(q.length >= 2 ? [{ href: `/companies?q=${encodeURIComponent(q)}`, title: `Filter companies by “${q}”`, item: { icon: SlidersHorizontal, hue: 215 } }] : []),
    ...PAGES.filter((p) => q.length < 2 || p.match.some((m) => m.startsWith(q.toLowerCase()))),
  ];

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      shouldFilter={false}
      label="Search Hyperlore"
      overlayClassName="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
      contentClassName="pad fixed left-1/2 top-3 z-50 flex max-h-[calc(100dvh-1.5rem)] w-[min(640px,calc(100vw-1.5rem))] -translate-x-1/2 flex-col overflow-hidden rounded-2xl sm:top-[12vh] sm:max-h-[70vh]"
    >
      <div className="flex shrink-0 items-center gap-2.5 border-b border-border px-4">
        {loading ? (
          <LoaderCircle aria-hidden="true" className="size-4 shrink-0 text-accent motion-safe:animate-spin" />
        ) : (
          <Search aria-hidden="true" className="size-4 shrink-0 text-fg-subtle" />
        )}
        <Command.Input
          value={query}
          onValueChange={runSearch}
          placeholder="Search companies, founders, investors, events…"
          className="h-13 min-w-0 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-subtle"
        />
      </div>
      <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {q.length >= 2 && !loading && !serverHits.length && !localCompanies.length && (
          <p className="px-3 py-6 text-center text-sm text-fg-subtle">Nothing in the archive matches “{query}”.</p>
        )}
        {localCompanies.length > 0 && (
          <Command.Group heading="Companies" className={GROUP_CLASS}>
            {localCompanies.map((c) => (
              <Command.Item key={c.slug} value={`company /${c.slug}`} onSelect={() => go(`/${c.slug}`)} className={ROW}>
                <span className="flex size-7 shrink-0 items-center justify-center">
                  <CompanyMark logo={asLogo(c.slug, c.icon)} dark={asLogo(c.slug, c.iconDark)} name={c.name} size="sm" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm text-fg">
                    <Lit text={c.name} q={q} />
                    {!c.name.toLowerCase().includes(q.toLowerCase()) && c.former.some((a) => a.toLowerCase().includes(q.toLowerCase())) && (
                      <span className="text-fg-subtle"> · formerly {c.former.find((a) => a.toLowerCase().includes(q.toLowerCase()))}</span>
                    )}
                  </span>
                  {c.summary && <span className="truncate text-xs text-fg-subtle">{c.summary}</span>}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {GROUPS.map(({ type, label, item }) => {
          const group = serverHits.filter((h) => h.type === type);
          if (!group.length) return null;
          return (
            <Command.Group key={type} heading={label} className={GROUP_CLASS}>
              {group.map((h) => (
                <Command.Item key={h.href + h.title} value={h.href + h.title} onSelect={() => go(h.href)} className={ROW}>
                  <Gloss item={item} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-sm text-fg">
                      <Lit text={h.title} q={q} />
                    </span>
                    {h.subtitle && <span className="truncate text-xs text-fg-subtle">{h.subtitle}</span>}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          );
        })}
        {browse.length > 0 && (
          <Command.Group heading="Browse" className={GROUP_CLASS}>
            {browse.map((p) => (
              <Command.Item key={p.href} value={`browse ${p.href}`} onSelect={() => go(p.href)} className={`${ROW} text-sm text-fg`}>
                <Gloss item={p.item} />
                <span className="min-w-0 truncate">{p.title}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {showTheme && (
          <Command.Group heading="Actions" className={GROUP_CLASS}>
            <Command.Item value="action:toggle-theme" onSelect={() => setTheme(nextTheme(theme))} className={`${ROW} text-sm text-fg`}>
              <Gloss item={{ icon: Moon, hue: 0, sat: 0 }} />
              <span className="min-w-0 truncate">
                Switch to {themeLabel(nextTheme(theme)).toLowerCase()} theme
              </span>
            </Command.Item>
          </Command.Group>
        )}
      </Command.List>
      <p aria-hidden="true" className="hidden shrink-0 items-center gap-4 border-t border-border px-4 py-2 text-[11px] text-fg-subtle sm:flex">
        <span><kbd className="font-mono">↑↓</kbd> move</span>
        <span><kbd className="font-mono">↵</kbd> open</span>
        <span><kbd className="font-mono">esc</kbd> close</span>
      </p>
    </Command.Dialog>
  );
}
