#!/usr/bin/env bash
# Deploy the website to Vercel production from a clean copy of web/.
# A copy outside git keeps Vercel from attaching (and blocking on) the local commit author.
set -euo pipefail
root="$(cd "$(dirname "$0")" && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
rsync -a --exclude node_modules --exclude .next --exclude '.env*' --exclude tsconfig.tsbuildinfo "$root/web/" "$tmp/web/"
cp -r "$root/.vercel" "$tmp/.vercel"
cd "$tmp" && vercel deploy --prod --yes "$@"
