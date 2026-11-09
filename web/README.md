# Hyperlore web

The site, a Next.js static export served by GitHub Pages. See the repo README ("Publishing").

```bash
bun install
bun run dev     # live DocumentDB if web/.env.local sets MONGO_URL, else the snapshot in data/archive.json
bun run build   # static export into out/ (set NEXT_PUBLIC_BASE_PATH=/hyperlore to match GitHub Pages)
```
