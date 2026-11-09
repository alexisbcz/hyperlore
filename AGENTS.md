# Hyperlore — agent brief

Hyperlore builds the *lore* of startups: a sourced history of each company — founding,
founders, renames, logo changes, funding rounds, product launches, events, pivots, quotes.
**Every fact must link to the exact place it was found** (tweet URL, video URL + timestamp,
article URL, Wayback snapshot URL). No source, no fact.

## Tooling

All reads and writes go through `./hl` (run from `~/Work/hyperlore`). Writes take JSON on
stdin, one object or an array. It refuses events/quotes whose sources weren't added first.

```bash
# 1. register the source (once per URL)
echo '{"url":"https://x.com/rauchg/status/123","type":"tweet","title":"…","author":"rauchg",
       "published_at":"2020-04-21","publisher":"X","excerpt":"full tweet text",
       "raw_path":"data/raw/..."}' | ./hl source

# 2. record the fact, citing it (quote = the exact words supporting the claim)
echo '{"company":"vercel","date":"2020-04-21","kind":"rename","title":"ZEIT renames to Vercel",
       "summary":"…","details":{"from":"ZEIT","to":"Vercel"},
       "sources":[{"url":"https://x.com/rauchg/status/123","quote":"…"}],
       "confidence":"sourced"}' | ./hl event

# a memorable quote (from a founder, investor, employee…)
echo '{"company":"vercel","person":"Guillermo Rauch","text":"…","date":"2019-03",
       "url":"https://www.youtube.com/watch?v=…","timestamp_s":754,"context":"…"}' | ./hl quote

# logos, screenshots, old homepages
echo '{"company":"vercel","kind":"logo","date":"2016-11","url":"https://web.archive.org/…",
       "local_path":"data/assets/vercel/zeit-logo-2016.svg","source_url":"https://web.archive.org/…",
       "description":"ZEIT black triangle wordmark"}' | ./hl asset

# people, products, investors, former names
echo '{"slug":"guillermo-rauch","kind":"person","name":"Guillermo Rauch","aliases":["rauchg"],
       "links":{"x":"https://x.com/rauchg"},"summary":"…","sources":[{"url":"…"}]}' | ./hl entity

./hl sc v1/twitter/tweet url=https://x.com/rauchg/status/123   # ScrapeCreators, cached
./hl list events vercel        # see what is already there before adding
./hl stats
./hl delete events <_id> "why it was wrong"   # kept in the `deletions` collection
```

- `date`: `YYYY`, `YYYY-MM` or `YYYY-MM-DD` — only as precise as the source supports.
- `kind` (events): founding, funding, rename, logo, rebrand, product, launch, acquisition,
  acquired, hire, departure, event, conference, milestone, pivot, domain, office,
  controversy, partnership, open-source, pricing, outage, layoff, other.
- `confidence`: `sourced` (a source states it) or `inferred` (you deduced it — say how in `summary`).
- Funding events: put `amount_usd`, `round`, `lead_investors`, `investors`, `valuation_usd` in `details`.
- `company` is a lowercase slug: `vercel`, `resend`, `supabase`, `linear`.
- Same event already there (same company + kind + date + title)? Re-adding merges your
  sources into it. Prefer corroborating an existing event over creating a near-duplicate:
  check `./hl list events <company>` first and reuse the exact title and date.
- Entity writes merge with what is stored: `aliases`, `sources`, `roles` are unioned and
  `links`, `profile`, `field_sources` are shallow-merged, so send only what you add. A
  `summary` is appended to the stored one (other agents write shared investors and places
  too), so send only your new sentence. To drop or rewrite a field, send the full value with
  `"replace": true`.

## Running alongside other agents

Many agents often run at once. Keep scripts and temp files in a private subfolder of your
scratchpad (`<scratchpad>/<HL_AGENT>/`) — shared names like `fetch.sh` get overwritten. Hit the
Wayback Machine one request at a time and back off when it refuses connections.

## Sources and how to get them

- **ScrapeCreators** (`./hl sc …`, key already in `.env`, responses cached in
  `data/raw/scrapecreators/`). **Credits cost money: respect your budget.** Set
  `export HL_AGENT=<your-name>` so spend is tracked per agent.
  - `v1/twitter/user-tweets handle=…` — returns only ~100 *most popular* tweets, not chronological.
  - `v1/twitter/tweet url=…` — one tweet with full text, date, engagement.
  - `v1/google/search query=…` — Google results. Use it to find old tweets:
    `query=site:x.com rauchg "zeit" vercel`, or `site:twitter.com`.
  - `v1/youtube/search query=…`, `v1/youtube/video/transcript url=…`, `v1/linkedin/company url=…`.
  - Docs: https://docs.scrapecreators.com/llms.txt
- **Context.dev** (`./hl ctx [GET|POST] <path> '<json>'`, key in `.env`, cached in
  `data/raw/contextdev-api/`, spend logged). Large balance, but don't waste it. Paths are in
  https://www.context.dev/openapi.json, docs index at https://docs.context.dev/llms.txt.
  - `POST brand/retrieve {"type":"by_domain","domain":"railway.com","timeoutOpts":{"milliseconds":60000,"behavior":"return-partial"}}`
    — current logos (icon/logo, light/dark variants, sizes), colors, description, socials. 10 credits.
  - `POST news/search` — news articles about a company (funding, launches). ~1 credit / 10 results.
  - `POST web/search` — web search, optionally with page Markdown. `POST web/scrape` — read a page
    as Markdown (works on pages that block curl, and on YouTube pages: metadata + transcript —
    use it when yt-dlp gets HTTP 429). **Never `web/scrape` a LinkedIn page** — one cost ~170
    credits; use `./hl sc v1/linkedin/company` / `v1/linkedin/profile` instead.
  - `POST company/search`, `POST people/search` — company and founder lookups.
- **Linkup** (`./hl linkup search|fetch|research|balance '<json>'`, key in `.env`, cached in
  `data/raw/linkup/`, spend logged in USD). Agentic web search ($0.005 standard, $0.05 deep), page fetch
  ($0.001, works on JS sites and PDFs), and an async research agent ($0.25–2.50, 3–20 min).
  `./hl peers <slug|domain> [...] [--where France]` finds comparable companies and flags which are
  already in the archive. Its answers are leads: cite the pages it found, never Linkup itself.
  See the `linkup` skill.
- **YouTube transcripts**: free first: `yt-dlp --skip-download --write-subs --write-auto-subs
  --sub-langs en --sub-format vtt -o 'data/transcripts/%(id)s' URL` (works again since the
  user's VPN was turned off; if YouTube's "confirm you're not a bot" comes back, retry with
  `--cookies data/cookies.txt` when that file exists — browser cookie decryption doesn't work
  on this machine). If no captions, the ScrapeCreators transcript endpoint. Last resort, whisper (CPU only, slow — keep to short clips;
  only one whisper job at a time machine-wide):
  `flock data/.whisper.lock whisper-cli -m ~/.cache/whisper/ggml-large-v3-turbo.bin -l en -t 12 -otxt -osrt -f in.wav`.
  Keep timestamps so quotes can link `…&t=754s`. Store transcripts in `data/transcripts/`.
- **Web**: WebSearch / WebFetch, or curl. Company blog and changelog, TechCrunch, Forbes,
  The Information headlines, Wikipedia (and its references), Crunchbase news, press releases,
  podcasts (show notes), Hacker News (`https://hn.algolia.com/api/v1/search?query=…&tags=story`),
  GitHub (first commits, repo creation dates, org renames via `api.github.com`).
- **Hacker News** (free, no key) is a first-class source, not just for launch dates:
  - stories: `https://hn.algolia.com/api/v1/search?query=<name>&tags=story` (and `search_by_date`;
    `tags=show_hn`, `tags=launch_hn`; `numericFilters=points>50`)
  - founders' own comments: `…/search?tags=comment,author_<hnusername>&query=<topic>` — founders
    often tell origin stories, numbers and backstage details in HN comments.
  - a thread with all comments: `https://hn.algolia.com/api/v1/items/<id>`
  - cite as `https://news.ycombinator.com/item?id=<id>` with type `hn`.
- **Bluesky** (free public AppView, no key) — essential for AT-Protocol-native startups:
  - `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=<handle>`
  - `…/app.bsky.feed.getAuthorFeed?actor=<handle>&limit=100&cursor=…` (paginate for full history)
  - `…/app.bsky.feed.getPostThread?uri=at://…`; `…/app.bsky.actor.searchActors?q=…`
  - `searchPosts` needs auth (403) — page through author feeds instead. Handles change
    (e.g. tangled.sh → tangled.org): resolve the DID and note the handle history.
  - cite as `https://bsky.app/profile/<handle>/post/<rkey>` with type `bluesky`.
- **Wayback Machine** for renames, logos, taglines, pricing pages over time:
  `https://web.archive.org/cdx/search/cdx?url=zeit.co&output=json&fl=timestamp,original,statuscode&collapse=timestamp:6&filter=statuscode:200`
  then fetch `https://web.archive.org/web/<timestamp>/<url>`. Download logos to
  `data/assets/<company>/` and cite the snapshot URL.
- Save raw fetched material you rely on under `data/raw/<company>/` and set `raw_path`.

## Quality bar

- A sniper analyst, not a scraper: favour first-hand sources (founder tweets, the company's
  own blog, the founder speaking on video) and use press for corroboration and numbers.
- Never invent a date, amount or quote. If two sources disagree, record both sources on the
  event and explain the conflict in `summary`.
- Quotes are verbatim. Fix only obvious transcription errors.
- Look for the *story*: origins, why names were chosen, failed products, pivots, rivalries,
  famous launches, acquisitions, key hires, open-source projects that preceded the company.
