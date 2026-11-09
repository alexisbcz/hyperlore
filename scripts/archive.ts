// Sync the public content repository (github.com/alexisbcz/hyperlore-archive).
//
// The site's code lives in this repo; the content it is built from lives in the archive repo, as plain
// files anyone can clone, diff and cite:
//
//   archive.json     the snapshot `./hl export` writes (web/data/archive.json)
//   assets/          logos and screenshots, as the site serves them (web/public/assets)
//   people/ places/  photos (web/public/people, web/public/places)
//   transcripts/     timestamped interview transcripts (data/transcripts)
//
//   bun scripts/archive.ts push [--dir ../hyperlore-archive] [-m "message"]   publish local content
//   bun scripts/archive.ts pull [--dir ../hyperlore-archive] [--site-only]    restore it here (CI: --site-only)
//
// Before anything is copied out, JSON files are scrubbed of URLs that carry the downloader's IP address
// (YouTube's signed googlevideo links in yt-dlp and ScrapeCreators output), and SVGs of scripts, event
// handlers and javascript: links (they are served from other people's clones and mirrors too).

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CODE_REPO = "alexisbcz/hyperlore";
const ARCHIVE_REPO = "alexisbcz/hyperlore-archive";

/** [path in the archive repo, path in this repo, needed to build the site] */
const MIRRORS: [string, string, boolean][] = [
  ["assets", "web/public/assets", true],
  ["people", "web/public/people", true],
  ["places", "web/public/places", true],
  ["transcripts", "data/transcripts", false],
];

/** yt-dlp .info.json: video metadata worth keeping (formats, thumbnails and captions hold signed URLs). */
const INFO_KEEP = new Set([
  "id", "title", "fulltitle", "description", "channel", "channel_id", "channel_url", "uploader",
  "uploader_id", "uploader_url", "upload_date", "release_date", "timestamp", "duration",
  "duration_string", "view_count", "like_count", "comment_count", "categories", "tags", "chapters",
  "language", "webpage_url", "was_live", "live_status", "_type",
]);

const LEAKY = /googlevideo\.com|[?&](ip|ipbits|sparams)=/i;
const leaky = (x: unknown) => typeof x === "string" && LEAKY.test(x);

/** Drop every string that carries a client IP (and the keys holding it). */
function scrub(v: unknown): unknown {
  if (Array.isArray(v)) return v.filter((x) => !leaky(x)).map(scrub);
  if (v && typeof v === "object")
    return Object.fromEntries(Object.entries(v).filter(([, x]) => !leaky(x)).map(([k, x]) => [k, scrub(x)]));
  return v;
}

function scrubFile(p: string) {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return;
  }
  if (p.endsWith(".info.json") && data && typeof data === "object" && !Array.isArray(data))
    data = Object.fromEntries(Object.entries(data).filter(([k]) => INFO_KEEP.has(k)));
  writeFileSync(p, JSON.stringify(scrub(data), null, 1));
}

const SVG_BAD: [RegExp, string][] = [
  [/<script\b.*?<\/script\s*>/gis, ""],
  [/<script\b[^>]*\/>/gi, ""],
  [/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ""],
  [/(href\s*=\s*["'])\s*javascript:[^"']*/gi, "$1#"],
];

function sanitizeSvg(p: string) {
  const s = readFileSync(p, "utf8");
  const t = SVG_BAD.reduce((acc, [rx, rep]) => acc.replace(rx, rep), s);
  if (t !== s) {
    writeFileSync(p, t);
    console.error(`sanitized ${path.basename(p)}`);
  }
}

/** Every file under dir (skipping .git), as absolute paths. */
function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && !path.join(e.parentPath, e.name).includes(`${path.sep}.git${path.sep}`))
    .map((e) => path.join(e.parentPath, e.name));
}

function run(cmd: string, args: string[], { check = true } = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28 });
  if (check && r.status !== 0) die(`${cmd} ${args.join(" ")} failed:\n${r.stderr || r.stdout}`);
  return r;
}

const git = (d: string, ...args: string[]) => run("git", ["-C", d, ...args]);

function die(msg: string): never {
  console.error(msg);
  process.exit(1);
}

function mirror(src: string, dst: string) {
  mkdirSync(dst, { recursive: true });
  run("rsync", ["-a", "--delete", "--exclude", ".DS_Store", `${src}/`, `${dst}/`]);
}

/** Refuse to publish if anything still looks like a client IP in a URL. */
function leakCheck(d: string) {
  const ip = /[?&]ip=[0-9]{1,3}\.[0-9]/;
  const hits = walk(d).filter((f) => ip.test(readFileSync(f, "latin1")));
  if (hits.length) die(`refusing to push: IP-bearing URLs remain in ${hits.length} files, e.g. ${hits.slice(0, 3).join(", ")}`);
}

function push(d: string, message: string) {
  if (!existsSync(path.join(d, ".git"))) die(`${d} is not a clone of ${ARCHIVE_REPO} (gh repo clone ${ARCHIVE_REPO} ${d})`);
  run("git", ["-C", d, "pull", "--ff-only"], { check: false });
  copyFileSync(path.join(ROOT, "web/data/archive.json"), path.join(d, "archive.json"));
  for (const [dst, src] of MIRRORS) mirror(path.join(ROOT, src), path.join(d, dst));
  for (const f of walk(path.join(d, "transcripts"))) if (f.endsWith(".json") && path.dirname(f) === path.join(d, "transcripts")) scrubFile(f);
  for (const f of walk(path.join(d, "assets"))) if (f.toLowerCase().endsWith(".svg")) sanitizeSvg(f);
  leakCheck(d);
  git(d, "add", "-A");
  if (!git(d, "status", "--porcelain").stdout.trim()) {
    console.log("archive: nothing changed");
    return;
  }
  git(d, "commit", "-m", message);
  git(d, "push", "-u", "origin", "HEAD");
  console.log(`archive: pushed to ${ARCHIVE_REPO}`);
  if (spawnSync("gh", ["--version"]).status === 0) {
    const r = run("gh", ["workflow", "run", "deploy.yml", "-R", CODE_REPO], { check: false });
    console.log(r.status === 0 ? "site: rebuild started" : `site: couldn't start the rebuild: ${r.stderr.trim()}`);
  }
}

function pull(d: string, siteOnly: boolean) {
  mkdirSync(path.join(ROOT, "web/data"), { recursive: true });
  copyFileSync(path.join(d, "archive.json"), path.join(ROOT, "web/data/archive.json"));
  for (const [src, dst, forSite] of MIRRORS)
    if (existsSync(path.join(d, src)) && (forSite || !siteOnly)) mirror(path.join(d, src), path.join(ROOT, dst));
  console.log("archive: restored" + (siteOnly ? " (site files only)" : ""));
}

const USAGE = `usage: bun scripts/archive.ts push [--dir ../hyperlore-archive] [-m "message"]
       bun scripts/archive.ts pull [--dir ../hyperlore-archive] [--site-only]`;

const argv = process.argv.slice(2);
const cmd = argv[0];
const opt = (...names: string[]) => {
  const i = argv.findIndex((a) => names.includes(a));
  return i >= 0 ? argv[i + 1] : undefined;
};
if (cmd !== "push" && cmd !== "pull") die(USAGE);
const dir = path.resolve(opt("--dir") ?? path.join(ROOT, "..", "hyperlore-archive"));
if (cmd === "push") push(dir, opt("-m", "--message") ?? "Update archive");
else pull(dir, argv.includes("--site-only"));
