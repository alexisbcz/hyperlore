// Downloadable editions of a company's lore (Markdown, plain text, PDF). One document model feeds all
// three, so every format carries the same facts, the same numbered references and the same version.
import { formatUsd } from "@/components/lore";
import { formatDate, SOURCE_LABELS } from "./format";
import { categoryLabel, countryName, statusLabel } from "./directory";
import { type CompanyLore, getCompany } from "./lore";
import { SITE_URL } from "./og";
import { archive } from "./store";

export type Ref = { n: number; url: string; title?: string; host: string; type: string };

/** Overview markdown reduced to blocks, with citations replaced by reference numbers. */
export type Block = { kind: "h2" | "p" | "li"; text: string };

export type LoreExport = {
  slug: string;
  name: string;
  summary?: string;
  url: string;
  /** When the archive snapshot was exported: the edition every format is stamped with. */
  version: string;
  generatedAt: string;
  counts: { events: number; sources: number; quotes: number };
  facts: [string, string][];
  overview: Block[];
  funding: { date: string; round: string; amount?: string; valuation?: string; leads: string; refs: number[] }[];
  people: { name: string; role?: string }[];
  timeline: { date: string; kind: string; title: string; summary?: string; inferred: boolean; refs: number[] }[];
  quotes: { person: string; date?: string; text: string; ref: number }[];
  refs: Ref[];
};

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export async function buildExport(slug: string): Promise<LoreExport | null> {
  const lore = await getCompany(slug);
  if (!lore) return null;
  const a = (await archive()) as Awaited<ReturnType<typeof archive>> & { exported_at?: string };
  const now = new Date().toISOString();

  // One numbering for the whole document: overview citations first (as on the page), then everything else.
  const refs: Ref[] = [];
  const ref = (url: string) => {
    let r = refs.find((x) => x.url === url);
    if (!r) {
      const s = lore.sources[url];
      r = { n: refs.length + 1, url, title: s?.title, host: s?.host ?? host(url), type: s?.type ?? "website" };
      refs.push(r);
    }
    return r.n;
  };

  const overview: Block[] = [];
  for (const raw of (lore.overview?.markdown ?? "").split(/\n{2,}/)) {
    const text = raw.replace(/\{\{cite:([^}\s]+)\}\}/g, (_, url: string) => `[${ref(url)}]`).trim();
    if (!text) continue;
    if (text.startsWith("## ")) overview.push({ kind: "h2", text: text.slice(3).trim() });
    else if (/^\s*[-*] /m.test(text))
      for (const line of text.split("\n")) {
        if (line.trim()) overview.push({ kind: "li", text: line.replace(/^\s*[-*] /, "").trim() });
      }
    else overview.push({ kind: "p", text: text.replace(/\n/g, " ") });
  }

  return {
    slug: lore.slug,
    name: lore.name,
    summary: lore.summary,
    url: `${SITE_URL}/${lore.slug}`,
    version: a.exported_at ?? now,
    generatedAt: now,
    counts: { events: lore.events.length, sources: Object.keys(lore.sources).length, quotes: lore.quotes.length },
    facts: facts(lore),
    overview,
    funding: lore.funding.map((r) => ({
      date: formatDate(r.date),
      round: r.round,
      amount: r.amountUsd ? formatUsd(r.amountUsd) : r.amount && r.currency ? `${r.amount.toLocaleString("en")} ${r.currency}` : undefined,
      valuation: r.valuationUsd ? formatUsd(r.valuationUsd) : undefined,
      leads: r.leads.join(", "),
      refs: r.sources.map((s) => ref(s.url)),
    })),
    people: lore.keyPeople.map((p) => ({ name: p.name, role: p.role })),
    timeline: lore.events.map((e) => ({
      date: formatDate(e.date),
      kind: e.kind,
      title: e.title,
      summary: e.summary,
      inferred: e.confidence === "inferred",
      refs: e.sources.map((s) => ref(s.url)),
    })),
    quotes: lore.quotes.map((q) => ({ person: q.person, date: q.date ? formatDate(q.date) : undefined, text: q.text, ref: ref(q.link) })),
    refs,
  };
}

function facts(lore: CompanyLore): [string, string][] {
  const out: [string, string | undefined][] = [
    ["Legal name", lore.legalName],
    ["Founded", lore.founded && formatDate(lore.founded)],
    ["Founders", lore.founders.map((f) => f.name).join(", ") || undefined],
    ["Headquarters", lore.city && lore.country ? `${lore.city}, ${countryName(lore.country)}` : lore.hq],
    [
      "Status",
      lore.status === "acquired" && lore.acquiredBy
        ? `Acquired by ${lore.acquiredBy}${lore.acquiredOn ? ` (${formatDate(lore.acquiredOn)})` : ""}`
        : lore.status === "public" && lore.stocks.length
          ? `Public (${lore.stocks.join(", ")})`
          : statusLabel(lore.status),
    ],
    ["Categories", lore.categories.map(categoryLabel).join(", ") || undefined],
    ["Formerly", lore.formerNames.join(", ") || undefined],
    ["Employees", lore.employees && `${lore.employees.count.toLocaleString("en")}${lore.employees.asOf ? ` (as of ${formatDate(lore.employees.asOf)})` : ""}`],
    ["Raised", lore.raisedUsd ? `${formatUsd(lore.raisedUsd)} over ${lore.funding.length} rounds` : undefined],
    ["Last round", lore.lastRound && `${lore.lastRound.round}, ${formatDate(lore.lastRound.date)}`],
    ["Investors", lore.investors.length ? String(lore.investors.length) : undefined],
    ["Website", lore.website],
  ];
  return out.filter((f): f is [string, string] => !!f[1]);
}

const day = (iso: string) => iso.slice(0, 10);
export const exportFilename = (d: LoreExport, ext: string) => `${d.slug}-lore-${day(d.version)}.${ext}`;
const cites = (ns: number[]) => ns.map((n) => `[${n}]`).join("");

/** Markdown with YAML front matter: drops into Obsidian, Notion, static sites and LLM context as is. */
export function toMarkdown(d: LoreExport) {
  const lines = [
    "---",
    `title: ${JSON.stringify(`The lore of ${d.name}`)}`,
    `company: ${d.slug}`,
    `url: ${d.url}`,
    `version: ${d.version}`,
    `generated: ${d.generatedAt}`,
    `events: ${d.counts.events}`,
    `sources: ${d.counts.sources}`,
    `quotes: ${d.counts.quotes}`,
    `publisher: Hyperlore`,
    "---",
    "",
    `# ${d.name}`,
    "",
    ...(d.summary ? [`> ${d.summary}`, ""] : []),
    `Every claim links to the primary source it came from: numbers in brackets refer to the sources at the end. Archive version ${day(d.version)}; the latest edition lives at ${d.url}.`,
    "",
    "## Key facts",
    "",
    "| | |",
    "|---|---|",
    ...d.facts.map(([k, v]) => `| ${k} | ${v.replace(/\|/g, "\\|")} |`),
    "",
  ];
  if (d.overview.length) {
    lines.push("## Overview", "");
    for (const b of d.overview) lines.push(b.kind === "h2" ? `### ${b.text}` : b.kind === "li" ? `- ${b.text}` : b.text, ...(b.kind === "li" ? [] : [""]));
    lines.push("");
  }
  if (d.funding.length) {
    lines.push("## Funding", "", "| Date | Round | Amount | Valuation | Led by | Sources |", "|---|---|---|---|---|---|");
    for (const r of d.funding) lines.push(`| ${r.date} | ${r.round} | ${r.amount ?? "—"} | ${r.valuation ?? "—"} | ${r.leads || "—"} | ${cites(r.refs)} |`);
    lines.push("");
  }
  if (d.people.length) {
    lines.push("## People", "", ...d.people.map((p) => `- **${p.name}**${p.role ? `, ${p.role}` : ""}`), "");
  }
  lines.push("## Timeline", "");
  for (const e of d.timeline)
    lines.push(`- **${e.date}** · ${e.kind}${e.inferred ? " (inferred)" : ""} · ${e.title}${e.summary ? `. ${e.summary}` : ""} ${cites(e.refs)}`);
  lines.push("");
  if (d.quotes.length) {
    lines.push("## In their own words", "");
    for (const q of d.quotes) lines.push(`> ${q.text}`, ">", `> — ${q.person}${q.date ? `, ${q.date}` : ""} [${q.ref}]`, "");
  }
  lines.push("## Sources", "");
  for (const r of d.refs) lines.push(`${r.n}. ${r.title ? `${r.title} — ` : ""}[${r.host}](${r.url}) (${SOURCE_LABELS[r.type] ?? r.type})`);
  lines.push("", `---`, "", `Exported from Hyperlore on ${day(d.generatedAt)}. ${d.url}`, "");
  return lines.join("\n");
}

/** Plain text, wrapped at 80 columns: for email, terminals and anything that doesn't read Markdown. */
export function toText(d: LoreExport) {
  const wrap = (s: string, indent = "") => {
    const out: string[] = [];
    let line = indent;
    for (const w of s.split(/\s+/)) {
      if (line.length + w.length + 1 > 80 && line.trim()) {
        out.push(line.trimEnd());
        line = indent;
      }
      line += (line.trim() ? " " : "") + w;
    }
    if (line.trim()) out.push(line.trimEnd());
    return out.join("\n");
  };
  const head = (s: string) => `\n${s.toUpperCase()}\n${"=".repeat(s.length)}\n`;
  const strip = (s: string) => s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1 <$2>");
  const parts = [
    `THE LORE OF ${d.name.toUpperCase()}`,
    wrap(d.summary ?? ""),
    "",
    `Version ${day(d.version)} · ${d.counts.events} events · ${d.counts.sources} sources · ${d.url}`,
    "Numbers in brackets refer to the sources at the end.",
    head("Key facts"),
    ...d.facts.map(([k, v]) => `${`${k}:`.padEnd(14)}${v}`),
  ];
  if (d.overview.length) {
    parts.push(head("Overview"));
    for (const b of d.overview) parts.push(b.kind === "h2" ? `\n${b.text}\n${"-".repeat(b.text.length)}` : b.kind === "li" ? wrap(`- ${strip(b.text)}`, "  ").replace(/^ {2}/, "") : `${wrap(strip(b.text))}\n`);
  }
  if (d.funding.length) {
    parts.push(head("Funding"));
    for (const r of d.funding)
      parts.push(wrap(`${r.date}  ${r.round}${r.amount ? `, ${r.amount}` : ""}${r.valuation ? ` at ${r.valuation}` : ""}${r.leads ? `, led by ${r.leads}` : ""} ${cites(r.refs)}`));
  }
  if (d.people.length) parts.push(head("People"), ...d.people.map((p) => `- ${p.name}${p.role ? `, ${p.role}` : ""}`));
  parts.push(head("Timeline"));
  for (const e of d.timeline) parts.push(wrap(`${e.date} · ${e.kind}${e.inferred ? " (inferred)" : ""} · ${e.title}${e.summary ? `. ${e.summary}` : ""} ${cites(e.refs)}`), "");
  if (d.quotes.length) {
    parts.push(head("In their own words"));
    for (const q of d.quotes) parts.push(wrap(`"${q.text}"`), `  — ${q.person}${q.date ? `, ${q.date}` : ""} [${q.ref}]`, "");
  }
  parts.push(head("Sources"), ...d.refs.map((r) => wrap(`[${r.n}] ${r.title ? `${r.title}. ` : ""}${r.url}`)), "", `Exported from Hyperlore on ${day(d.generatedAt)}.`, "");
  return parts.join("\n");
}
