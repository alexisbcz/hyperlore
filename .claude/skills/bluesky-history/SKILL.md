---
name: bluesky-history
description: Reconstruct a company's or person's history from Bluesky posts via the free public AppView API, including handle changes. Use for AT-Protocol-native and indie/open-source companies (e.g. Tangled), and to find people's avatars.
---

# Bluesky (free, no key)

Base: `https://public.api.bsky.app/xrpc/`

- Profile (DID, handle, avatar, description, counts): `app.bsky.actor.getProfile?actor=<handle or did>`
- Full history: `app.bsky.feed.getAuthorFeed?actor=<handle>&limit=100&cursor=<cursor>`. Page through `cursor` until it's absent, then read oldest first.
- A thread: `app.bsky.feed.getPostThread?uri=at://<did>/app.bsky.feed.post/<rkey>`
- Find accounts: `app.bsky.actor.searchActors?q=<name>`
- `app.bsky.feed.searchPosts` returns **403 without auth**: page through author feeds instead.

## Handles change, DIDs don't

`tangled.sh` became `tangled.org`. Resolve the DID once (`getProfile`) and use it. Record handle changes as `domain`/`rename` events. The PLC audit log has them with dates: `https://plc.directory/<did>/log/audit`.

## Citing

`https://bsky.app/profile/<handle>/post/<rkey>` (rkey = last segment of the post `uri`), source type `bluesky`, `published_at` = `record.createdAt`.
