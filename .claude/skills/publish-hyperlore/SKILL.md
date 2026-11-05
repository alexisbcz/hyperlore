---
name: publish-hyperlore
description: Publish the archive to the live Hyperlore website (snapshot export, commit, push, Vercel deploy) and verify production. Use after agents finish collecting or writing, or when asked to deploy.
---

# Publishing

The site reads live DocumentDB locally (`MONGO_URL` in `web/.env.local`) and, deployed, the snapshot in `web/data/archive.json`.

```bash
./hl export                     # snapshot + copies logos, people and place photos into web/public
cd web && bunx tsc --noEmit && env -u MONGO_URL bun run build && cd ..   # build exactly as Vercel will, from the snapshot
git add -A && git commit -m "Publish archive: <what changed>" && git push   # main → Vercel production
```

- Pushing `main` deploys (project `alexis-bouchez/hyperlore`, root directory `web`). Watch with `vercel ls hyperlore` and `vercel inspect <url> --logs`.
- Fallback: `./deploy.sh` deploys a clean copy of `web/` without git metadata.
- After production is live, tell search engines: `node web/scripts/indexnow.mjs` (IndexNow: Bing, so DuckDuckGo and Qwant, plus Yandex, Seznam, Naver). Google picks changes up from the sitemap.
- Verify production: `curl -s -o /dev/null -w '%{http_code}' https://hyperlore-omega.vercel.app/<slug>` for each new company, plus `/api/v1/companies` and `/<slug>/llms.txt`.

## Pitfalls already hit

- **"Blocked: couldn't find a Git account for the commit author"**: commits must use an email GitHub knows. This repo uses the account's private noreply address (`git config user.email`).
- **`ENOENT …/web/data/archive.json` at build time**: an unanchored pattern in `.vercelignore` (`data/`) also matched `web/data/`. Keep patterns anchored (`/data/`).
- **Next.js prerender errors about `new Date()`**: data-reading server components and `generateMetadata` must `await connection()` first (Cache Components is on).
- Never commit `.env*`, `data/raw/` or cookies. Scan for API keys before the first push of new files.
