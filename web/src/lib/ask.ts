// "Ask the archive" without a paid model: plain keyword + intent retrieval over the archive. The server
// returns the matching events, rounds and quotes (rendered as cards) and numbered notes; a small model
// running in the visitor's browser may then write a cited summary from those notes alone.
import { findEvents, findFunding, findQuotes, listCompanies } from "./lore";
import type { FundingRound, LoreEvent, Quote } from "./types";

export type AskNote = { n: number; text: string; url: string; host: string };
export type AskResult = {
  company?: string;
  companyName?: string;
  events: LoreEvent[];
  rounds: FundingRound[];
  quotes: Quote[];
  notes: AskNote[];
};

// Question intent → event kinds worth surfacing even without a keyword match.
const INTENTS: { re: RegExp; kinds: string[]; funding?: boolean; quotes?: boolean }[] = [
  { re: /\b(rais|round|fund|invest|valuat|series|seed|backer|vc\b|led\b|money)/i, kinds: ["funding"], funding: true },
  { re: /\b(name|renam|logo|rebrand|domain|called|brand)/i, kinds: ["rename", "rebrand", "logo", "domain"] },
  { re: /\b(start|found|origin|begin|began|early|first|idea|how did)/i, kinds: ["founding", "pivot", "launch"] },
  { re: /\b(who|founder|ceo|cto|hire|hired|left|leave|join|team|people|executive)/i, kinds: ["founding", "hire", "departure"] },
  { re: /\b(hard|crisis|controvers|layoff|fail|lawsuit|sued|outage|difficult|worst|struggl)/i, kinds: ["controversy", "layoff", "outage", "pivot"] },
  { re: /\b(launch|product|ship|release|feature|open.?source)/i, kinds: ["launch", "product", "open-source"] },
  { re: /\b(acqui|bought|buy|sold|sell|exit|ipo|public)/i, kinds: ["acquisition", "acquired", "milestone"] },
  { re: /\b(said|say|quote|words|talk|think|believ)/i, kinds: [], quotes: true },
];

const STOP = new Set(
  "a an and are as at be been but by can could did do does every for from had has have how i in into is it its me my of on or our tell that the their them then there these they this to was we were what when where which who why will with would you your about after all any company story".split(
    " ",
  ),
);

const words = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((w) => w.length > 1 && !STOP.has(w));

/** Share of the question's terms found in a text (prefix match, so "renamed" finds "rename"). */
function overlap(terms: string[], text: string) {
  if (!terms.length) return 0;
  const hay = text.toLowerCase();
  return terms.filter((t) => hay.includes(t.length > 5 ? t.slice(0, -2) : t)).length / terms.length;
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

export async function retrieve(question: string, company?: string): Promise<AskResult> {
  const companies = await listCompanies();
  const lower = ` ${question.toLowerCase()} `;
  // On the home page the question names the company ("How did Stripe start?").
  const slug =
    company && companies.some((c) => c.slug === company)
      ? company
      : companies.find((c) => lower.includes(` ${c.name.toLowerCase()}`) || lower.includes(` ${c.slug} `))?.slug;
  const companyName = companies.find((c) => c.slug === slug)?.name;

  const name = companyName?.toLowerCase();
  const terms = words(question).filter((w) => w !== name && w !== slug && !name?.split(/\s+/).includes(w));
  const intents = INTENTS.filter((i) => i.re.test(question));
  const kinds = new Set(intents.flatMap((i) => i.kinds));

  const pool = await findEvents({ company: slug });
  const scored = pool
    .map((e) => {
      const text = `${e.title} ${e.summary ?? ""}`;
      const score = overlap(terms, text) * 2 + (kinds.has(e.kind) ? 1 : 0) + (overlap(terms, e.title) > 0 ? 0.5 : 0);
      return { e, score };
    })
    .filter((x) => x.score > 0.4);
  // Broad questions ("How did X start?") with no strong keyword match: the earliest events tell the origin.
  const picked = scored.length ? scored.sort((a, b) => b.score - a.score).slice(0, 10).map((x) => x.e) : slug ? pool.slice(0, 6) : [];
  const events = picked.sort((a, b) => a.date.localeCompare(b.date));

  const rounds = slug && intents.some((i) => i.funding) ? await findFunding(slug) : [];

  const allQuotes = await findQuotes({ company: slug });
  const wantQuotes = intents.some((i) => i.quotes);
  const quotes = allQuotes
    .map((q) => ({ q, score: overlap(terms, `${q.text} ${q.context ?? ""} ${q.person}`) + (wantQuotes ? 0.3 : 0) }))
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((x) => x.q);

  // Numbered notes for the on-device model: one line per fact, each with the URL it will cite.
  const notes: AskNote[] = [];
  for (const e of events) {
    const url = e.sources[0]?.url;
    if (!url) continue;
    notes.push({ n: notes.length + 1, text: `${e.date}: ${e.title}.${e.summary ? ` ${e.summary}` : ""}`, url, host: hostOf(url) });
  }
  for (const r of rounds) {
    const url = r.sources[0]?.url;
    if (!url || events.some((e) => e.kind === "funding" && e.date === r.date)) continue;
    const amount = r.amountUsd ? ` $${(r.amountUsd / 1e6).toLocaleString("en", { maximumFractionDigits: 1 })}M` : "";
    notes.push({ n: notes.length + 1, text: `${r.date}: ${r.round}${amount}${r.leads.length ? `, led by ${r.leads.join(", ")}` : ""}.`, url, host: hostOf(url) });
  }
  for (const q of quotes) notes.push({ n: notes.length + 1, text: `${q.person}${q.date ? ` (${q.date})` : ""} said: "${q.text}"`, url: q.link, host: hostOf(q.link) });

  // Short notes keep the prompt small: on a CPU every prompt token costs time before the first word.
  for (const n of notes) if (n.text.length > 280) n.text = `${n.text.slice(0, 277).replace(/\s+\S*$/, "")}…`;
  return { company: slug, companyName, events, rounds, quotes, notes };
}
