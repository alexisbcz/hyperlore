---
name: linkup
description: Deep web research with Linkup (agentic search, page fetch, multi-step research agent, peers finder) through ./hl. Use to find coverage the other tools miss, to discover companies (lists, peers, competitors), or to check whether a company is still active.
---

# Linkup

`./hl linkup <op> '<json>'` (key `LINKUP_API_KEY` in `.env`). Responses are cached in `data/raw/linkup/<op>/`, so re-running the same call is free; spend is logged in `api_calls` (`provider: linkup`, `usd`). Linkup charges nothing for errors. Balance: `./hl linkup balance` (USD). Always `export HL_AGENT=<name>`.

| Op | Cost | Use for |
|---|---|---|
| `search` `{"q", "depth", "outputType"}` | $0.005 (`standard`), $0.05 (`deep`), +$0.001–0.005 for an LLM answer | finding pages, quick facts, lists |
| `fetch` `{"url", "renderJs", "mode"}` | $0.001; $0.005 with `renderJs` or `mode: pro` | one known URL as Markdown, incl. PDFs and JS sites |
| `research` `{"q", "mode", "reasoningDepth", "outputType"}` | $0.25 (S), $0.50 (M), $1.50 (L), $2.50 (XL) | multi-source questions; async, 3–20 min, polled by `hl` |
| `peers <slug\|domain> [...]` | ~$0.006 per input + $0.055 | comparable companies, marked `[in archive]` / `[new]` |

Defaults set by `hl`: search `depth: standard`, `outputType: searchResults`; research `reasoningDepth: S`, `outputType: sourcedAnswer`. `query` is accepted as an alias of `q`.

## Picking the call

- **URL known → `fetch`**, never `search`. It's the cheapest way to read a page that blocks curl. `renderJs: true` for SPAs. Still: never fetch LinkedIn pages (use `./hl sc v1/linkedin/...`).
- **Keyword lookup → `search` `standard`** (`"Quartr Series B 2024"`). Several angles → several `standard` calls in parallel (at most ~4 at once; more returns 429, which `hl` retries with backoff).
- **"Find X, then read it, then extract Y" → `search` `deep`**, phrased as instructions: `"Find Maddyness's 2026 proptech funding roundups. Scrape them. Extract every startup, amount and date."`
- **A question one search can't settle → `research`**, with `mode` set explicitly (`answer` = one verified fact, `investigate` = one subject, `research` = a report across many entities). Start at `S` or `M`; `L`/`XL` only when completeness matters. Interrupted runs: `./hl linkup research '{"id":"<task id>"}'`.
- Dates go in `fromDate`/`toDate` (`YYYY-MM-DD`), not in the question. Trusted sites in `includeDomains` (e.g. `["maddyness.com","frenchweb.fr","lesechos.fr"]`) improve quality and speed.
- `outputType: structured` + `structuredOutputSchema` (a JSON Schema **string**, root `object`, keep it flat) when a script will read the result; add `"includeSources": true`.

## Peers finder

`./hl peers quartr`, `./hl peers matera.eu hosman.co zefir.fr --where France --n 30`, `--traits 'proptech;coliving'` to override. It profiles each input (traits), keeps shared traits (topped up with each input's strongest), runs one deep structured search, and saves everything to `data/raw/linkup/peers/<inputs>.json`. Matches against the archive by domain first; a name match on a different domain prints `[maybe in archive: <slug>]` (namesake or moved domain: `compose.immo` is not Compose, ex-MongoHQ). Use it to find companies to cover next, or rivals for a story page.

## Rules for the archive

- **Linkup output is a lead, never a source.** Its answers and structured fields are LLM-written and can be wrong (it called a 2024 funding "latest" and invented "not specified" HQs). Register and cite the *underlying page* (`sources[].url` in the response), after reading it yourself (`fetch` is cheap) and copying the verbatim quote from it.
- Check URLs it returns before relying on them (`curl -sIL`); 403/999 is a bot block, 404 is a fabrication.
- Status claims ("still active", "acquired", "liquidated") need a dated page saying so.
