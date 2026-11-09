"use client";

import { runSearch, type SearchIndex } from "@/lib/search-core";
import { withBase } from "@/lib/base";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, use, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ThemeProvider } from "twenty-ui/theme";
import { ListItem } from "twenty-ui/primitives/navigation";
import { Dialog } from "twenty-ui/primitives/surfaces";
import { Shortcut, Text } from "twenty-ui/primitives/typography";
import { LightIconButton, MainButton, SearchInput } from "twenty-ui/components/input";
import { Badge } from "twenty-ui/primitives/data-display";
import {
  IconArrowLeft,
  IconBook2,
  IconBuildingSkyscraper,
  IconCoins,
  IconFlask,
  IconHome,
  IconLayoutGrid,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconMap,
  IconMoneybag,
  IconMoon,
  IconSearch,
  IconSun,
  IconUser,
  IconTimelineEvent,
  IconBlockquote,
} from "twenty-ui/icon";
import { IconApi, IconChartBar, IconGauge, IconPlus, IconRocket, IconSparkles, IconSwitchHorizontal } from "twenty-ui/icon";
import type { SearchHit } from "@/lib/types";
import { HUES, sectionGloss } from "./ui";

// The Twenty design is the default: its pages answer the public URLs (see src/proxy.ts).
const T = "";

// ---------------------------------------------------------------------------------------------
// Color scheme: the variant keeps its own preference (light by default, like Twenty itself).

const KEY = "twenty-theme";
const EVENT = "twenty:theme";
type Scheme = "light" | "dark";
const readScheme = (): Scheme => {
  try {
    return localStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
const setScheme = (s: Scheme) => {
  try {
    localStorage.setItem(KEY, s);
  } catch {}
  window.dispatchEvent(new Event(EVENT));
};


// ---------------------------------------------------------------------------------------------

export type NavCounts = Record<"companies" | "rounds" | "investors" | "people" | "places" | "stories" | "categories", number>;

const NAV = [
  { href: "/", label: "Home", icon: IconHome, section: "home", exact: true },
  { href: `${T}/companies`, label: "Companies", icon: IconBuildingSkyscraper, section: "companies", count: "companies" },
  { href: `${T}/rounds`, label: "Rounds", icon: IconCoins, section: "rounds", count: "rounds" },
  { href: `${T}/investors`, label: "Investors", icon: IconMoneybag, section: "investors", count: "investors" },
  { href: `${T}/people`, label: "People", icon: IconUser, section: "people", count: "people" },
  { href: `${T}/categories`, label: "Categories", icon: IconLayoutGrid, section: "categories", count: "categories" },
  { href: `${T}/places`, label: "Places", icon: IconMap, section: "places", count: "places" },
  { href: `${T}/stories`, label: "Stories", icon: IconBook2, section: "stories", count: "stories" },
] as const;

/** The rest of the site: tools and reference pages. */
const MORE = [
  { href: "/portfolios/yc", match: "/portfolios", label: "Portfolios", icon: IconRocket, section: "portfolios" },
  { href: "/benchmarks", label: "Benchmarks", icon: IconGauge, section: "benchmarks" },
  { href: "/ideas", label: "Ideas", icon: IconSparkles, section: "ideas" },
  { href: "/compare", label: "Compare", icon: IconSwitchHorizontal, section: "compare" },
  { href: "/stats", label: "Stats", icon: IconChartBar, section: "stats" },
  { href: "/developers", label: "API", icon: IconApi, section: "api" },
] as const;

const SECTIONS = ["companies", "rounds", "investors", "people", "categories", "places", "stories"];

function isActive(path: string, href: string, exact?: boolean) {
  if (exact) return path === href;
  if (path.startsWith(href)) return true;
  // Company records live at /lab/twenty/<slug>: they belong to Companies.
  if (href === `${T}/companies`) {
    const rest = path.slice(1).split("/")[0];
    return Boolean(rest) && !SECTIONS.includes(rest);
  }
  return false;
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));

function ActiveNav({ counts, onNavigate }: { counts: Promise<NavCounts>; onNavigate?: () => void }) {
  return <NavList path={usePathname()} counts={use(counts)} onNavigate={onNavigate} />;
}

function NavList({ path, counts: n, onNavigate }: { path?: string; counts?: NavCounts; onNavigate?: () => void }) {
  return (
    <>
    <div className="tw-drawer-group">
      <div className="tw-drawer-label">Archive</div>
      {NAV.map((item) => {
        const active = path ? isActive(path, item.href, "exact" in item && item.exact) : false;
        return (
          <ListItem
            key={item.href}
            active={active}
            startIcon={sectionGloss(item.section, item.icon)}
            description={"count" in item && n ? compact(n[item.count]) : undefined}
            descriptionPlacement="end"
            render={<Link href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate} />}
          >
            {item.label}
          </ListItem>
        );
      })}
    </div>
    <div className="tw-drawer-group">
      <div className="tw-drawer-label">More</div>
      {MORE.map((item) => {
        const active = path ? path.startsWith("match" in item ? item.match : item.href) : false;
        return (
          <ListItem
            key={item.href}
            active={active}
            startIcon={sectionGloss(item.section, item.icon)}
            render={<Link href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate} />}
          >
            {item.label}
          </ListItem>
        );
      })}
    </div>
    </>
  );
}

const noop = () => () => {};
/** False on the server and during hydration: for output that depends on the device (⌘ vs Ctrl). */
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

function Drawer({ counts, onSearch, onNavigate, onCollapse }: { counts: Promise<NavCounts>; onSearch: () => void; onNavigate?: () => void; onCollapse: () => void }) {
  const mounted = useMounted();
  const scheme = useSyncExternalStore(subscribe, readScheme, () => "light" as Scheme);
  return (
    <nav aria-label="Main" className="tw-drawer">
      <div className="tw-workspace">
        <span className="tw-workspace-name">Hyperlore</span>
        <LightIconButton
          aria-label={scheme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          tooltip={scheme === "dark" ? "Light theme" : "Dark theme"}
          emphasis="subtle"
          size="sm"
          onClick={() => setScheme(scheme === "dark" ? "light" : "dark")}
        >
          {scheme === "dark" ? <IconSun /> : <IconMoon />}
        </LightIconButton>
        <span className="tw-collapse-in">
          <LightIconButton aria-label="Collapse navigation" tooltip="Collapse navigation" emphasis="subtle" size="sm" onClick={onCollapse}>
            <IconLayoutSidebarLeftCollapse />
          </LightIconButton>
        </span>
      </div>
      <div className="tw-drawer-group">
        <ListItem startIcon={sectionGloss("search", IconSearch)} render={<button type="button" onClick={onSearch} />} shortcut={mounted ? ["Mod", "K"] : undefined}>
          Search
        </ListItem>
      </div>
      <Suspense fallback={<NavList />}>
        <ActiveNav counts={counts} onNavigate={onNavigate} />
      </Suspense>
      <div className="tw-drawer-group">
        <div className="tw-drawer-label">Other views</div>
        <ListItem startIcon={<IconTimelineEvent />} render={<a href="/?style=classic" />}>
          Classic design
        </ListItem>
        <ListItem startIcon={<IconFlask />} render={<a href="/lab" />}>
          Style lab
        </ListItem>
      </div>
      <div className="tw-drawer-foot">
        <MainButton size="sm" fullWidth startIcon={<IconPlus />} render={<Link href="/request" onClick={onNavigate} />} nativeButton={false} style={{ marginBottom: 8 }}>
          Request a company
        </MainButton>
        <Text size="xs" color="tertiary">
          Every fact links to where it was said.
        </Text>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------------------------
// Search (⌘K): the archive-wide search API, in a Twenty dialog.

const HIT_ICON: Record<SearchHit["type"], typeof IconHome> = {
  company: IconBuildingSkyscraper,
  person: IconUser,
  investor: IconMoneybag,
  place: IconMap,
  story: IconBook2,
  event: IconTimelineEvent,
  quote: IconBlockquote,
};
const HIT_LABEL: Record<SearchHit["type"], string> = {
  company: "Companies",
  person: "People",
  investor: "Investors",
  place: "Places",
  story: "Stories",
  event: "Events",
  quote: "Quotes",
};


// The static site has no search API: the index is one prebuilt file, fetched the first time the menu opens.
let indexPromise: Promise<SearchIndex> | null = null;
const loadIndex = () =>
  (indexPromise ??= fetch(withBase("/search-index.json")).then((r) => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json() as Promise<SearchIndex>;
  }).catch((e) => {
    indexPromise = null;
    throw e;
  }));

function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const id = ++latest.current;
    if (q.trim().length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const results = runSearch(await loadIndex(), q.trim().slice(0, 100));
        if (id === latest.current && !ctrl.signal.aborted) {
          setHits(results);
          setCursor(0);
        }
      } catch {}
      if (id === latest.current) setLoading(false);
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (href: string) => {
    onOpenChange(false);
    setQ("");
    router.push(href);
  };

  const groups = (Object.keys(HIT_LABEL) as SearchHit["type"][])
    .map((type) => ({ type, hits: hits.filter((h) => h.type === type).slice(0, 6) }))
    .filter((g) => g.hits.length);
  const flat = groups.flatMap((g) => g.hits);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Viewport>
          <Dialog.Popup size="lg" className="tw-search" aria-label="Search the archive">
            <div className="tw-search-input">
              <SearchInput
                autoFocus
                aria-label="Search the archive"
                placeholder="Search companies, people, investors, events, quotes…"
                value={q}
                onValueChange={setQ}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, flat.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  } else if (e.key === "Enter" && flat[cursor]) {
                    e.preventDefault();
                    go(flat[cursor].href);
                  }
                }}
              />
            </div>
            <div className="tw-search-results" role="listbox" aria-label="Results">
              {q.trim().length < 2 ? (
                <div className="tw-search-empty">
                  <Text color="tertiary">Type at least two letters. Results open right here.</Text>
                </div>
              ) : loading && !hits.length ? (
                <div className="tw-search-empty">
                  <Text color="tertiary">Searching…</Text>
                </div>
              ) : !flat.length ? (
                <div className="tw-search-empty">
                  <Text color="tertiary">Nothing matches “{q.trim()}”.</Text>
                </div>
              ) : (
                groups.map((g) => {
                  const Icon = HIT_ICON[g.type];
                  return (
                    <div key={g.type} className="tw-search-group">
                      <div className="tw-drawer-label">{HIT_LABEL[g.type]}</div>
                      {g.hits.map((h) => {
                        const i = flat.indexOf(h);
                        return (
                          <ListItem
                            key={h.href + h.title}
                            focused={i === cursor}
                            startIcon={<Icon />}
                            description={h.subtitle}
                            render={
                              <Link
                                href={h.href}
                                role="option"
                                aria-selected={i === cursor}
                                onMouseEnter={() => setCursor(i)}
                                onClick={(e) => {
                                  e.preventDefault();
                                  go(h.href);
                                }}
                              />
                            }
                          >
                            {h.title}
                          </ListItem>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
            <div className="tw-search-foot">
              <Text size="xs" color="tertiary">
                <Shortcut shortcut={["↑"]} variant="keys" /> <Shortcut shortcut={["↓"]} variant="keys" /> to move ·{" "}
                <Shortcut shortcut={["Enter"]} variant="keys" /> to open · <Shortcut shortcut={["Esc"]} variant="keys" /> to close
              </Text>
              {flat.length > 0 && <Badge>{flat.length} results</Badge>}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------------------------------------------------------------------------------------------

export function TwentyShell({ counts, children }: { counts: Promise<NavCounts>; children: ReactNode }) {
  const scheme = useSyncExternalStore(subscribe, readScheme, () => "light" as Scheme);
  const [search, setSearch] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // The classic site's ⌘K menu is mounted underneath: this variant's search takes the shortcut.
        e.stopImmediatePropagation();
        setSearch((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, []);

  return (
    <ThemeProvider colorScheme={scheme} applyToRoot={false}>
      <div className="tw-app" data-collapsed={collapsed || undefined} data-drawer={drawer || undefined}>
        <div className="tw-drawer-wrap">
          <Drawer counts={counts} onSearch={() => setSearch(true)} onNavigate={() => setDrawer(false)} onCollapse={() => setCollapsed(true)} />
        </div>
        <button type="button" aria-hidden="true" tabIndex={-1} className="tw-scrim" onClick={() => setDrawer(false)} />
        <div className="tw-main">
          <div className="tw-mobilebar">
            <LightIconButton aria-label="Open navigation" size="md" onClick={() => setDrawer(true)}>
              <IconLayoutSidebarLeftExpand />
            </LightIconButton>
            <span className="tw-workspace-name">Hyperlore</span>
            <LightIconButton aria-label="Search" size="md" onClick={() => setSearch(true)}>
              <IconSearch />
            </LightIconButton>
          </div>
          {collapsed && (
            <div className="tw-collapse">
              <LightIconButton aria-label="Expand navigation" tooltip="Expand navigation" tooltipPlace="right" emphasis="subtle" size="sm" onClick={() => setCollapsed(false)}>
                <IconLayoutSidebarLeftExpand />
              </LightIconButton>
            </div>
          )}
          {children}
        </div>
      </div>
      <SearchDialog open={search} onOpenChange={setSearch} />
    </ThemeProvider>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <LightIconButton aria-label={label} tooltip={label} size="sm" render={<Link href={href} />} nativeButton={false} role="link">
      <IconArrowLeft />
    </LightIconButton>
  );
}
