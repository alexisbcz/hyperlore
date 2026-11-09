---
name: publish-hyperlore
description: Publish the archive to the live Hyperlore website (snapshot export, push to the public archive repo, Netlify redeploy) and verify production. Use after agents finish collecting or writing, or when asked to deploy.
---

# Publishing

Two public repos:
- **github.com/alexisbcz/hyperlore**: the code (this repo). Pushing `main` rebuilds the site.
- **github.com/alexisbcz/hyperlore-archive**: the content: `archive.json`, `assets/`, `people/`, `places/`, `transcripts/`. Locally a clone sits at `../hyperlore-archive` (`gh repo clone alexisbcz/hyperlore-archive ../hyperlore-archive`).

The site is a static export deployed to Netlify (URL: the repo variable `SITE_URL`, `gh variable get SITE_URL -R alexisbcz/hyperlore`). The [deploy workflow](../../../.github/workflows/deploy.yml) checks out both repos, runs `scripts/archive.ts pull --site-only`, `next build`, `scripts/pdfs.tsx` (PDFs, cached per company) and `netlify deploy`, which uploads only changed files.

```bash
./hl export                                   # snapshot + copy logos and photos into web/public
git diff --stat HEAD -- web/data 2>/dev/null; python3 - <<'EOF'   # compare with the published snapshot first
import json; a=json.load(open("web/data/archive.json")); b=json.load(open("../hyperlore-archive/archive.json"))
print(len({e["company"] for e in a["events"]}), "companies now;", len({e["company"] for e in b["events"]}), "published")
EOF
bun scripts/archive.ts push -m "Add <company>: <what changed>"   # scrub, commit, push, start the site rebuild
```

- Code changes: commit and `git push` (main). That also rebuilds.
- Watch the run: `gh run list -R alexisbcz/hyperlore -w Deploy -L 3`, `gh run watch -R alexisbcz/hyperlore <id>`. The build takes about 4 minutes on this machine (10,000 prerendered files); PDFs add seconds when cached, about 90 s when all change.
- Build locally exactly as CI does: `cd web && env -u MONGO_URL SITE_URL=<site url> bun run build && bun scripts/pdfs.tsx`, then `bunx serve out`.
- After it is live, tell search engines: `node web/scripts/indexnow.mjs`.
- Verify production: `curl -s -o /dev/null -w '%{http_code}' $SITE_URL/<slug>` for each new company, plus `/api/v1/companies.json` and `/<slug>/llms.txt`.

## Rules

- `archive.ts push` refuses to publish while any file still holds an IP-bearing URL (signed YouTube links in yt-dlp `.info.json` and ScrapeCreators output). Never bypass it: the repos are public.
- Never commit `.env*`, `data/raw/` or cookies. Both repos are public: scan new files for API keys before pushing.
- Compare the export against the published `archive.json` before pushing: a stale local DB once dropped 201 companies.

## Static-site constraints (when changing web/)

- No server: no route handlers that read the request, no cookies, no server actions, no proxy. Every dynamic segment needs `generateStaticParams` (see `src/app/(site)/params.ts`); handlers without params export `generateStaticParams = () => [{}]`.
- Plain URLs (`<img src>`, `fetch`) go through `withBase()` from `@/lib/base` (so a sub-path deploy keeps working); `<Link>` adds it itself.
- Response headers live in `web/public/_headers` (Netlify).
- Forms open pre-filled GitHub issues on the archive repo (`src/app/actions.ts`). Search runs in the browser over `/search-index.json`.
