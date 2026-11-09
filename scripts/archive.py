"""Sync the public content repository (github.com/alexisbcz/hyperlore-archive).

The site's code lives in this repo; the content it is built from lives in the archive repo, as plain
files anyone can clone, diff and cite:

  archive.json     the snapshot `./hl export` writes (web/data/archive.json)
  assets/          logos and screenshots, as the site serves them (web/public/assets)
  people/ places/  photos (web/public/people, web/public/places)
  transcripts/     timestamped interview transcripts (data/transcripts)

  python3 scripts/archive.py push [--dir ../hyperlore-archive] [-m "message"]   publish local content
  python3 scripts/archive.py pull [--dir ../hyperlore-archive] [--site-only]    restore it here (CI: --site-only)

Before anything is copied out, JSON files are scrubbed of URLs that carry the downloader's IP address
(YouTube's signed googlevideo links in yt-dlp and ScrapeCreators output), and SVGs of scripts, event
handlers and javascript: links (they are served from other people's clones and mirrors too).
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CODE_REPO = "alexisbcz/hyperlore"
ARCHIVE_REPO = "alexisbcz/hyperlore-archive"

# (path in the archive repo, path in this repo, needed to build the site)
MIRRORS = [
    ("assets", "web/public/assets", True),
    ("people", "web/public/people", True),
    ("places", "web/public/places", True),
    ("transcripts", "data/transcripts", False),
]

# yt-dlp .info.json: video metadata worth keeping (formats, thumbnails and captions hold signed URLs).
INFO_KEEP = {"id", "title", "fulltitle", "description", "channel", "channel_id", "channel_url", "uploader",
             "uploader_id", "uploader_url", "upload_date", "release_date", "timestamp", "duration",
             "duration_string", "view_count", "like_count", "comment_count", "categories", "tags", "chapters",
             "language", "webpage_url", "was_live", "live_status", "_type"}

LEAKY = re.compile(r"googlevideo\.com|[?&](ip|ipbits|sparams)=", re.I)


def scrub(v):
    """Drop every string that carries a client IP (and the keys holding it)."""
    if isinstance(v, dict):
        return {k: scrub(x) for k, x in v.items() if not (isinstance(x, str) and LEAKY.search(x))}
    if isinstance(v, list):
        return [scrub(x) for x in v if not (isinstance(x, str) and LEAKY.search(x))]
    return v


def scrub_file(p: Path):
    try:
        data = json.loads(p.read_text())
    except (ValueError, UnicodeDecodeError):
        return
    if p.name.endswith(".info.json") and isinstance(data, dict):
        data = {k: v for k, v in data.items() if k in INFO_KEEP}
    p.write_text(json.dumps(scrub(data), ensure_ascii=False, indent=1))


SVG_BAD = [
    (re.compile(r"<script\b.*?</script\s*>", re.I | re.S), ""),
    (re.compile(r"<script\b[^>]*/>", re.I), ""),
    (re.compile(r"\son[a-z]+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", re.I), ""),
    (re.compile(r"(href\s*=\s*[\"'])\s*javascript:[^\"']*", re.I), r"\1#"),
]


def sanitize_svg(p: Path):
    s = p.read_text(errors="ignore")
    t = s
    for rx, rep in SVG_BAD:
        t = rx.sub(rep, t)
    if t != s:
        p.write_text(t)
        print(f"sanitized {p.name}", file=sys.stderr)


def mirror(src: Path, dst: Path):
    dst.mkdir(parents=True, exist_ok=True)
    subprocess.run(["rsync", "-a", "--delete", "--exclude", ".DS_Store", f"{src}/", f"{dst}/"], check=True)


def git(d: Path, *args, check=True):
    return subprocess.run(["git", "-C", str(d), *args], check=check, capture_output=True, text=True)


def leak_check(d: Path):
    """Refuse to publish if anything still looks like a client IP in a URL."""
    hits = subprocess.run(["grep", "-rlE", r"[?&]ip=[0-9]{1,3}\.[0-9]", str(d), "--exclude-dir=.git"],
                          capture_output=True, text=True).stdout.split()
    if hits:
        sys.exit(f"refusing to push: IP-bearing URLs remain in {len(hits)} files, e.g. {hits[:3]}")


def push(d: Path, message: str):
    if not (d / ".git").exists():
        sys.exit(f"{d} is not a clone of {ARCHIVE_REPO} (gh repo clone {ARCHIVE_REPO} {d})")
    git(d, "pull", "--ff-only", check=False)
    shutil.copy2(ROOT / "web/data/archive.json", d / "archive.json")
    for dst, src, _ in MIRRORS:
        mirror(ROOT / src, d / dst)
    for p in (d / "transcripts").glob("*.json"):
        scrub_file(p)
    for p in (d / "assets").rglob("*.svg"):
        sanitize_svg(p)
    leak_check(d)
    git(d, "add", "-A")
    if not git(d, "status", "--porcelain").stdout.strip():
        print("archive: nothing changed")
        return
    git(d, "commit", "-m", message)
    git(d, "push")
    print(f"archive: pushed to {ARCHIVE_REPO}")
    if shutil.which("gh"):
        r = subprocess.run(["gh", "workflow", "run", "deploy.yml", "-R", CODE_REPO], capture_output=True, text=True)
        print("site: rebuild started" if r.returncode == 0 else f"site: couldn't start the rebuild: {r.stderr.strip()}")


def pull(d: Path, site_only: bool):
    (ROOT / "web/data").mkdir(parents=True, exist_ok=True)
    shutil.copy2(d / "archive.json", ROOT / "web/data/archive.json")
    for src, dst, for_site in MIRRORS:
        if (d / src).exists() and (for_site or not site_only):
            mirror(d / src, ROOT / dst)
    print("archive: restored" + (" (site files only)" if site_only else ""))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["push", "pull"])
    ap.add_argument("--dir", default=str(ROOT.parent / "hyperlore-archive"))
    ap.add_argument("-m", "--message", default="Update archive")
    ap.add_argument("--site-only", action="store_true")
    a = ap.parse_args()
    d = Path(a.dir).resolve()
    push(d, a.message) if a.cmd == "push" else pull(d, a.site_only)


if __name__ == "__main__":
    main()
