import type { Metadata } from "next";
import { CodeBlock } from "@/components/code/code-block";
import { Page } from "@/components/page";
import { SITE_URL } from "@/lib/og";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "API",
  description:
    "Hyperlore's open JSON API and llms.txt files: sourced startup histories for apps and agents.",
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

export default function DevelopersPage() {
  return (
    <Page width="text">
      <h1 className="text-balance text-3xl font-semibold text-fg">API</h1>
      <p className="mt-2 text-pretty text-fg-muted">
        The archive is open. No key needed. Every fact carries the URL of the primary source it came from, so you can verify it or
        cite it yourself.
      </p>
      <ul className="mt-8 divide-y divide-border rounded-lg border border-border">
        {ENDPOINTS.map((e) => (
          <li key={e.path} className="space-y-1.5 px-4 py-4">
            <code className="flex flex-wrap items-center gap-2 font-mono text-sm text-fg">
              <span className="rounded bg-bg-hover px-1.5 py-0.5 text-xs font-medium text-fg-muted">{e.method}</span>
              {e.path}
            </code>
            <p className="text-pretty text-sm text-fg-muted">{e.body}</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-12 text-lg font-semibold text-fg">Example</h2>
      <div className="mt-3 space-y-3">
        <CodeBlock
          name="example.sh"
          label="Example API calls"
          code={`curl ${SITE_URL}/api/v1/companies/vercel | jq '.funding[] | {date, round, amountUsd, leads}'

curl '${SITE_URL}/api/v1/companies?investor=accel&founded_min=2015&sort=raised' | jq '.companies[].name'`}
        />
        <CodeBlock
          name="response.json"
          label="Example response"
          code={`{ "date": "2020-04-21", "round": "Series A", "amountUsd": 21000000, "leads": ["Accel", "CRV"] }
{ "date": "2020-12-16", "round": "Series B", "amountUsd": 40000000, "leads": ["GV"] }`}
        />
      </div>
    </Page>
  );
}
