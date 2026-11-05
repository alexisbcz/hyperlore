---
name: wayback-history
description: Date a company's renames, domain moves, taglines, pricing and positioning changes from the Wayback Machine, down to the day a redirect started. Use when the question is "when did X change its name / domain / homepage / tagline?".
---

# Dating changes with the Wayback Machine

## CDX index: what was captured, when

```
https://web.archive.org/cdx/search/cdx?url=<domain>&output=json&fl=timestamp,original,statuscode,digest&collapse=timestamp:6
```
- `collapse=timestamp:6`: one capture per month (use `:8` for one per day).
- `filter=statuscode:200` for real pages, `filter=statuscode:30.` for redirects.
- `digest` changes when the page content changes. That's how to find when a homepage changed.
- Fetch a capture: `https://web.archive.org/web/<timestamp>/<url>`. Add `id_` after the timestamp (`/web/<ts>id_/<url>`) for the original bytes without the Wayback toolbar.

## Pinning a domain move to a window

Example: railway.app → railway.com.
1. CDX on the **old** domain with statuscodes. Find the last `200` and the first `301/302` to the new domain: the redirect started between those two timestamps.
2. CDX on the **new** domain. Look for when it stopped being a parked page or for-sale page, and when the company's site first appears: the purchase window.
3. Corroborate with the announcement (blog, tweet, Show HN), and record the event at the announced date. Give the redirect window in `details` (e.g. "last normal capture 20241219, first redirect 20241222").

## Taglines and positioning

Sample monthly captures of the homepage, extract `<title>`, `og:description` and the hero heading, and record a `rebrand` event at the first capture showing each new line (`confidence: "inferred"` if only bounded by captures).

## Gotchas

- Wayback rate-limits and goes briefly offline under load: back off and retry, and don't parallelise heavily.
- Client-rendered sites may capture as empty shells. Try `og:` meta tags and the JS-free `id_` capture.
- A capture's timestamp is when it was **archived**, not when the change happened. Phrase dates as "by" or "first seen".
