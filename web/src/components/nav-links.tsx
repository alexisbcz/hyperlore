"use client";

import { BarChart3, BookOpen, Building2, CircleDollarSign, Code2, GitCompareArrows, Gauge, Home, Landmark, LayoutGrid, Lightbulb, MapPin, Rocket, Search, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";
import { Gloss, type GlossItem } from "./gloss";

type Item = GlossItem & { href: string; label: string };

const NAV: Item[] = [
  { href: "/", label: "Home", icon: Home, hue: 0, sat: 0 },
  { href: "/companies", label: "Companies", icon: Building2, hue: 215 },
  { href: "/categories", label: "Categories", icon: LayoutGrid, hue: 185 },
  { href: "/rounds", label: "Rounds", icon: CircleDollarSign, hue: 145 },
  { href: "/people", label: "People", icon: Users, hue: 262 },
  { href: "/investors", label: "Investors", icon: Landmark, hue: 38 },
  { href: "/places", label: "Places", icon: MapPin, hue: 10 },
  { href: "/stories", label: "Stories", icon: BookOpen, hue: 330 },
];

const MORE: Item[] = [
  { href: "/portfolios/yc", label: "Portfolios", icon: Rocket, hue: 28, sat: 95 },
  { href: "/benchmarks", label: "Benchmarks", icon: Gauge, hue: 20, sat: 85 },
  { href: "/ideas", label: "Ideas", icon: Lightbulb, hue: 74, sat: 80 },
  { href: "/compare", label: "Compare", icon: GitCompareArrows, hue: 200, sat: 50 },
  { href: "/stats", label: "Stats", icon: BarChart3, hue: 280, sat: 50 },
  { href: "/developers", label: "API", icon: Code2, hue: 0, sat: 0 },
];

const DOCK = ["/", "/companies", "/rounds", "/stories"];

// Top-level pages that aren't a company, so "Companies" doesn't light up on them.
const OTHER = ["/request", "/correct", "/lab"];

function activeHref(path: string) {
  if (path === "/") return "/";
  // Company pages live at the root, so "Companies" is active everywhere outside the other sections.
  const section = [...NAV, ...MORE].find((n) => n.href !== "/" && path.startsWith(n.href));
  return section?.href ?? (OTHER.some((p) => path.startsWith(p)) ? "" : "/companies");
}

function SideLinks({ active }: { active?: string }) {
  const row = (n: Item) => (
    <Link key={n.href} href={n.href} aria-current={active === n.href ? "page" : undefined} className="side-link">
      <Gloss item={n} />
      {n.label}
    </Link>
  );
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV.map(row)}
      <span aria-hidden="true" className="mx-1.5 my-2 h-px bg-border" />
      {MORE.map(row)}
    </nav>
  );
}

function ActiveSide() {
  return <SideLinks active={activeHref(usePathname())} />;
}

/** The pathname is only known at request time, so the highlighted state streams in; prerendered HTML gets plain links. */
export function SidebarNav() {
  return (
    <Suspense fallback={<SideLinks />}>
      <ActiveSide />
    </Suspense>
  );
}

function DockLinks({ active }: { active?: string }) {
  const openSearch = () => window.dispatchEvent(new Event("hyperlore:search"));
  const cell = "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium text-fg-subtle transition-colors aria-[current=page]:text-fg";
  return (
    <nav aria-label="Sections" className="dock fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 flex rounded-2xl p-1 lg:hidden">
      {NAV.filter((n) => DOCK.includes(n.href)).map((n) => (
        <Link key={n.href} href={n.href} aria-current={active === n.href ? "page" : undefined} className={cell}>
          <Gloss item={n} />
          {n.label}
        </Link>
      ))}
      <button type="button" onClick={openSearch} className={cell}>
        <Gloss item={{ icon: Search, hue: 74, sat: 80 }} />
        Search
      </button>
    </nav>
  );
}

function ActiveDock() {
  return <DockLinks active={activeHref(usePathname())} />;
}

export function MobileDock() {
  return (
    <Suspense fallback={<DockLinks />}>
      <ActiveDock />
    </Suspense>
  );
}

// Recently opened companies, kept in this browser only.
export type Recent = { slug: string; name: string; icon?: string };

const RECENT_KEY = "hyperlore:recent";
const RECENT_EVENT = "hyperlore:recent";
const RECENT_MAX = 6;

let cache: { raw: string | null; list: Recent[] } = { raw: null, list: [] };
const NONE: Recent[] = [];

function readRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw !== cache.raw) cache = { raw, list: raw ? (JSON.parse(raw) as Recent[]) : NONE };
    return cache.list;
  } catch {
    return NONE;
  }
}

export function rememberCompany(entry: Recent) {
  try {
    const list = [entry, ...readRecent().filter((r) => r.slug !== entry.slug)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(RECENT_EVENT));
  } catch {}
}

function subscribeRecent(onChange: () => void) {
  window.addEventListener(RECENT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(RECENT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function RecentCompanies() {
  const recent = useSyncExternalStore(subscribeRecent, readRecent, () => NONE);
  if (!recent.length) return null;
  return (
    <section aria-labelledby="recent-title" className="mt-5">
      <h2 id="recent-title" className="px-1.5 pb-1 text-xs font-medium text-fg-subtle">
        Recent
      </h2>
      <ul className="flex flex-col gap-0.5">
        {recent.map((r) => (
          <li key={r.slug}>
            <Link href={`/${r.slug}`} className="flex h-8 items-center gap-2.5 rounded-lg px-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-hover hover:text-fg">
              <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white text-[10px] font-semibold text-neutral-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {r.icon ? <img src={r.icon} alt="" className="size-4 object-contain" /> : r.name[0]}
              </span>
              <span className="truncate">{r.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
