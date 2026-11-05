"""Logo history pipeline for Hyperlore.

    uv run python logos.py <company> [--domain d1 --domain d2 ...] [options]

Collects current and historical logos for a company from:
  contextdev   Context.dev brand/retrieve (current logos/icons, light/dark; 10 credits, cached)
  simple-icons, svgl, gilbarbara, lobe-icons, vectorlogozone
               open-source logo sets on GitHub; every commit touching the file = a dated version
  commons      Wikimedia Commons / en.wikipedia file history (dated uploads + licence)
  wayback      Wayback Machine: header logo on the homepage over time (monthly captures,
               sampled then bisected to month-precision era boundaries), plus CDX digest
               history of favicon.ico / apple-touch-icon / declared icons / logo-like files
  brand        the company's brand/press-kit page today
  avatar       GitHub / Bluesky / X avatars today (supplementary)

Every distinct file is hashed (sha256) and perceptually hashed (dHash of the rasterised
"ink" mask, so a white-on-transparent and a black-on-transparent copy of the same design
cluster together). Files are grouped into designs; each design x kind x variant becomes one
asset registered with `./hl source` + `./hl asset` (date = first seen, last_seen = last seen,
sightings = where else it was seen). Existing assets are matched and backfilled.

Options:
  --dry-run          analyse and print, write nothing to the DB
  --only a,b         run only these collectors (contextdev,github,commons,wayback,brand,avatar)
  --no-contextdev    skip the paid Context.dev lookup
  --wayback-budget N max homepage snapshots fetched per domain (default 45)
  --events           also write `logo` events (confidence=inferred) for design changes seen
                     on the company's own site that have no logo/rebrand event within 4 months

Raw HTTP responses are cached in data/raw/logos/http/, every distinct file is kept in
data/raw/logos/<company>/files/<sha256>.<ext>, the representative of each asset is copied to
data/assets/<company>/, and a JSON report is written to data/raw/logos/<company>/report.json.
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from datetime import date
from html import unescape
from pathlib import Path
from urllib.parse import urljoin, urlparse, unquote, quote

import httpx

import hl  # db connection, ROOT, sid()

ROOT = hl.ROOT
db = hl.db
TODAY = date.today().isoformat()
RAW = ROOT / "data/raw/logos"
HTTP_CACHE = RAW / "http"
UA = "Mozilla/5.0 (X11; Linux x86_64) Hyperlore-logos/0.1 (research; +https://github.com/alexisbcz)"

# ---------------------------------------------------------------- company config
# names: lowercase tokens used to recognise the company's files (include former names)
# domains: current first, then former. github_orgs / bsky / x: avatars.
# commons: File: titles on Commons / en.wikipedia (plus the infobox image of `wikipedia`).
COMPANIES = {
    "vercel": dict(names=["vercel", "zeit"], domains=["vercel.com", "zeit.co"], windows={"vercel.com": "202004", "zeit.co": "201510-202004"},
                   brand=["https://vercel.com/geist/brands"],
                   wayback_brand=["vercel.com/design/brands", "vercel.com/geist/brands", "zeit.co/design/brands"],
                   wikipedia="Vercel", commons=["File:Vercel logo 2025.svg", "File:Vercel logo black.svg"],
                   github_orgs=["vercel", "zeit"], bsky=["vercel.com"], x=["vercel", "zeithq"]),
    "resend": dict(names=["resend"], domains=["resend.com"], windows={"resend.com": "202211"}, brand=["https://resend.com/brand"],
                   wayback_brand=["resend.com/brand"],
                   commons=["File:Resend Logo.svg", "File:Resend-wordmark.svg"],
                   github_orgs=["resend"], bsky=["resend.com"], x=["resend"]),
    "supabase": dict(names=["supabase"], domains=["supabase.com", "supabase.io"], windows={"supabase.com": "202104", "supabase.io": "202001-202105"},
                     brand=["https://supabase.com/brand-assets"],
                     wayback_brand=["supabase.com/brand-assets", "supabase.io/brand-assets"],
                     github_orgs=["supabase"], bsky=["supabase.com"], x=["supabase"]),
    "linear": dict(names=["linear", "linearapp"], domains=["linear.app"], windows={"linear.app": "201901"}, brand=["https://linear.app/brand"],
                   wayback_brand=["linear.app/brand"], wikipedia="Linear Orbit, Inc.",
                   commons=["File:Linear light wordmark dark background by Linear Orbit Inc.png"],
                   github_orgs=["linear"], x=["linear"]),
    "tangled": dict(names=["tangled", "tangledsh", "dolly"], domains=["tangled.org", "tangled.sh"], windows={"tangled.org": "202509", "tangled.sh": "202502-202509"},
                    brand=["https://tangled.org/brand"], wayback_brand=["tangled.org/brand", "tangled.sh/brand"],
                    bsky=["tangled.org"], x=["tangled_org"]),
    "contextdev": dict(names=["contextdev", "context-dev", "context.dev", "branddev", "brand-dev", "brand.dev"],
                       domains=["context.dev", "brand.dev"], windows={"context.dev": "202603", "brand.dev": "202405-202603"}),
    "mistral": dict(names=["mistral", "mistralai", "mistral-ai"], domains=["mistral.ai"], windows={"mistral.ai": "202305"},
                    brand=["https://mistral.ai/brand"], wayback_brand=["mistral.ai/brand"],
                    wikipedia="Mistral AI",
                    commons=["File:Mistral AI logo (2025–).svg",
                             ],
                    github_orgs=["mistralai"], x=["MistralAI"]),
    "railway": dict(names=["railway", "railwayapp"], domains=["railway.com", "railway.app"], windows={"railway.com": "202411", "railway.app": "202010-202412"},
                    github_orgs=["railwayapp"], bsky=["railway.com"], x=["Railway"]),
}

# GitHub logo sets: (origin, repo, ref, path prefixes). Files are discovered by name in the
# current tree; former paths of the same names are tried too (history doesn't follow renames).
LOGO_REPOS = [
    ("simple-icons", "simple-icons/simple-icons", "develop", ["icons/"]),
    ("svgl", "pheralb/svgl", "main", ["static/library/"]),
    ("gilbarbara", "gilbarbara/logos", "main", ["logos/"]),
    ("lobe-icons", "lobehub/lobe-icons", "master", ["packages/static-svg/icons/"]),
    ("vectorlogozone", "VectorLogoZone/vectorlogozone", "main", ["src/content/logos/", "www/logos/"]),
]

ICON_WORDS = ("icon", "favicon", "apple-touch", "mark", "symbol", "glyph", "avatar", "logomark", "monogram")
WORDMARK_WORDS = ("wordmark", "logotype", "-text", "_text", "-ar21", "type.")


# ---------------------------------------------------------------- http + cache
_last = {}


def throttle(host, gap):
    t = _last.get(host, 0) - time.time() + gap
    if t > 0:
        time.sleep(t)
    _last[host] = time.time()


def fetch(url, *, headers=None, gap=None, tries=4, cache=True, max_bytes=8_000_000):
    """GET with on-disk cache. Returns (status, final_url, content_type, bytes) or None."""
    key = hashlib.sha1(url.encode()).hexdigest()
    meta_p, body_p = HTTP_CACHE / f"{key}.json", HTTP_CACHE / f"{key}.bin"
    if cache and meta_p.exists():
        m = json.loads(meta_p.read_text())
        return m["status"], m["final_url"], m["ctype"], body_p.read_bytes() if body_p.exists() else b""
    host = urlparse(url).netloc
    if gap is None:
        gap = 5.0 if "archive.org" in host else (1.0 if "wiki" in host else 0.2)
    h = {"User-Agent": UA, **(headers or {})}
    for i in range(tries):
        throttle(host, gap)
        try:
            r = httpx.get(url, headers=h, timeout=60, follow_redirects=True)
        except httpx.HTTPError as e:
            print(f"    ! {type(e).__name__} {url[:120]}", file=sys.stderr, flush=True)
            if "archive.org" in host and isinstance(e, httpx.ConnectError):
                # IA refuses connections for a while after bursts: wait it out
                for _ in range(40):
                    time.sleep(120)
                    try:
                        httpx.head("https://web.archive.org/", timeout=10)
                        break
                    except httpx.HTTPError:
                        pass
                continue
            time.sleep(5 * (i + 1))
            continue
        if r.status_code in (429, 503, 502, 504):
            wait = 20 * (i + 1)
            print(f"    ! HTTP {r.status_code}, sleeping {wait}s: {url[:100]}", file=sys.stderr)
            time.sleep(wait)
            continue
        body = r.content[:max_bytes]
        res = (r.status_code, str(r.url), r.headers.get("content-type", ""), body)
        if cache and r.status_code in (200, 404, 410, 403):
            HTTP_CACHE.mkdir(parents=True, exist_ok=True)
            meta_p.write_text(json.dumps({"url": url, "status": r.status_code, "final_url": str(r.url),
                                          "ctype": res[2], "at": TODAY}))
            body_p.write_bytes(body)
        return res
    return None


def fetch_json(url, **kw):
    r = fetch(url, **kw)
    if not r or r[0] != 200:
        return None
    try:
        return json.loads(r[3])
    except ValueError:
        return None


_gh_token = None


def gh(path):
    global _gh_token
    if _gh_token is None:
        _gh_token = os.environ.get("GITHUB_TOKEN") or subprocess.run(
            ["gh", "auth", "token"], capture_output=True, text=True).stdout.strip()
    hdr = {"Accept": "application/vnd.github+json"}
    if _gh_token:
        hdr["Authorization"] = f"Bearer {_gh_token}"
    return fetch_json(f"https://api.github.com/{path}", headers=hdr, gap=0.1)


# ---------------------------------------------------------------- image analysis
def sniff_ext(b, hint=""):
    head = b[:512].lstrip()
    if head[:4] == b"\x89PNG":
        return "png"
    if head[:3] == b"\xff\xd8\xff":
        return "jpg"
    if head[:4] == b"RIFF" and b[8:12] == b"WEBP":
        return "webp"
    if head[:4] in (b"\x00\x00\x01\x00", b"\x00\x00\x02\x00"):
        return "ico"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if b[4:12] in (b"ftypavif", b"ftypavis"):
        return "avif"
    low = b[:4000].lower()
    if b"<svg" in low and b"<html" not in low[:200]:
        return "svg"
    return None


def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, timeout=60, **kw)


def raster(path, ext):
    """Rasterise to a 128x128 RGBA grid (fit, centred). Returns (pixels, (w, h)) or None."""
    with tempfile.TemporaryDirectory() as td:
        src = str(path)
        if ext == "svg":
            png = os.path.join(td, "r.png")
            p = run(["rsvg-convert", "-w", "512", "-h", "512", "-a", "-b", "none", src, "-o", png])
            if p.returncode != 0:
                p = run(["magick", "-background", "none", "-density", "200", src, png])
                if p.returncode != 0:
                    return None
            src = png
        elif ext == "ico":
            p = run(["magick", "identify", "-format", "%p %w\n", src])
            frames = [l.split() for l in p.stdout.decode(errors="ignore").splitlines() if l.strip()]
            if frames:
                best = max(frames, key=lambda f: int(f[1]))[0]
                src = f"{src}[{best}]"
        elif ext in ("gif", "webp", "avif"):
            src = f"{src}[0]"
        p = run(["magick", "identify", "-format", "%w %h\n", src])
        try:
            w, h = map(int, p.stdout.decode().split("\n")[0].split())
        except ValueError:
            return None
        p = run(["magick", src, "-background", "none", "-alpha", "on", "-resize", "128x128",
                 "-gravity", "center", "-extent", "128x128", "-depth", "8", "RGBA:-"])
        if p.returncode != 0 or len(p.stdout) != 128 * 128 * 4:
            return None
        return p.stdout, (w, h)


def analyse(path, ext, text=None):
    """Perceptual hash + shape/colour stats of an image file."""
    r = raster(path, ext)
    if not r:
        return None
    px, (w, h) = r
    N = 128
    A = [px[i * 4 + 3] / 255 for i in range(N * N)]
    L = [(0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255 for i in range(N * N)]
    S = [(max(px[i * 4:i * 4 + 3]) - min(px[i * 4:i * 4 + 3])) / 255 for i in range(N * N)]
    # canvas-relative: area of the fitted image inside the 128 grid
    opaque = [a > 0.9 for a in A]
    n_op = sum(opaque)
    vis = [a > 0.1 for a in A]
    n_vis = sum(vis) or 1
    # tile = an opaque (possibly rounded) background plate behind the mark
    vx = [i % N for i in range(N * N) if vis[i]]
    vy = [i // N for i in range(N * N) if vis[i]]
    fill = n_vis / max(1, (max(vx) - min(vx) + 1) * (max(vy) - min(vy) + 1)) if vx else 0
    opl = [L[i] for i in range(N * N) if opaque[i]]
    mu = sum(opl) / max(1, len(opl))
    sd = (sum((x - mu) ** 2 for x in opl) / max(1, len(opl))) ** 0.5
    # tile = an opaque (possibly rounded/circular) plate with contrasting content on it
    tile = n_op / n_vis > 0.85 and fill > 0.74 and sd > 0.12 and n_vis > 0.2 * N * N
    if tile:
        # background colour = median luminance of the border of the visible area
        border = [L[i] for i in range(N * N) if vis[i] and (i % N in (0, N - 1) or i // N in (0, N - 1)
                                                          or not vis[i - 1] or not vis[(i + 1) % (N * N)])]
        bl = sorted(border)[len(border) // 2] if border else 0
        ink = [A[i] * min(1, abs(L[i] - bl) * 4) for i in range(N * N)]
    else:
        bl = None
        ink = A
    xs = [i % N for i in range(N * N) if ink[i] > 0.25]
    if tile and len(xs) < 20:
        tile, bl, ink = False, None, A
        xs = [i % N for i in range(N * N) if ink[i] > 0.25]
    ys = [i // N for i in range(N * N) if ink[i] > 0.25]
    if not xs:
        return None
    x0, x1, y0, y1 = min(xs), max(xs) + 1, min(ys), max(ys) + 1
    bw, bh = x1 - x0, y1 - y0

    def cell(gx, gy, nx, ny):
        ax, bx = x0 + bw * gx / nx, x0 + bw * (gx + 1) / nx
        ay, by = y0 + bh * gy / ny, y0 + bh * (gy + 1) / ny
        tot = n = 0
        for y in range(int(ay), max(int(ay) + 1, int(by + 0.999))):
            for x in range(int(ax), max(int(ax) + 1, int(bx + 0.999))):
                if 0 <= x < N and 0 <= y < N:
                    tot += ink[y * N + x]
                    n += 1
        return tot / max(n, 1)

    grid = [[cell(gx, gy, 9, 8) for gx in range(9)] for gy in range(8)]
    dh = 0
    for gy in range(8):
        for gx in range(8):
            dh = (dh << 1) | (grid[gy][gx] > grid[gy][gx + 1])
    ah_grid = [cell(gx, gy, 8, 8) for gy in range(8) for gx in range(8)]
    mean = sum(ah_grid) / 64
    ahash = 0
    for v in ah_grid:
        ahash = (ahash << 1) | (v > mean)
    # luminance / saturation of the ink (what a viewer sees)
    wsum = sum(ink) or 1
    lum = sum(L[i] * ink[i] for i in range(N * N)) / wsum
    sat = sum(S[i] * ink[i] for i in range(N * N)) / wsum
    current_color = bool(text and "currentcolor" in text.lower()
                         and not re.search(r'fill="#(?!fff)[0-9a-f]{3,6}"', text.lower()))
    return dict(dhash=f"{dh:016x}", ahash=f"{ahash:016x}", aspect=round(bw / bh, 3),
                width=w, height=h, tile=tile, tile_lum=round(bl, 3) if bl is not None else None,
                lum=round(lum, 3), sat=round(sat, 3), current_color=current_color)


def ham(a, b):
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def same_design(a, b):
    ra = max(a["aspect"], b["aspect"]) / max(1e-3, min(a["aspect"], b["aspect"]))
    if ra > 1.25:
        return False
    return ham(a["dhash"], b["dhash"]) <= 10 and ham(a["ahash"], b["ahash"]) <= 12


def guess_variant(an):
    if an["current_color"]:
        return "any"
    if an["tile"]:
        return "any"  # carries its own background plate
    if an["lum"] >= 0.62 and an["sat"] < 0.35:
        return "dark"   # light ink -> meant for dark backgrounds
    if an["lum"] <= 0.45:
        return "light"  # dark ink -> meant for light backgrounds
    return "any"        # mid-tone / colourful: works on both


def guess_kind(name_hint, an, hint=None):
    n = (name_hint or "").lower()
    if hint in ("icon", "wordmark", "logo"):
        return hint
    if any(w in n for w in WORDMARK_WORDS):
        return "wordmark"
    if any(w in n for w in ICON_WORDS):
        return "icon"
    if an["aspect"] <= 1.6:
        return "icon"
    return "logo"


# ---------------------------------------------------------------- sightings
@dataclass
class Sighting:
    origin: str
    date: str               # first seen in this source (YYYY-MM-DD)
    source_url: str         # exact snapshot / commit / file page
    file_url: str           # direct URL of the file
    data: bytes
    name_hint: str = ""
    kind_hint: str | None = None
    variant_hint: str | None = None
    last_seen: str | None = None
    official: bool = False  # seen on the company's own site / API about its domain
    src_type: str = "other"
    src_title: str = ""
    publisher: str = ""
    note: str = ""
    ext: str = ""
    sha256: str = ""
    an: dict = field(default_factory=dict)


def ts_date(ts):
    return f"{ts[:4]}-{ts[4:6]}-{ts[6:8]}"


# ---------------------------------------------------------------- collectors
def c_contextdev(co, cfg, out):
    dom = cfg["domains"][0]
    body = {"type": "by_domain", "domain": dom, "timeoutOpts": {"milliseconds": 60000, "behavior": "return-partial"}}
    # hl's ctx cache key is sha1([method, path, body]); reuse any cached response for the domain
    p = subprocess.run([sys.executable, str(ROOT / "hl.py"), "ctx", "POST", "brand/retrieve", json.dumps(body)],
                       capture_output=True, text=True, cwd=ROOT)
    try:
        d = json.loads(p.stdout)
    except ValueError:
        print("   contextdev failed:", p.stdout[:200], p.stderr[:200])
        return
    b = d.get("brand") or {}
    out["_brand"] = b
    for lg in b.get("logos", []):
        r = fetch(lg["url"])
        if not r or r[0] != 200:
            continue
        mode = lg.get("mode")
        out["s"].append(Sighting(
            origin="contextdev", date=TODAY, last_seen=TODAY, official=True,
            source_url=lg["url"], file_url=lg["url"], data=r[3],
            name_hint=lg.get("type", ""), kind_hint="icon" if lg.get("type") == "icon" else None,
            variant_hint={"light": "light", "dark": "dark"}.get(mode),
            src_type="other", publisher="Context.dev",
            src_title=f"Context.dev brand/retrieve {dom}: {lg.get('type')} ({mode})",
            note=f"Context.dev {lg.get('type')} mode={mode} {lg.get('resolution', {})}"))


def name_re(names):
    alts = "|".join(re.escape(n) for n in sorted(names, key=len, reverse=True))
    return re.compile(rf"(?:^|/)(?:{alts})(?:[-_.@/]|$)", re.I)


_trees = {}


def repo_tree(repo, ref):
    if repo not in _trees:
        t = gh(f"repos/{repo}/git/trees/{ref}?recursive=1") or {}
        _trees[repo] = [x["path"] for x in t.get("tree", []) if x["type"] == "blob"]
    return _trees[repo]


def c_github_sets(co, cfg, out):
    rx = name_re(cfg["names"])
    for origin, repo, ref, prefixes in LOGO_REPOS:
        tree = repo_tree(repo, ref)
        paths = set()
        for pth in tree:
            if any(pth.startswith(pf) for pf in prefixes) and re.search(r"\.(svg|png)$", pth, re.I):
                rel = pth.split(prefixes[0] if pth.startswith(prefixes[0]) else prefixes[-1], 1)[-1]
                if rx.search("/" + rel):
                    paths.add(pth)
        # former paths: <prefix><name>.svg for names that no longer exist (renamed icons)
        for pf in prefixes[:1]:
            if origin in ("simple-icons", "gilbarbara"):
                for n in cfg["names"]:
                    paths.add(f"{pf}{n.replace('.', '').replace('-', '')}.svg")
        # vectorlogozone moved www/logos -> src/content/logos: mirror discovered paths
        if origin == "vectorlogozone":
            for pth in list(paths):
                if pth.startswith("src/content/logos/"):
                    paths.add(pth.replace("src/content/logos/", "www/logos/", 1))
        for pth in sorted(paths):
            commits = gh(f"repos/{repo}/commits?path={quote(pth)}&per_page=100") or []
            if not commits:
                continue
            commits = sorted(commits, key=lambda c: c["commit"]["committer"]["date"])
            prev_sha = None
            versions = []
            for c in commits:
                sha = c["sha"]
                r = fetch(f"https://raw.githubusercontent.com/{repo}/{sha}/{quote(pth)}", gap=0.05)
                if not r or r[0] != 200 or not r[3]:
                    continue  # deleted in this commit
                h = hashlib.sha256(r[3]).hexdigest()
                if h == prev_sha:
                    continue
                prev_sha = h
                versions.append((c, r[3]))
            for i, (c, data) in enumerate(versions):
                cd = c["commit"]["committer"]["date"][:10]
                nxt = versions[i + 1][0]["commit"]["committer"]["date"][:10] if i + 1 < len(versions) else None
                at_head = nxt is None and pth in tree
                fname = pth.rsplit("/", 1)[-1]
                out["s"].append(Sighting(
                    origin=origin, date=cd, last_seen=nxt or (TODAY if at_head else cd),
                    source_url=f"https://github.com/{repo}/blob/{c['sha']}/{pth}",
                    file_url=f"https://raw.githubusercontent.com/{repo}/{c['sha']}/{pth}", data=data,
                    name_hint=pth, kind_hint=("icon" if origin == "simple-icons" else None),
                    variant_hint=("dark" if re.search(r"(_dark|-dark|white|_light-on|darkmode)", fname, re.I)
                                  and origin == "svgl" else None),
                    src_type="github", publisher="GitHub", src_title=f"{repo}: {pth} @ {c['sha'][:7]} — "
                    + c["commit"]["message"].split("\n")[0][:120],
                    note=f"{origin} {pth} commit {c['sha'][:10]} ({cd})"))


def wiki_api(host, **params):
    params.update(format="json", action="query", formatversion="2")
    q = "&".join(f"{k}={quote(str(v))}" for k, v in sorted(params.items()))
    return fetch_json(f"https://{host}/w/api.php?{q}", headers={"User-Agent": UA + " bouchezalexis1@gmail.com"})


def c_commons(co, cfg, out):
    titles = list(cfg.get("commons", []))
    if cfg.get("wikipedia"):
        d = wiki_api("en.wikipedia.org", titles=cfg["wikipedia"], redirects=1, prop="pageimages", piprop="name")
        for pg in (d or {}).get("query", {}).get("pages", []):
            if pg.get("pageimage"):
                titles.append("File:" + pg["pageimage"].replace("_", " "))
    seen = set()
    for t in dict.fromkeys(titles):
        for host in ("commons.wikimedia.org", "en.wikipedia.org"):
            d = wiki_api(host, titles=t, prop="imageinfo", iiprop="timestamp|url|comment|sha1|size|user|extmetadata",
                         iilimit=50, iiextmetadatafilter="LicenseShortName|Artist|Credit")
            pages = (d or {}).get("query", {}).get("pages", [])
            if not pages or pages[0].get("missing") and not pages[0].get("imageinfo"):
                continue
            pg = pages[0]
            ii = pg.get("imageinfo") or []
            if not ii or pg.get("imagerepository") == "shared" and host != "commons.wikimedia.org":
                continue  # en.wikipedia only mirrors Commons files: use the Commons copy
            revs = sorted(ii, key=lambda x: x["timestamp"])
            for i, rv in enumerate(revs):
                if not rv.get("url") or rv.get("sha1") in seen:
                    continue
                seen.add(rv.get("sha1"))
                r = fetch(rv["url"], headers={"User-Agent": UA + " bouchezalexis1@gmail.com"})
                if not r or r[0] != 200:
                    continue
                lic = (rv.get("extmetadata", {}).get("LicenseShortName") or {}).get("value", "")
                nxt = revs[i + 1]["timestamp"][:10] if i + 1 < len(revs) else TODAY
                page_url = f"https://{host}/wiki/{quote(t.replace(' ', '_'))}"
                out["s"].append(Sighting(
                    origin="commons" if host.startswith("commons") else "wikipedia",
                    date=rv["timestamp"][:10], last_seen=nxt, source_url=rv["url"], file_url=rv["url"],
                    data=r[3], name_hint=t, src_type="wikipedia", publisher="Wikimedia Commons"
                    if host.startswith("commons") else "Wikipedia",
                    src_title=f"{t} — upload {rv['timestamp'][:10]} by {rv.get('user', '?')}: {rv.get('comment', '')[:100]}",
                    note=f"{t} revision {rv['timestamp']} (licence: {lic or '?'}; page {page_url})"))


# ---- Wayback
def window(cfg, dom):
    """CDX from/to for the period the company owned the domain (cfg windows: 'YYYYMM[-YYYYMM]')."""
    w = (cfg.get("windows") or {}).get(dom)
    if not w:
        return {}
    a, _, b = w.partition("-")
    return {"from": a, **({"to": b} if b else {})}


def cdx(params):
    q = "&".join(f"{k}={quote(str(v), safe=':/*.,|()')}" if not isinstance(v, list) else
                 "&".join(f"{k}={quote(str(x), safe=':/*.,|()')}" for x in v) for k, v in params.items())
    d = fetch_json(f"https://web.archive.org/cdx/search/cdx?output=json&{q}")
    return d[1:] if d else []


SVG_RE = re.compile(r"<svg\b[^>]*>.*?</svg>", re.S | re.I)
IMG_RE = re.compile(r"<img\b[^>]*>", re.I)
LINK_RE = re.compile(r"<link\b[^>]*>", re.I)
META_RE = re.compile(r"<meta\b[^>]*>", re.I)


def attr(tag, name):
    m = re.search(rf'\b{name}\s*=\s*("([^"]*)"|\'([^\']*)\'|([^\s>]+))', tag, re.I)
    return unescape(m.group(2) or m.group(3) or m.group(4) or "") if m else None


def enclosing_a(html, pos):
    ctx = html[max(0, pos - 1500):pos]
    a = ctx.lower().rfind("<a ")
    if a == -1 or "</a>" in ctx[a:].lower():
        return ""
    return ctx[a:ctx.find(">", a) + 1]


def home_href(href, domains):
    if href is None:
        return False
    h = href.strip().lower().rstrip("/")
    if h in ("", ".", "/en", "/fr", "/home", "#"):
        return True
    for d in domains:
        if re.fullmatch(rf"(https?:)?//(www\.)?{re.escape(d)}(/(en|fr|home))?", h):
            return True
    if "web.archive.org/web/" in h:
        return home_href(h.split("/", 5)[-1] if h.count("/") >= 5 else "", domains)
    return False


def header_logo(html, names, domains):
    """Best guess at the site's header logo: ('svg', markup) or ('img', src) or None."""
    best, best_score = None, 0
    n_html = max(len(html), 1)
    for m in SVG_RE.finditer(html):
        s = m.group(0)
        if len(s) > 60000 or not re.search(r"<(path|polygon|rect|circle|use)\b", s, re.I):
            continue
        open_tag = s[:s.find(">") + 1].lower()
        head = s[:600].lower()
        score = 0
        if any(n in open_tag for n in names) or re.search(r"<title>[^<]*(" + "|".join(map(re.escape, names)) + ")", head):
            score += 5
        if "logo" in open_tag:
            score += 4
        a = enclosing_a(html, m.start()).lower()
        if a:
            if home_href(attr(a, "href"), domains):
                score += 3
            if "logo" in a or any(n in a for n in names):
                score += 3
        if re.search(r"<use\b", s) and not re.search(r"<path\b", s):
            score -= 2
        if m.start() / n_html < 0.35:
            score += 1
        if score > best_score:
            best, best_score = ("svg", s), score
    for m in IMG_RE.finditer(html):
        t = m.group(0)
        src = attr(t, "src") or ""
        if not src or src.startswith("data:") and len(src) < 100:
            continue
        alt = (attr(t, "alt") or "").lower()
        cls = (attr(t, "class") or "").lower()
        base = unquote(src.lower().split("?")[0].rsplit("/", 1)[-1])
        a = enclosing_a(html, m.start()).lower()
        in_home = bool(a) and home_href(attr(a, "href"), domains)
        logo_term = "logo" in alt or "logo" in base or "logo" in cls or "wordmark" in base or "brand" in cls
        name_alt = any(re.fullmatch(rf"{re.escape(n)}( (logo|home|homepage|ai))?", alt.strip()) for n in names)
        name_src = any(n in base for n in names)
        if not (logo_term or (in_home and (name_alt or name_src))):
            continue  # screenshots and illustrations that merely mention the company
        score = 4 * logo_term + 4 * name_alt + 2 * name_src + 3 * in_home
        if m.start() / n_html < 0.35:
            score += 1
        if score > best_score:
            best, best_score = ("img", src), score
    return best if best_score >= 5 else None


def svg_standalone(s):
    if "xmlns=" not in s[:500]:
        s = s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"', 1)
    if "xlink:" in s and "xmlns:xlink" not in s[:800]:
        s = s.replace("<svg", '<svg xmlns:xlink="http://www.w3.org/1999/xlink"', 1)
    return s


def svg_geom_key(s):
    geo = re.findall(r'\b(?:d|points|viewBox)\s*=\s*"([^"]+)"', s)
    return hashlib.sha256(re.sub(r"\s+", " ", "|".join(geo)).encode()).hexdigest()[:16]


def wb_url(ts, url, mode="id_"):
    return f"https://web.archive.org/web/{ts}{mode}/{url}"


def unwrap_wayback(src):
    m = re.match(r"(?:https?:)?//web\.archive\.org/web/\d+[a-z_]*/(.*)", src)
    if m:
        u = m.group(1)
        return u if u.startswith("http") else "http://" + u
    if src.startswith("/web/"):
        return unwrap_wayback("https://web.archive.org" + src)
    return src


def c_wayback_home(co, cfg, out, budget):
    names = cfg["names"]
    for dom in cfg["domains"]:
        rows = cdx({"url": dom, "fl": "timestamp,original,statuscode,mimetype", "collapse": "timestamp:6",
                    "filter": ["statuscode:200", "mimetype:text/html"], **window(cfg, dom)})
        if not rows:
            continue
        snaps = [(r[0], r[1]) for r in rows]
        print(f"   wayback {dom}: {len(snaps)} monthly captures {snaps[0][0][:6]}..{snaps[-1][0][:6]}")
        results = {}

        def probe(i):
            if i in results:
                return results[i]
            ts, orig = snaps[i]
            r = fetch(wb_url(ts, orig))
            res = None
            if r and r[0] == 200:
                html = r[3].decode("utf-8", "replace")
                lg = header_logo(html, names, cfg["domains"])
                icons = []
                for t in LINK_RE.findall(html):
                    rel = (attr(t, "rel") or "").lower()
                    if "icon" in rel and attr(t, "href"):
                        icons.append(urljoin(orig, unwrap_wayback(attr(t, "href"))))
                og = None
                for t in META_RE.findall(html):
                    if (attr(t, "property") or attr(t, "name") or "").lower() in ("og:image", "twitter:image"):
                        og = attr(t, "content")
                        break
                if lg and lg[0] == "svg":
                    res = dict(key="svg:" + svg_geom_key(lg[1]), svg=lg[1], icons=icons, og=og)
                elif lg:
                    src = urljoin(orig, unwrap_wayback(lg[1]))
                    res = dict(key="img:" + urlparse(src).path, img=src, icons=icons, og=og)
                else:
                    res = dict(key=None, icons=icons, og=og)
                res["ts"], res["orig"] = ts, orig
            results[i] = res
            return res

        n = len(snaps)
        step = max(1, n // max(1, budget // 2))
        idx = sorted(set(list(range(0, n, step)) + [n - 1]))
        for i in idx:
            probe(i)
        # bisect between samples whose header logo differs
        fetched = len(idx)
        changed = True
        while changed and fetched < budget:
            changed = False
            keys = sorted(results)
            for a, b in zip(keys, keys[1:]):
                ka = (results[a] or {}).get("key")
                kb = (results[b] or {}).get("key")
                if b - a > 1 and ka != kb and fetched < budget:
                    probe((a + b) // 2)
                    fetched += 1
                    changed = True
        # turn into sightings: runs of identical key
        keys = sorted(i for i in results if results[i])
        runs = {}
        for i in keys:
            r = results[i]
            if r["key"]:
                runs.setdefault(r["key"], []).append(r)
            for ic in r["icons"]:
                out["icon_urls"].add(ic)
            if r.get("og"):
                out["og"].append((r["ts"], r["og"]))
        timeline = [(results[i]["ts"][:6], results[i]["key"]) for i in keys]
        out["timeline"][dom] = timeline
        for key, rs in runs.items():
            first, last = rs[0], rs[-1]
            snap = wb_url(first["ts"], first["orig"], "")
            if "svg" in first:
                data = svg_standalone(first["svg"]).encode()
                furl = snap
            else:
                r = fetch(wb_url(first["ts"], first["img"], "im_"))
                if not r or r[0] != 200:
                    continue
                data, furl = r[3], r[1]
            out["s"].append(Sighting(
                origin="wayback", date=ts_date(first["ts"]), last_seen=ts_date(last["ts"]), official=True,
                source_url=snap, file_url=furl, data=data, name_hint="header-logo " + (first.get("img") or ""),
                src_type="wayback", publisher="Internet Archive",
                src_title=f"{dom} homepage, Wayback capture {ts_date(first['ts'])}",
                note=f"header logo on {dom} homepage; sampled captures {ts_date(first['ts'])} → {ts_date(last['ts'])}"))


LOGOISH = re.compile(r"^(favicon|apple-touch-icon|android-chrome|icon|logo|logomark|logotype|wordmark|mark|brand)"
                     r"([-_.@0-9x]|$)", re.I)


def c_wayback_files(co, cfg, out, max_urls=30):
    names = cfg["names"]
    urls = {}
    for dom in cfg["domains"]:
        for p in ("favicon.ico", "favicon.png", "favicon.svg", "apple-touch-icon.png", "icon.svg"):
            urls[f"{dom}/{p}"] = 0
    for u in out["icon_urls"]:
        urls[re.sub(r"^https?://(www\.)?", "", u)] = 1
    for u in out.get("brand_urls", []):
        urls[re.sub(r"^https?://(www\.)?", "", u)] = 1
    # discovery: logo-like image files ever archived under the company domains
    for dom in cfg["domains"]:
        rows = cdx({"url": f"{dom}/", "matchType": "prefix", "fl": "original,mimetype", "collapse": "urlkey",
                    "filter": ["mimetype:image/.*", "statuscode:200"], "limit": 30000, **window(cfg, dom)})
        for orig, mime in rows:
            u = re.sub(r"^https?://(www\.)?", "", orig)
            path = urlparse("http://" + u).path
            seg = unquote(path.rsplit("/", 1)[-1]).lower()
            if "_next/image" in u or "/blog/" in path or "/customers/" in path or "/docs/" in path:
                continue
            if re.search(r"(screenshot|opengraph|og[-_.]|og$|twitter|banner|hero|preview|social|header-bg|background)", seg):
                continue
            nm = any(n in seg for n in names) and (re.search(r"(logo|mark|icon|wordmark|brand|symbol|type|light|dark|black|white)", seg)
                                                   or re.fullmatch(rf"({'|'.join(map(re.escape, names))})\.(svg|png)", seg))
            if nm or LOGOISH.match(seg) and path.count("/") <= 3:
                urls.setdefault(u.split("?")[0], 2)
    # one URL per size family (favicon@57x57.png, favicon@180x180.png -> keep the largest)
    fam = {}
    for u in urls:
        key = re.sub(r"[-_@]?\d{2,4}x\d{2,4}|@\dx", "", u.split("?")[0].lower())
        size = max([int(x) for x in re.findall(r"(\d{2,4})x\d{2,4}", u)] or [0])
        if key not in fam or size > fam[key][1]:
            fam[key] = (u, size)
    urls = {u: urls[u] for u, _ in fam.values()}
    picked = sorted(urls, key=lambda u: (urls[u], len(u)))[:max_urls]
    print(f"   wayback files: {len(urls)} candidate URLs, checking {len(picked)}")
    for u in picked:
        host = re.sub(r"^www\.", "", u.split("/")[0])
        rows = cdx({"url": u, "fl": "timestamp,original,digest,mimetype", "filter": ["statuscode:200"], "limit": 5000,
                    **window(cfg, host)})
        rows = [r for r in rows if r[3].startswith("image/") or r[3] in ("application/octet-stream", "text/xml",
                                                                          "application/xml", "text/plain")]
        by_digest = {}
        for ts, orig, dg, mime in rows:
            e = by_digest.setdefault(dg, [ts, ts, orig])
            e[0], e[1] = min(e[0], ts), max(e[1], ts)
        for dg, (t0, t1, orig) in sorted(by_digest.items(), key=lambda x: x[1][0])[:12]:
            r = fetch(wb_url(t0, orig))
            if not r or r[0] != 200 or not r[3]:
                continue
            seg = urlparse(orig).path.rsplit("/", 1)[-1]
            out["s"].append(Sighting(
                origin="wayback", date=ts_date(t0), last_seen=ts_date(t1), official=True,
                source_url=wb_url(t0, orig, ""), file_url=wb_url(t0, orig, "im_"), data=r[3],
                name_hint=seg, kind_hint="icon" if re.search(r"favicon|apple-touch|android-chrome|^icon", seg, re.I) else None,
                variant_hint=("dark" if re.search(r"(dark|white)", seg, re.I) else
                              "light" if re.search(r"(light|black)", seg, re.I) else None),
                src_type="wayback", publisher="Internet Archive",
                src_title=f"{u} — Wayback capture {ts_date(t0)}",
                note=f"{u}: this content (CDX digest {dg[:8]}) archived {ts_date(t0)} → {ts_date(t1)}"))


def c_brand(co, cfg, out):
    rx = name_re(cfg["names"])
    out.setdefault("brand_urls", [])
    for page in cfg.get("brand", []):
        r = fetch(page, cache=True)
        if not r or r[0] != 200:
            continue
        html = r[3].decode("utf-8", "replace")
        cands = set()
        for m in re.finditer(r'(?:src|href|srcset|data-src)\s*=\s*["\']([^"\']+)["\']', html, re.I):
            for part in m.group(1).split(","):
                u = part.strip().split(" ")[0]
                if re.search(r"\.(svg|png|webp)(\?|$)", u, re.I):
                    cands.add(urljoin(r[1], unescape(u)))
        for m in re.finditer(r'https?://[^"\'\s)]+\.(?:svg|png)', html):
            cands.add(m.group(0))
        named = {u for u in cands if rx.search("/" + unquote(urlparse(u).path.rsplit("/", 1)[-1]).lower())}
        if named:
            cands = named  # the page names the company's own files: ignore sibling brands (Next.js, Turbo...)
        # responsive variants of one image (foo_AbC12.webp, foo@2x.png): keep one per stem, prefer svg
        stems = {}
        for u in sorted(cands):
            seg = unquote(urlparse(u).path.rsplit("/", 1)[-1]).lower()
            stem = re.sub(r"(_[a-z0-9]{4,8}|@\dx|-\d+x\d+)?\.(svg|png|webp)$", "", seg)
            prev = stems.get(stem)
            if prev is None or (u.lower().split("?")[0].endswith(".svg") and not prev.lower().split("?")[0].endswith(".svg")):
                stems[stem] = u
        for u in sorted(stems.values()):
            seg = unquote(urlparse(u).path.rsplit("/", 1)[-1]).lower()
            if re.search(r"(misus|misuag|guidance|cover|clear-?space|example|mockup|usage|dont|do-not|incorrect|model|illustration|pattern)", seg):
                continue
            if "_next/image" in u:
                inner = re.search(r"url=([^&]+)", u)
                if not inner:
                    continue
                seg = unquote(inner.group(1)).rsplit("/", 1)[-1].lower()
            if not (rx.search("/" + seg) or re.search(r"(logo|wordmark|logotype|symbol|logomark|icon)", seg)):
                continue
            if re.search(r"(og-image|opengraph|twitter|banner|screenshot|avatar-|/people/)", u, re.I):
                continue
            f = fetch(u)
            if not f or f[0] != 200 or not sniff_ext(f[3]):
                continue
            out["brand_urls"].append(u)
            out["s"].append(Sighting(
                origin="brand", date=TODAY, last_seen=TODAY, official=True, source_url=page, file_url=u,
                data=f[3], name_hint=seg,
                variant_hint=("dark" if re.search(r"(dark|white|inverse|reversed)", seg) else
                              "light" if re.search(r"(light|black)", seg) else None),
                src_type="website", publisher=urlparse(page).netloc, src_title=f"{page} (brand assets)",
                note=f"official brand page asset {seg}"))


def c_avatars(co, cfg, out):
    for org in cfg.get("github_orgs", []):
        u = gh(f"users/{org}")
        if not u or not u.get("avatar_url"):
            continue
        r = fetch(u["avatar_url"] + ("&" if "?" in u["avatar_url"] else "?") + "s=460")
        if r and r[0] == 200:
            out["s"].append(Sighting(origin="github-avatar", date=TODAY, last_seen=TODAY, official=True,
                                     source_url=f"https://github.com/{org}", file_url=r[1], data=r[3],
                                     name_hint="avatar", kind_hint="icon", src_type="github", publisher="GitHub",
                                     src_title=f"GitHub @{org} avatar", note=f"GitHub org @{org} avatar ({TODAY})"))
    for h in cfg.get("bsky", []):
        p = fetch_json(f"https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor={h}", cache=False)
        if not p or not p.get("avatar"):
            continue
        r = fetch(p["avatar"])
        if r and r[0] == 200:
            out["s"].append(Sighting(origin="bluesky-avatar", date=TODAY, last_seen=TODAY, official=True,
                                     source_url=f"https://bsky.app/profile/{h}", file_url=p["avatar"], data=r[3],
                                     name_hint="avatar", kind_hint="icon", src_type="bluesky", publisher="Bluesky",
                                     src_title=f"Bluesky @{h} avatar", note=f"Bluesky @{h} avatar ({TODAY})"))
    for h in cfg.get("x", []):
        r = fetch(f"https://unavatar.io/x/{h}?fallback=false")
        if r and r[0] == 200 and sniff_ext(r[3]):
            out["s"].append(Sighting(origin="x-avatar", date=TODAY, last_seen=TODAY, official=True,
                                     source_url=f"https://x.com/{h}", file_url=f"https://unavatar.io/x/{h}",
                                     data=r[3], name_hint="avatar", kind_hint="icon", src_type="tweet",
                                     publisher="X", src_title=f"X @{h} profile picture",
                                     note=f"X @{h} avatar via unavatar.io ({TODAY})"))


# ---------------------------------------------------------------- clustering + registration
def hl_write(cmd, items, dry):
    if dry or not items:
        return {"ok": True, "dry": True}
    p = subprocess.run([sys.executable, str(ROOT / "hl.py"), cmd], input=json.dumps(items),
                       capture_output=True, text=True, cwd=ROOT)
    try:
        res = json.loads(p.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        res = {"ok": False, "error": p.stdout + p.stderr}
    if not res.get("ok"):
        print(f"   ! hl {cmd} failed: {res}")
    return res


def prepare(s, files_dir):
    s.ext = sniff_ext(s.data) or ""
    if not s.ext:
        return False
    s.sha256 = hashlib.sha256(s.data).hexdigest()
    p = files_dir / f"{s.sha256}.{s.ext}"
    if not p.exists():
        p.write_bytes(s.data)
    an = analyse(p, s.ext, s.data.decode("utf-8", "ignore") if s.ext == "svg" else None)
    if not an:
        return False
    s.an = an
    return True


def precision(d):
    return len(d or "")


def dmin(a, b):
    if not a:
        return b
    if not b:
        return a
    # "2023" vs "2023-05-01": compare on common prefix, keep the more precise when equal
    if a[:len(b)] == b[:len(a)]:
        return a if len(a) >= len(b) else b
    return min(a, b)


def dmax(a, b):
    if not a:
        return b
    if not b:
        return a
    return max(a, b)


ORIGIN_RANK = {"brand": 0, "contextdev": 1, "wayback": 2, "existing": 2, "commons": 3, "wikipedia": 3,
               "svgl": 4, "gilbarbara": 5, "vectorlogozone": 5, "lobe-icons": 6, "simple-icons": 7,
               "github-avatar": 8, "bluesky-avatar": 8, "x-avatar": 9}


def pick_rep(members):
    def score(s):
        vec = 0 if s.ext == "svg" else 1
        return (ORIGIN_RANK.get(s.origin, 9) > 3, vec, ORIGIN_RANK.get(s.origin, 9),
                -(s.an["width"] * s.an["height"]), s.date)
    return sorted(members, key=score)[0]


def process(co, cfg, args):
    files_dir = RAW / co / "files"
    files_dir.mkdir(parents=True, exist_ok=True)
    out = {"s": [], "icon_urls": set(), "og": [], "timeline": {}}
    only = set(args.only.split(",")) if args.only else None

    def on(name):
        return only is None or name in only

    if on("contextdev") and not args.no_contextdev:
        print(" * contextdev"); c_contextdev(co, cfg, out)
    if on("github"):
        print(" * github logo sets"); c_github_sets(co, cfg, out)
    if on("commons"):
        print(" * commons"); c_commons(co, cfg, out)
    if on("brand"):
        print(" * brand pages"); c_brand(co, cfg, out)
    if on("wayback"):
        print(" * wayback homepage"); c_wayback_home(co, cfg, out, args.wayback_budget)
        print(" * wayback files"); c_wayback_files(co, cfg, out)
    if on("avatar"):
        print(" * avatars"); c_avatars(co, cfg, out)

    sightings = [s for s in out["s"] if prepare(s, files_dir)]
    print(f" {len(out['s'])} sightings, {len(sightings)} usable images, "
          f"{len({s.sha256 for s in sightings})} distinct files")

    # existing assets join the pool so they get matched/backfilled
    existing = list(db.assets.find({"company": co}))
    ex_by_sha = {}
    for a in existing:
        lp = a.get("local_path")
        if not lp or not (ROOT / lp).exists() or a.get("kind") not in ("logo", "wordmark", "icon"):
            continue
        if re.search(r"parody|joke|not (vercel|the|their)[^.]*real|fake", a.get("description") or "", re.I):
            continue  # documented non-logos stay as they are
        data = (ROOT / lp).read_bytes()
        s = Sighting(origin=a.get("origin") or "existing", date=a.get("date") or "", last_seen=a.get("last_seen"),
                     source_url=a["source_url"], file_url=a.get("url") or "", data=data,
                     name_hint=lp, kind_hint=None, variant_hint=a.get("variant"), official=True)
        if not prepare(s, files_dir):
            continue
        s.note = "existing:" + a["_id"]
        ex_by_sha.setdefault(s.sha256, []).append(a)
        sightings.append(s)

    # 1. cluster into designs
    designs = []
    for s in sorted(sightings, key=lambda s: s.date or "9999"):
        for d in designs:
            if same_design(d[0].an, s.an):
                d.append(s)
                break
        else:
            designs.append([s])
    designs.sort(key=lambda d: min(x.date or "9999" for x in d))

    # 2. split each design by (kind, variant) -> assets
    assets = []
    for di, members in enumerate(designs):
        did = f"{co}-d{di + 1:02d}"
        groups = {}
        for s in members:
            # measured ink beats file-name hints ("-dark" means dark-coloured in some kits, dark-mode in others)
            g = guess_variant(s.an)
            decisive = not s.an["tile"] and not s.an["current_color"] and (s.an["lum"] <= 0.45 or
                                                                            (s.an["lum"] >= 0.62 and s.an["sat"] < 0.35))
            v = g if decisive or not s.variant_hint else s.variant_hint
            k = guess_kind(s.name_hint, s.an, s.kind_hint)
            s.an["variant"], s.an["kind"] = v, k
        # kind of the design = majority vote of members (avoid icon/logo splits of one design)
        votes = {}
        for s in members:
            votes[s.an["kind"]] = votes.get(s.an["kind"], 0) + (2 if s.kind_hint else 1)
        dkind = max(votes, key=votes.get)
        for s in members:
            groups.setdefault(s.an["variant"], []).append(s)
        for v, ms in groups.items():
            assets.append(dict(design=did, kind=dkind, variant=v, members=ms))

    # 3. report + registration
    assets_dir = ROOT / "data/assets" / co
    assets_dir.mkdir(parents=True, exist_ok=True)
    report = {"company": co, "run": TODAY, "designs": [], "timeline": out["timeline"], "og_images": out["og"][:50]}
    src_items, asset_items, deletes = {}, [], []
    for a in assets:
        ms = a["members"]
        rep = pick_rep([m for m in ms if not m.note.startswith("existing:")] or ms)
        first = min(ms, key=lambda m: (m.date or "9999"))
        date_ = None
        for m in ms:
            date_ = dmin(date_, m.date)
        last = None
        for m in ms:
            last = dmax(last, m.last_seen or m.date)
        official = [m for m in ms if m.official]
        sightings_l = sorted({(m.origin, m.date, m.last_seen or "", m.source_url, m.file_url, m.sha256[:12]) for m in ms})
        ex_docs = [d for m in ms if m.note.startswith("existing:") for d in ex_by_sha.get(m.sha256, [])]
        ex_docs = list({d["_id"]: d for d in ex_docs}.values())
        desc_bits = [f"{a['kind']} ({a['variant']}), design {a['design']}",
                     f"seen {date_} → {last}",
                     "sources: " + ", ".join(sorted({m.origin for m in ms}))]
        entry = dict(design=a["design"], kind=a["kind"], variant=a["variant"], date=date_, last_seen=last,
                     sha256=rep.sha256, rep_origin=rep.origin, files=len({m.sha256 for m in ms}),
                     dhash=rep.an["dhash"], aspect=rep.an["aspect"], lum=rep.an["lum"],
                     official_first=min((m.date for m in official), default=None),
                     sightings=[dict(origin=o, date=d, last_seen=l, url=u, file=f, sha=h) for o, d, l, u, f, h in sightings_l][:40],
                     existing=[d["_id"] for d in ex_docs])
        report["designs"].append(entry)
        # where to keep the representative file
        fn = f"{a['design']}-{a['kind']}-{a['variant']}-{(date_ or 'undated')[:7]}-{rep.origin}-{rep.sha256[:8]}.{rep.ext}"
        local = assets_dir / fn
        if not local.exists() and not args.dry_run:
            shutil.copyfile(files_dir / f"{rep.sha256}.{rep.ext}", local)
        rel_local = str(local.relative_to(ROOT))
        # the source that proves the first sighting, plus the representative's own
        for m in {first.source_url: first, rep.source_url: rep}.values():
            if m.note.startswith("existing:"):
                continue
            src_items[m.source_url] = dict(url=m.source_url, type=m.src_type, title=m.src_title or m.note,
                                           publisher=m.publisher, published_at=m.date, excerpt=m.note,
                                           raw_path=str((files_dir / f"{m.sha256}.{m.ext}").relative_to(ROOT)))
        fields = dict(company=co, kind=a["kind"], variant=a["variant"], date=date_, last_seen=last,
                      sha256=rep.sha256, design=a["design"], origin=rep.origin,
                      dhash=rep.an["dhash"], aspect=rep.an["aspect"],
                      sightings=entry["sightings"], logos_run=TODAY)
        if ex_docs:
            # backfill the existing record(s); keep their url/description/source, re-key if kind changes
            for d in ex_docs:
                upd = {k: v for k, v in d.items() if k != "_id"}
                upd.update({k: v for k, v in fields.items() if k not in ("origin",)})
                upd["origin"] = d.get("origin") or ("wayback" if "web.archive.org" in (d.get("source_url") or "")
                                                     else urlparse(d.get("source_url") or "").netloc or "manual")
                own = next((m for m in ms if m.note == "existing:" + d["_id"]), None)
                if own:
                    upd["sha256"] = own.sha256
                    upd["local_path"] = d.get("local_path")
                upd["date"] = dmin(d.get("date"), date_)
                upd.setdefault("source_url", first.source_url)
                asset_items.append(upd)
                new_id = hl.sid(f"{co}|{upd['kind']}|{upd.get('url') or upd.get('local_path')}")
                if new_id != d["_id"]:
                    deletes.append((d["_id"], f"re-keyed by logos.py: kind {d.get('kind')} -> {upd['kind']} (now {new_id})"))
        else:
            asset_items.append(dict(fields, url=rep.file_url, local_path=rel_local, source_url=first.source_url
                                    if first.source_url in src_items else rep.source_url,
                                    first_seen_url=first.source_url,
                                    description=(f"{a['kind'].capitalize()} for {a['variant']} backgrounds"
                                                 if a['variant'] != 'any' else f"{a['kind'].capitalize()} (any background)")
                                    + f"; {rep.note}. " + "; ".join(desc_bits)))
        if ex_docs and (local.exists() and not any(d.get("local_path") == rel_local for d in ex_docs)):
            local.unlink(missing_ok=True)  # the existing file already represents it
    # one uniform monochrome icon per company (for logo rows): simple-icons at HEAD
    uni = uniform_icon(co, sightings)
    if uni:
        s, slug, meta = uni
        lp = assets_dir / f"simple-icons-{slug}.svg"
        if not args.dry_run:
            lp.write_bytes(s.data)
        src_items[s.source_url] = dict(url=s.source_url, type="github", title=s.src_title, publisher="GitHub",
                                       published_at=s.date, excerpt=s.note,
                                       raw_path=str((files_dir / f"{s.sha256}.svg").relative_to(ROOT)))
        asset_items.append(dict(
            company=co, kind="icon", variant="light", monochrome=True, role="uniform-icon", origin="simple-icons",
            simple_icons_slug=slug, simple_icons_version=meta.get("version"), simple_icons_commit=s.source_url.split("/")[6],
            brand_hex=meta.get("hex"), icon_source=meta.get("source"), license=meta.get("license") or "CC0-1.0 (simple-icons)",
            url=f"https://api.iconify.design/simple-icons/{slug}.svg", local_path=str(lp.relative_to(ROOT)),
            source_url=s.source_url, date=s.date, last_seen=s.last_seen, sha256=s.sha256,
            design=next((e["design"] for e in report["designs"] if any(x["sha"] == s.sha256[:12] for x in e["sightings"])), None),
            description=f"Uniform monochrome icon from simple-icons ({slug}, v{meta.get('version')}), single-path 24x24 SVG "
                        f"meant to be tinted (brand hex #{meta.get('hex')}). Same file as Iconify simple-icons:{slug}.",
            logos_run=TODAY))
        report["uniform_icon"] = dict(slug=slug, sha256=s.sha256, commit=s.source_url, **meta)
        print(f"   uniform icon: simple-icons/{slug} v{meta.get('version')} #{meta.get('hex')} ({s.date})")
    else:
        print("   uniform icon: none in simple-icons (gap)")
    # exact duplicates among existing records (same sha256, same kind)
    for sha, docs in ex_by_sha.items():
        if len(docs) > 1:
            keep = sorted(docs, key=lambda d: (d.get("date") or "9999"))[0]
            for d in docs:
                if d["_id"] != keep["_id"]:
                    deletes.append((d["_id"], f"exact duplicate (sha256 {sha[:12]}) of asset {keep['_id']}"))

    # print summary
    print(f"\n {co}: {len(designs)} designs, {len(assets)} assets")
    for e in report["designs"]:
        print(f"   {e['design']} {e['kind']:8} {e['variant']:5} {e['date'] or '?':10} → {e['last_seen'] or '?':10} "
              f"files={e['files']:2} rep={e['rep_origin']:13} origins={sorted({x['origin'] for x in e['sightings']})}"
              + (f" existing={e['existing']}" if e["existing"] else ""))
    for dom, tl in out["timeline"].items():
        compact = []
        for ym, k in tl:
            if not compact or compact[-1][1] != k:
                compact.append([ym, k, ym])
            else:
                compact[-1][2] = ym
        print(f"   header logo {dom}: " + " | ".join(f"{a}-{c}:{(k or 'none')[:12]}" for a, k, c in compact))
    (RAW / co).mkdir(parents=True, exist_ok=True)
    contact_sheet(co, report, files_dir)
    (RAW / co / "report.json").write_text(json.dumps(report, indent=1, default=str))

    if args.dry_run:
        print(" (dry run: nothing written)")
        return report
    hl_write("source", list(src_items.values()), False)
    res = hl_write("asset", asset_items, False)
    if res.get("ok"):
        written = set(res.get("ids", []))
        for _id, why in deletes:
            if _id in written:
                continue
            if db.assets.find_one({"_id": _id}):
                subprocess.run([sys.executable, str(ROOT / "hl.py"), "delete", "assets", _id, why], cwd=ROOT,
                               capture_output=True)
                print(f"   deleted {_id}: {why}")
    # drop representative files of earlier runs that no asset references any more
    used = {a.get("local_path") for a in db.assets.find({"company": co}, {"local_path": 1})}
    for f in assets_dir.glob(f"{co}-d[0-9][0-9]-*"):
        if str(f.relative_to(ROOT)) not in used:
            f.unlink()
    if args.events:
        write_events(co, report)
    return report


_si_data = None


def uniform_icon(co, sightings):
    """Latest simple-icons version of the company's own icon (file still at HEAD)."""
    global _si_data
    cands = [s for s in sightings if s.origin == "simple-icons" and s.last_seen == TODAY]
    if not cands:
        return None
    s = max(cands, key=lambda s: s.date)
    slug = s.name_hint.rsplit("/", 1)[-1][:-4]
    if _si_data is None:
        r = fetch("https://raw.githubusercontent.com/simple-icons/simple-icons/develop/data/simple-icons.json", cache=False)
        try:
            _si_data = json.loads(r[3])
        except (TypeError, ValueError):
            _si_data = []
        rel = gh("repos/simple-icons/simple-icons/releases/latest") or {}
        _si_data = {"icons": _si_data if isinstance(_si_data, list) else _si_data.get("icons", []),
                    "version": rel.get("tag_name")}
    title = re.search(r"<title>([^<]+)</title>", s.data.decode("utf-8", "ignore"))
    meta = {"version": _si_data["version"], "title": title.group(1) if title else None}
    for ic in _si_data["icons"]:
        if ic.get("slug") == slug or (title and ic.get("title") == unescape(title.group(1))):
            meta.update(hex=ic.get("hex"), source=ic.get("source"), title=ic.get("title"))
            break
    return s, slug, meta


def contact_sheet(co, report, files_dir):
    """data/raw/logos/<co>/sheet.png: one tile per asset (on grey so light and dark both show)."""
    tiles = []
    for e in report["designs"]:
        f = next(files_dir.glob(e["sha256"] + ".*"), None)
        if f:
            src = f"{f}[0]" if f.suffix in (".ico", ".gif", ".webp") else str(f)
            tiles += ["-label", f"{e['design'][-3:]} {e['kind'][:4]} {e['variant']} {(e['date'] or '')[:7]}", src]
    if tiles:
        run(["magick", "montage", "-background", "#9a9a9a", "-density", "96", *tiles, "-tile", "6x",
             "-geometry", "160x100+6+6", "-pointsize", "11", str(RAW / co / "sheet.png")])


def write_events(co, report):
    evs = [e for e in db.events.find({"company": co, "kind": {"$in": ["logo", "rebrand"]}})]
    seen_designs = {}
    for e in report["designs"]:
        if e["official_first"] and e["kind"] in ("logo", "wordmark", "icon"):
            seen_designs.setdefault(e["design"], e)
    for did, e in seen_designs.items():
        d = e["official_first"]
        y, m = int(d[:4]), int(d[5:7] or 1)
        near = [x for x in evs if x["date"][:4].isdigit() and abs((int(x["date"][:4]) * 12 + int((x["date"] + "-06")[5:7]))
                                                                  - (y * 12 + m)) <= 4]
        if near:
            continue
        src = next((s["url"] for s in e["sightings"] if s["date"] == d and s["origin"] in ("wayback", "brand")), None)
        if not src:
            continue
        ev = dict(company=co, date=d[:7], kind="logo", title=f"New {e['kind']} first seen on site ({did})",
                  summary=f"logos.py: a new {e['kind']} design ({did}) first appears in the Wayback capture of "
                          f"{d}; inferred from capture dates (actual switch may be earlier).",
                  details={"design": did, "first_seen": d, "last_seen": e["last_seen"], "sha256": e["sha256"]},
                  sources=[{"url": src, "quote": f"{e['kind']} {did} visible in capture"}], confidence="inferred")
        hl_write("event", [ev], False)
        print("   event:", ev["title"], d)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("company", help="company slug, or 'all'")
    ap.add_argument("--domain", action="append", help="domain[@YYYYMM[-YYYYMM]] (current first; window = when the company owned it); overrides the config")
    ap.add_argument("--name", action="append", help="extra name tokens to recognise files")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only")
    ap.add_argument("--no-contextdev", action="store_true")
    ap.add_argument("--wayback-budget", type=int, default=45)
    ap.add_argument("--events", action="store_true")
    args = ap.parse_args()
    os.environ.setdefault("HL_AGENT", "logos")
    cos = list(COMPANIES) if args.company == "all" else [args.company.lower()]
    for co in cos:
        cfg = dict(COMPANIES.get(co, {}))
        if args.domain:  # "example.com" or "example.com@202004" / "old.com@201510-202004" (ownership window)
            cfg["domains"] = [d.split("@")[0] for d in args.domain]
            cfg["windows"] = {d.split("@")[0]: d.split("@")[1] for d in args.domain if "@" in d}
        cfg.setdefault("domains", [f"{co}.com"])
        cfg["names"] = list(dict.fromkeys((cfg.get("names") or [co]) + (args.name or [])))
        print(f"== {co} {cfg['domains']}")
        process(co, cfg, args)


if __name__ == "__main__":
    main()
