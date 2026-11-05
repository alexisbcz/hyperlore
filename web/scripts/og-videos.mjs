#!/usr/bin/env node
// Renders each company's share video: the Twenty-style share card building itself up (panel,
// fields, then the timeline one event at a time), 6 seconds at 30 fps, as an H.264 MP4 that
// Facebook, LinkedIn, Slack, Discord and iMessage can play inline.
//
// Frames come from a running server's /lab/twenty/<company>/og-frame?t=… route (dev, or
// `OG_FRAMES=1 bun run start`); ffmpeg encodes them. The videos land in public/og/video/ and the
// list of companies that have one in src/app/lab/twenty/og/videos.json, which the company page
// reads to declare og:video.
//
//   node scripts/og-videos.mjs vercel stripe            these companies
//   node scripts/og-videos.mjs --top 24                 the 24 companies with the most events
//   node scripts/og-videos.mjs --top 24 --base http://localhost:3017

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const web = path.resolve(import.meta.dirname, "..");
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args.splice(i, 2)[1];
};
const base = flag("base", "http://localhost:3017");
const top = Number(flag("top", 0));
const FPS = 30, SECONDS = 6, FRAMES = FPS * SECONDS;
// The entrance runs over the first 80% of the clip; the settled card holds for the rest.
const HOLD = 0.8;

let slugs = args.filter((a) => !a.startsWith("--"));
if (top) {
  const companies = await (await fetch(`${base}/companies/directory.json`)).json();
  slugs = companies.toSorted((a, b) => b.events - a.events).slice(0, top).map((c) => c.slug);
}
if (!slugs.length) {
  console.error("usage: node scripts/og-videos.mjs <company…> | --top N [--base URL]");
  process.exit(1);
}

const outDir = path.join(web, "public/og/video");
const manifest = path.join(web, "src/app/lab/twenty/og/videos.json");
mkdirSync(outDir, { recursive: true });
// Every video on disk counts, so an interrupted run loses nothing.
const done = new Set(readdirSync(outDir).filter((f) => f.endsWith(".mp4")).map((f) => f.slice(0, -4)));
const save = () => writeFileSync(manifest, JSON.stringify([...done].sort()) + "\n");

async function frame(slug, i, dir) {
  const t = Math.min(1, i / (FRAMES * HOLD - 1));
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${base}/lab/twenty/${slug}/og-frame?t=${t.toFixed(4)}`);
    if (res.ok) {
      writeFileSync(path.join(dir, `${String(i).padStart(4, "0")}.png`), Buffer.from(await res.arrayBuffer()));
      return;
    }
    if (res.status === 404) throw new Error(`${slug}: frame route returned 404 (no such company, or OG_FRAMES unset in production)`);
  }
  throw new Error(`${slug}: frame ${i} failed`);
}

const force = process.argv.includes("--force");
for (const slug of slugs) {
  if (done.has(slug) && !force) continue; // --force re-renders
  const started = Date.now();
  const dir = mkdtempSync(path.join(tmpdir(), `og-${slug}-`));
  try {
    // Frames after the entrance are identical: render the settled card once and copy it.
    const moving = Math.ceil(FRAMES * HOLD);
    for (let i = 0; i < moving; i += 6) await Promise.all(Array.from({ length: Math.min(6, moving - i) }, (_, k) => frame(slug, i + k, dir)));
    const last = readFileSync(path.join(dir, `${String(moving - 1).padStart(4, "0")}.png`));
    for (let i = moving; i < FRAMES; i++) writeFileSync(path.join(dir, `${String(i).padStart(4, "0")}.png`), last);
    const out = path.join(outDir, `${slug}.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%04d.png"),
      "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
    done.add(slug);
    save();
    console.log(`${slug}: ${(statSync(out).size / 1024).toFixed(0)} KB in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  } catch (e) {
    console.error(String(e.message ?? e));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
save();
