---
name: research-company
description: Research a startup's full lore (founding, names, logos, funding, launches, people, places, quotes) into the Hyperlore archive with a source on every fact. Use when asked to add, cover, or "do the lore of" a company, or to deepen an existing one.
---

# Research a company into Hyperlore

Hyperlore's rule: **no source, no fact.** Every write goes through `./hl` (run from the repo root), which refuses events, quotes and pages whose sources aren't registered. Read `AGENTS.md` for the schema; this skill is the method.

## 0. Identify before collecting

Loose names are common ("Corgi", "the compliance one", "boat.dev"). Before spending credits:
- `./hl ctx GET brand/search '{"query":"<name>"}'` (Context.dev, cheap) and `./hl ctx POST brand/retrieve '{"type":"by_domain","domain":"<domain>","timeoutOpts":{"milliseconds":60000,"behavior":"return-partial"}}'` (10 credits) to pin the domain, description and socials.
- If several startups share the name, pick the most prominent tech startup and **say which and why** in your report.

## 1. Collect, cheapest and most first-hand sources first

| Need | Go to | Skill |
|---|---|---|
| Founders' own words, launch posts, numbers | Hacker News stories **and founders' comments** | `hacker-news` |
| Historical tweets (launch, rename, rounds) | Wayback lists of archived tweets, then ScrapeCreators | `x-history` |
| Long-form story, anecdotes, timestamps | YouTube / podcast transcripts | `youtube-transcripts` |
| AT-Protocol / indie companies | Bluesky author feeds | `bluesky-history` |
| Renames, domains, taglines, logos over time | Wayback CDX | `wayback-history`, `logo-history` |
| Funding press, coverage | Context.dev `news/search`, the company blog, TechCrunch, Sifted, Les Echos… | — |
| Repos, first commits, org renames | GitHub API (`api.github.com/repos/<o>/<r>`, `/commits?per_page=1&...`) | — |
| French/Swedish/… companies | local press and local-language captions (`--sub-langs fr,en`) | — |
| Coverage nothing else finds, "is it still active?", competitors | Linkup `search` / `research`, `./hl peers <slug>` | `linkup` |

### Search by the people, not just the company

When the company name finds little, and always for interviews, search every founder by name, with and without diacritics ("Küntzel", "Kuntzel", "Kuentzel"), and by their X/HN/Bluesky handles. Run the same queries on YouTube (`yt-dlp "ytsearch10:<name>"`), podcast directories (Apple's free episode search: `https://itunes.apple.com/search?media=podcast&entity=podcastEpisode&country=<cc>&term=<name>`, with the founders' home country as `cc`), HN and the web. Also search the founders' earlier companies (Quartr co-founder Oliver Hamrin's earlier firm Kalqyl led to two more podcasts). Quartr: the company name found only a one-minute product clip on YouTube; the founders' names found a one-hour founder interview, an investor's podcast and three more episodes.

**Keep only hits that are provably the same person.** Common names collide: "Sami Osman" on YouTube is a US soccer creator, not the Quartr founder. A hit counts only if its title, description or show notes name the company, a co-founder, or a detail you already sourced (city, earlier company, investor). Otherwise drop it, however plausible. Check again once it's transcribed: the speaker must introduce themselves or be introduced as that founder.

**Handles need the same proof.** Company author pages and team pages list several people's links side by side. Attach a handle to a person only when it sits next to that person's own name or LinkedIn on the page, or the account's bio names them. A handle seen *near* a founder is not theirs: `Matematikern3`, listed on Quartr's pages, belongs to Peter Westberg, not to co-founder David Dag.

Budgets: ScrapeCreators credits are paid and finite (check `./hl stats` → `calls_by_agent`; balance: `curl -H "x-api-key: $KEY" https://api.scrapecreators.com/v1/credit-balance`). Context.dev has a large balance but costs per call. Everything else is free. Always `export HL_AGENT=<name>` so spend is attributed.

## 2. Record

1. `./hl source` for every URL you rely on (type, title, author, published_at, publisher, excerpt = the text that supports the claim).
2. `./hl event` with date precision matching the source (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`), a `kind` from the list in AGENTS.md, and `sources: [{url, quote}]` where `quote` is verbatim.
   - Funding: `details.amount_usd`, `round`, `lead_investors`, `investors`, `valuation_usd` (convert EUR and keep the original in `amount_eur`).
   - Founding: `details.founders`, `details.hq`. Places: `details.place`. Cross-company stories: `details.saga`.
3. `./hl quote` for memorable verbatim quotes; video quotes get `timestamp_s` and `deep_link` (`…&t=754s`).
4. `./hl entity` for people (`kind: person`, `links: {x, github, bluesky, linkedin, web}`), investors, former names, places.
5. Before adding, `./hl list events <slug>`; re-adding the same company+kind+date+title **merges sources** (corroboration), so reuse exact titles.

## 3. Judgment rules (learned the hard way)

- Two sources disagree → keep both on the event and say so in `summary` ("Sources differ: …").
- Deduced, not stated → `confidence: "inferred"` and explain how.
- Founder-said numbers are claims: attribute them ("Rauch said revenue was…").
- Controversies about real people: allegations stay allegations, attributed, with the company's response. Never characterise.
- A joke post is not a logo change (a "new Vercel logo" on 1 May turned out to be one). Check dates against April Fools'.
- Google `site:x.com` results skew recent; old tweets need Wayback (see `x-history`).
- Correct mistakes with `./hl delete <collection> <id> "<reason>"` (logged in `deletions`), never by editing the DB directly.

## 4. Finish

Write the overview with the `write-lore-page` skill, then publish with `publish-hyperlore`.
