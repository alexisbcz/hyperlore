import type { Metadata } from "next";
import { IconApi, IconFileText, IconTerminal } from "../icons";
import { indexMetadata } from "../og/meta";
import { PageHead } from "../ui";
import { Tag } from "../tw";
import { SITE_URL } from "@/lib/og";
import "./developers.css";

export const metadata: Metadata = indexMetadata({
  title: "API",
  description: "Hyperlore's open JSON API and llms.txt files: sourced startup histories for apps and agents.",
  path: "/developers",
});

const ENDPOINTS = [
  {
    method: "GET",
    path: "/api/v1/companies.json",
    body:
      "Every company with founding date, HQ, status, categories, founders, investors, total raised, last round, valuation and counts, " +
      "sorted by name. The site is static, so filter on your side (the fields are the ones the /companies page filters on).",
  },
  {
    method: "GET",
    path: "/api/v1/companies/{slug}.json",
    body: "The full record: overview, timeline with sources, funding rounds, quotes, logos through the years, references.",
  },
  {
    method: "GET",
    path: "/api/v1/rounds.json · /api/v1/rounds.csv",
    body:
      "Every funding round across companies, newest first, with stage, amount (USD, or the stated currency, never converted), " +
      "valuation, lead and other investors and sources. The CSV is the same list as a spreadsheet.",
  },
  { method: "GET", path: "/search-index.json", body: "The index the ⌘K search runs on: companies, people, investors, places, stories, events and quotes." },
  { method: "GET", path: "/{slug}/llms.txt", body: "The same record as plain text for language models, with numbered citations." },
  {
    method: "GET",
    path: "/{slug}/lore.pdf · lore.md · lore.txt",
    body:
      "Downloadable editions of a company's lore: a typeset PDF, Markdown with YAML front matter, and plain text wrapped at 80 columns. " +
      "Each carries the archive version and numbered links to every source.",
  },
  {
    method: "GIT",
    path: "github.com/alexisbcz/hyperlore-archive",
    body: "The whole archive as files: archive.json (every event, quote, source and entity), logos, photos and timestamped interview transcripts.",
  },
];

const EXAMPLES = [
  {
    name: "example.sh",
    label: "Example API calls",
    icon: IconTerminal,
    code: `curl ${SITE_URL}/api/v1/companies/vercel.json | jq '.funding[] | {date, round, amountUsd, leads}'

curl ${SITE_URL}/api/v1/companies.json | jq '.companies[] | select(any(.investors[]; .slug == "accel")) | .name'`,
  },
  {
    name: "response.json",
    label: "Example response",
    icon: IconFileText,
    code: `{ "date": "2020-04-21", "round": "Series A", "amountUsd": 21000000, "leads": ["Accel", "CRV"] }
{ "date": "2020-12-16", "round": "Series B", "amountUsd": 40000000, "leads": ["GV"] }`,
  },
];

export default function DevelopersPage() {
  return (
    <>
      <PageHead section="api" icon={IconApi} title="API" />
      <section className="tw-panel">
        <div className="tw-scroll">
          <div className="twd-wrap">
            <p className="twd-lede">
              The archive is open. No key needed. Every fact carries the URL of the primary source it came from, so you can verify it or cite it
              yourself.
            </p>
            <ul className="twd-endpoints">
              {ENDPOINTS.map((e) => (
                <li key={e.path} className="twd-endpoint">
                  <span>
                    <Tag color="green" variant="soft" weight="medium" truncate={false}>
                      {e.method}
                    </Tag>
                  </span>
                  <code className="twd-path">{e.path}</code>
                  <p>{e.body}</p>
                </li>
              ))}
            </ul>
            <h2 className="twd-h2">Example</h2>
            {EXAMPLES.map((x) => (
              <figure key={x.name} className="twd-code" role="region" aria-label={x.label}>
                <figcaption className="twd-code-head">
                  <x.icon size={14} aria-hidden />
                  {x.name}
                </figcaption>
                <pre>
                  <code>{x.code}</code>
                </pre>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
