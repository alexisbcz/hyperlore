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
    path: "/api/v1/companies",
    body:
      "Every company with founding date, HQ, status, categories, founders, investors, total raised, last round, valuation and counts. " +
      "Takes the same filters as the /companies page, so a shared view's query string works here too: q, category, country, city, " +
      "status, stage (last round), investor, lead=1, founder, kind, has (comma-separated), founded_min/max, raised_min/max and " +
      "valuation_min/max (in $M), sort, dir, limit, offset.",
  },
  {
    method: "GET",
    path: "/api/v1/companies/{slug}",
    body: "The full record: overview, timeline with sources, funding rounds, quotes, logos through the years, references.",
  },
  {
    method: "GET",
    path: "/api/v1/rounds",
    body:
      "Every funding round across companies, newest first, with stage, amount (USD, or the stated currency, never converted), " +
      "valuation, lead and other investors and sources. Same filters as the /rounds page: q, stage, category, country, company, " +
      "investor, led (comma-separated, investors by slug), year_min/max, amount_min/max (in $M), sort (date, amount, valuation, " +
      "company, stage), dir, limit, offset. Add format=csv for a spreadsheet.",
  },
  { method: "GET", path: "/api/v1/search?q={query}", body: "Companies, people, investors, events and quotes matching a query." },
  { method: "GET", path: "/{slug}/llms.txt", body: "The same record as plain text for language models, with numbered citations." },
  {
    method: "GET",
    path: "/{slug}/lore.pdf · lore.md · lore.txt",
    body:
      "Downloadable editions of a company's lore: a typeset PDF, Markdown with YAML front matter, and plain text wrapped at 80 columns. " +
      "Each carries the archive version (also in the X-Hyperlore-Version header) and numbered links to every source.",
  },
];

const EXAMPLES = [
  {
    name: "example.sh",
    label: "Example API calls",
    icon: IconTerminal,
    code: `curl ${SITE_URL}/api/v1/companies/vercel | jq '.funding[] | {date, round, amountUsd, leads}'

curl '${SITE_URL}/api/v1/companies?investor=accel&founded_min=2015&sort=raised' | jq '.companies[].name'`,
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
