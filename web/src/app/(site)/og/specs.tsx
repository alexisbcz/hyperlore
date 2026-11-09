import {
  IconAlertTriangle, IconArrowMerge, IconArrowsSplit2, IconBolt, IconBook2, IconBox, IconBrandGithub, IconBuildingSkyscraper,
  IconCalendarEvent, IconCoins, IconCurrencyDollar, IconFlag, IconHome, IconLink, IconLogout, IconMap, IconMoneybag, IconPaint,
  IconPencil, IconPhoto, IconPoint, IconPresentation, IconRocket, IconStar, IconTargetArrow, IconTimelineEvent, IconTrendingUp,
  IconUser, IconUserOff, IconUserPlus, IconUsers, IconWorldWww, IconFileText, IconBlockquote, IconLayoutGrid, IconStairs,
} from "@tabler/icons-react";
import { IconChartBar, IconSwitchHorizontal } from "@tabler/icons-react";
import { IconGauge, IconSparkles } from "@tabler/icons-react";
import { companyName } from "@/lib/lore";
import { formatDate } from "@/lib/format";
import { stageLabel } from "@/lib/directory";
import { companyRecord, dashboard, investorRecord, personRecord, story } from "../data";
import type { CardSpec, Row, Tile } from "./card";

// What each page's share card says. Icons are Tabler's own components here (the pages use client
// references, which Satori can't draw); hues match the glossy tiles in the app.

const SECTION: Record<string, Tile & { label: string }> = {
  home: { label: "Home", icon: IconHome, hue: 0, sat: 0 },
  companies: { label: "Companies", icon: IconBuildingSkyscraper, hue: 215 },
  rounds: { label: "Rounds", icon: IconCoins, hue: 145 },
  investors: { label: "Investors", icon: IconMoneybag, hue: 38 },
  people: { label: "People", icon: IconUser, hue: 262 },
  categories: { label: "Categories", icon: IconLayoutGrid, hue: 185 },
  places: { label: "Places", icon: IconMap, hue: 10 },
  stories: { label: "Stories", icon: IconBook2, hue: 330 },
  compare: { label: "Compare", icon: IconSwitchHorizontal, hue: 200, sat: 50 },
  stats: { label: "Stats", icon: IconChartBar, hue: 280, sat: 50 },
  ideas: { label: "Ideas", icon: IconSparkles, hue: 74, sat: 80 },
  benchmarks: { label: "Benchmarks", icon: IconGauge, hue: 20, sat: 85 },
};

// Event kinds: the timeline's tiles, same hue and label as in the app.
const KIND: Record<string, [string, Tile["icon"], number, number?]> = {
  founding: ["Founding", IconFlag, 220], funding: ["Funding", IconCoins, 145], rename: ["Rename", IconPencil, 275],
  logo: ["Logo", IconPhoto, 255], rebrand: ["Rebrand", IconPaint, 255], product: ["Product", IconBox, 200],
  launch: ["Launch", IconRocket, 28], acquisition: ["Acquisition", IconArrowMerge, 2], acquired: ["Acquired", IconArrowMerge, 2],
  hire: ["Hire", IconUserPlus, 172], departure: ["Departure", IconLogout, 0, 12], event: ["Event", IconCalendarEvent, 42],
  conference: ["Conference", IconPresentation, 42], milestone: ["Milestone", IconTargetArrow, 46], pivot: ["Pivot", IconArrowsSplit2, 330],
  domain: ["Domain", IconWorldWww, 188], office: ["Office", IconBuildingSkyscraper, 25, 12], controversy: ["Controversy", IconAlertTriangle, 10],
  partnership: ["Partnership", IconLink, 158], "open-source": ["Open source", IconBrandGithub, 120], pricing: ["Pricing", IconCurrencyDollar, 80],
  outage: ["Outage", IconBolt, 345], layoff: ["Layoff", IconUserOff, 350], other: ["Other", IconPoint, 0, 12],
};
const kindRow = (kind: string, title: string, date?: string): Row => {
  const [tag, icon, hue, sat = 85] = KIND[kind] ?? KIND.other;
  return { icon, hue, sat, title, tag, meta: formatDate(date) };
};

const usd = (n?: number) => (!n ? "" : n >= 1e12 ? `$${+(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `$${+(n / 1e9).toFixed(2)}B` : n >= 1e6 ? `$${+(n / 1e6).toFixed(1)}M` : `$${Math.round(n / 1e3)}K`);
const num = (n: number) => n.toLocaleString("en");

/** The events worth a share card: funding, renames, launches and the like before the small stuff. */
const NOTABLE = ["founding", "funding", "rename", "acquisition", "acquired", "launch", "product", "rebrand", "pivot", "milestone", "open-source"];
function highlights<E extends { kind: string; date: string }>(events: E[], n: number) {
  const rank = (k: string) => (NOTABLE.includes(k) ? NOTABLE.indexOf(k) : 99);
  const newest = events.toSorted((a, b) => b.date.localeCompare(a.date));
  // The newest event of each notable kind first, so one kind can't fill the card; then the rest.
  const picked: E[] = [];
  for (const kind of NOTABLE) {
    const e = newest.find((x) => x.kind === kind);
    if (e) picked.push(e);
  }
  for (const e of newest.toSorted((a, b) => rank(a.kind) - rank(b.kind))) if (!picked.includes(e)) picked.push(e);
  return picked.slice(0, n).toSorted((a, b) => b.date.localeCompare(a.date));
}

/** "Supabase · Supabase raises $200M" reads twice: drop the company when the title already names it. */
const withCompany = (company: string, title: string) => (title.toLowerCase().includes(company.toLowerCase()) ? title : `${company} · ${title}`);

export async function companySpec(slug: string): Promise<CardSpec | null> {
  const c = await companyRecord(slug);
  if (!c) return null;
  const last = c.funding.at(-1);
  const fields = [
    c.founded && { label: "Founded", value: c.founded.slice(0, 4), icon: IconCalendarEvent, hue: 220 },
    c.hq && { label: "HQ", value: c.hq.split(",")[0], icon: IconMap, hue: 10 },
    c.raisedUsd > 0 && { label: "Raised", value: usd(c.raisedUsd), icon: IconCoins, hue: 145 },
    c.valuation && { label: "Valuation", value: usd(c.valuation.usd), icon: IconTrendingUp, hue: 160 },
    last && { label: "Last round", value: last.stage ? stageLabel(last.stage) : last.round, icon: IconStairs, hue: 275 },
    c.formerNames[0] && { label: "Formerly", value: c.formerNames.join(", "), icon: IconPencil, hue: 275 },
  ].filter(Boolean) as CardSpec["fields"];
  return {
    section: SECTION.companies,
    title: c.name,
    subtitle: c.summary ?? c.tagline,
    image: c.logo?.src,
    fields,
    rowsLabel: "Timeline",
    rowsCount: num(c.events.length),
    rows: highlights(c.events, 6).map((e) => kindRow(e.kind, e.title, e.date)),
    footer: [`${num(Object.keys(c.sources).length)} sources`, `${num(c.quotes.length)} quotes`, `${num(c.people.length)} people`],
  };
}

export async function investorSpec(slug: string): Promise<CardSpec | null> {
  const inv = await investorRecord(slug);
  if (!inv) return null;
  const dates = inv.stakes.map((s) => s.date).sort();
  return {
    section: SECTION.investors,
    title: inv.name,
    subtitle: inv.summary ?? `Backed ${inv.companies.length} companies in the archive and led ${inv.leads} of their rounds.`,
    fields: [
      { label: "Companies", value: num(inv.companies.length), icon: IconBuildingSkyscraper, hue: 215 },
      { label: "Rounds led", value: num(inv.leads), icon: IconStar, hue: 42 },
      { label: "Rounds", value: num(inv.stakes.length), icon: IconCoins, hue: 145 },
      dates[0] && { label: "Active", value: `${dates[0].slice(0, 4)}–${dates.at(-1)!.slice(0, 4)}`, icon: IconCalendarEvent, hue: 220 },
    ].filter(Boolean) as CardSpec["fields"],
    rowsLabel: "Rounds",
    rowsCount: num(inv.stakes.length),
    rows: inv.stakes.slice(0, 6).map((s) => ({
      icon: s.lead ? IconStar : IconCoins,
      hue: s.lead ? 42 : 145,
      title: `${s.companyName} · ${stageLabel(s.stage)}`,
      tag: usd(s.amountUsd) || undefined,
      meta: formatDate(s.date),
    })),
    footer: [`${num(inv.leads)} rounds led`, inv.stages.slice(0, 3).join(", ")],
  };
}

export async function personSpec(slug: string): Promise<CardSpec | null> {
  const p = await personRecord(slug);
  if (!p) return null;
  return {
    section: SECTION.people,
    title: p.name,
    subtitle: p.summary,
    image: p.photo,
    imageShape: "circle",
    fields: [
      p.roles.length > 0 && { label: "Roles", value: p.roles.map((r) => r[0].toUpperCase() + r.slice(1)).join(", "), icon: IconUser, hue: 262 },
      p.companies.length > 0 && { label: "Companies", value: p.companies.slice(0, 2).map((c) => c.name).join(", "), icon: IconBuildingSkyscraper, hue: 215 },
      p.quotes.length > 0 && { label: "Quotes", value: num(p.quotes.length), icon: IconBlockquote, hue: 300 },
      { label: "Sources", value: num(p.sources.length), icon: IconFileText, hue: 200, sat: 30 },
    ].filter(Boolean) as CardSpec["fields"],
    rowsLabel: "Timeline",
    rowsCount: num(p.events.length),
    rows: highlights(p.events, 6).map((e) => kindRow(e.kind, withCompany(e.companyName, e.title), e.date)),
    footer: [`${num(p.events.length)} events`, `${num(p.companies.length)} companies`],
  };
}

export async function storySpec(slug: string): Promise<CardSpec | null> {
  const s = await story(slug);
  if (!s) return null;
  const headings = [...s.markdown.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim());
  return {
    section: SECTION.stories,
    title: s.title,
    subtitle: s.summary,
    fields: [
      { label: "Companies", value: s.companies.slice(0, 2).map(companyName).join(", ") + (s.companies.length > 2 ? ` +${s.companies.length - 2}` : ""), icon: IconBuildingSkyscraper, hue: 215 },
      { label: "Sources", value: num(Object.keys(s.sources).length), icon: IconFileText, hue: 200, sat: 30 },
      { label: "Updated", value: formatDate(s.updatedAt.slice(0, 10)), icon: IconCalendarEvent, hue: 220 },
    ],
    rowsLabel: "Contents",
    rowsCount: String(headings.length),
    rows: headings.slice(0, 6).map((h, i) => ({ icon: IconBook2, hue: 330, title: h, meta: `§ ${i + 1}` })),
    footer: ["A citation on every fact"],
  };
}

export async function homeSpec(section: keyof typeof SECTION = "home"): Promise<CardSpec> {
  const d = await dashboard();
  const titles: Record<string, [string, string]> = {
    home: ["The sourced history of startups", "Renames, logos, funding rounds, launches and quotes, rebuilt by agents from primary sources."],
    companies: ["Every company, in one table", `${num(d.stats.companies)} startups with their funding, founders, investors and sourced timelines.`],
    rounds: ["Every funding round", `${num(d.stats.rounds)} rounds, ${usd(d.stats.totalUsd)} of primary capital, each linked to its source.`],
    investors: ["The investors behind them", `${num(d.stats.investors)} investors with their portfolios and the rounds they led.`],
    people: ["The people who built them", `${num(d.stats.people)} founders, investors and early employees.`],
    categories: ["Startups by category", "From AI labs to fintech, with the most funded companies in each."],
    places: ["Where it happened", "Garages, offices and cities where startups were founded and grew."],
    stories: ["Stories across companies", "Sagas written from the archive, with a citation on every fact."],
    compare: ["Compare companies", "Up to four startups side by side: profile, funding on one time axis, valuations and key events."],
    ideas: ["Startup ideas", "A working sheet of ideas built on existing AI models and SaaS: stack, wedge, competitors, risks and scores."],
    benchmarks: ["AI benchmarks", "Every major AI benchmark and leaderboard: who runs it, what it measures, how it works and where it falls short."],
    stats: ["The archive in numbers", `${num(d.stats.events)} sourced events, ${num(d.stats.rounds)} funding rounds and ${usd(d.stats.totalUsd)} of capital tracked.`],
  };
  const [title, subtitle] = titles[section];
  return {
    section: SECTION[section],
    title,
    subtitle,
    fields: [
      { label: "Companies", value: num(d.stats.companies), icon: IconBuildingSkyscraper, hue: 215 },
      { label: "Events", value: num(d.stats.events), icon: IconTimelineEvent, hue: 230 },
      { label: "Sources", value: num(d.stats.sources), icon: IconFileText, hue: 200, sat: 30 },
      { label: "Quotes", value: num(d.stats.quotes), icon: IconBlockquote, hue: 300 },
    ],
    rowsLabel: section === "rounds" ? "Recent rounds" : "Latest events",
    rowsCount: section === "rounds" ? num(d.stats.rounds) : num(d.stats.events),
    rows:
      section === "rounds"
        ? d.recent.slice(0, 6).map((r) => ({ icon: IconCoins, hue: 145, title: `${r.companyName} · ${stageLabel(r.stage)}`, tag: usd(r.amountUsd), meta: formatDate(r.date) }))
        : d.events.slice(0, 6).map((e) => kindRow(e.kind, withCompany(e.companyName, e.title), e.date)),
    footer: ["Every claim links to its source", `${usd(d.stats.totalUsd)} of rounds tracked`],
  };
}

export type Section = keyof typeof SECTION;
