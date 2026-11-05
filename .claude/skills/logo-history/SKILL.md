---
name: logo-history
description: Collect a company's current and historical logos, wordmarks and square icons with dates, light/dark variants and sources. Use when adding a company or when its logo row shows letters instead of marks.
---

# Logo history

Run the pipeline first: `uv run python logos.py <company> [--domain <domain>]`. It combines the sources below, dedupes by content hash and registers assets. This skill explains the sources and rules when going by hand.

## Sources, best first

1. **Context.dev brand** (`./hl ctx POST brand/retrieve '{"type":"by_domain","domain":"x.com",...}'`, 10 credits): current logos and icons, each marked as `light` or `dark` variant, with sizes.
2. **Logo collections on GitHub, with git history.** Each file's commit history dates its redesigns.
   - simple-icons: `icons/<slug>.svg`, monochrome, the uniform icon set for logo rows. Also via `https://api.iconify.design/simple-icons/<slug>.svg`.
   - svgl (pheralb/svgl): wordmarks, light and dark.
   - lobe-icons: AI companies.
   - gilbarbara/logos.
   History: `https://api.github.com/repos/<o>/<r>/commits?path=<file>`, then the raw file at each SHA.
3. **Wikimedia Commons file history**: `action=query&prop=imageinfo&iiprop=timestamp|url|sha1|comment&iilimit=50&titles=File:<Name> logo.svg`, including former names' files. Check the licence on the file page.
4. **Wayback**: header logo, `favicon.ico`, `apple-touch-icon.png`, `og:image`, and press-kit pages over time. Hash each file to find when it changed (see `wayback-history`).
5. Brand/press-kit pages today (`/brand`, `/press`, `/brand-assets`).

## Recording

`./hl asset` with `kind` (`logo` | `wordmark` | `icon`), `variant` (`light` = for light backgrounds, `dark` = for dark backgrounds), `date` (first seen), `last_seen`, `sha256`, `local_path` (`data/assets/<company>/…`), `source_url` (exact snapshot, commit or file page), `origin`. Logo changes become `logo` events.

## Rules

- Every company needs at least one square `icon`: a wordmark squeezed into a square is unreadable. The site shows a letter until an icon exists.
- Don't hotlink random search-result images. Download, hash and cite.
- Dark-variant files (white marks) must be flagged `variant: "dark"` or they vanish on white.
