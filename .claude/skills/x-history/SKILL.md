---
name: x-history
description: Find and fetch historical tweets (X/Twitter) from founders and companies, including years-old ones, with exact dates and text, as citable sources. Use when a company's story lives on X: launch announcements, renames, funding tweets, founder threads.
---

# Historical tweets

## The problem

- ScrapeCreators `v1/twitter/user-tweets` returns only **~100 of an account's most popular tweets**, not a timeline.
- Google `site:x.com` searches (`v1/google/search`) surface mostly **recent** tweets.
- X has no free search API.

## The method (cheapest first)

1. **Wayback lists of archived tweet URLs (free).** The Wayback CDX index lists every archived status URL for an account:
   ```
   https://web.archive.org/cdx/search/cdx?url=twitter.com/<handle>/status/*&output=json&fl=original,timestamp&collapse=urlkey&limit=5000
   ```
   Also try `x.com/<handle>/status/*` and the company's former handles (e.g. `@zeithq` before `@vercel`).
2. **Free text via the public embed endpoint.** For each candidate status ID:
   X's public embed endpoint (`https://cdn.syndication.twimg.com/tweet-result?id=<id>`, which may also want a `token` parameter) returns the text and date without credits. This is how the early ZEIT/Vercel tweets were recovered. If it stops working, fall back to step 3. Filter candidates by keyword before fetching.
3. **ScrapeCreators for the rest** (paid, cached by `./hl sc`):
   - `./hl sc v1/twitter/tweet url=https://x.com/<handle>/status/<id>`: full text, `created_at`, views, likes.
   - `./hl sc v1/google/search 'query=site:x.com <handle> "renamed"'`: targeted discovery, with words like "raised", "Series", "launch", "now called", "new logo".
   - `./hl sc v1/twitter/profile handle=<handle>`: bio, follower counts, `profile_image_url_https`.
4. Record each tweet as a `tweet` source with the full text as `excerpt`, `published_at` from the tweet, `author` = handle. Cite as `https://x.com/<handle>/status/<id>`.

## Gotchas

- Handles change (`@Railway_App` → `@Railway`, `@getbranddev` → `@getcontextdev`); the status ID URL keeps working under any handle.
- Company accounts often were the old brand's account (`@vercel` is the former `@zeithq`).
- Retweets and quote-tweets: cite the original.
- Never scrape x.com HTML directly. Use the endpoints above.
