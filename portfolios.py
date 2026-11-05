#!/usr/bin/env python3
"""Build web/public/portfolios/{yc,a16z,kima,frst}.json: every company each fund lists, one row each.

Usage: portfolios.py <yc all.json> <a16z companies json> <kima portfolio html> <frst home html>
  yc:   https://yc-oss.github.io/api/companies/all.json (mirror of YC's directory)
  a16z: the data-companies attribute of https://a16z.com/portfolio/
  kima: https://www.kimaventures.com/portfolio
  frst: https://www.frst.vc/ (it has no separate portfolio page)
A row's `h` is its Hyperlore slug when the archive has that company, matched on website host, then on exact name.
"""
import html, json, re, sys
from pathlib import Path

WEB = Path(__file__).parent / "web"

def host(url):
    m = re.match(r"(?:https?://)?(?:www\.)?([^/]+)", (url or "").strip().lower())
    return m.group(1) if m else ""

def moved(url):
    bare = re.sub(r"^(?:https?://)?(?:www\.)?", "", (url or "").strip().lower()).rstrip("/")
    return MOVED.get(bare) or MOVED.get(host(url))

archive = json.load(open(WEB / "data/archive.json"))
# Only companies with a timeline: an entity alone (mentioned in a story) has no page worth the Lore link.
with_events = {e["company"] for e in archive["events"]}
companies = [e for e in archive["entities"] if e.get("kind") == "company" and e["_id"] in with_events]
by_host, by_name = {}, {}
for e in companies:
    links = e.get("links") or {}
    for key in ("web", "site", "website"):
        if links.get(key):
            by_host[host(links[key])] = e["_id"]
    # A name alone only counts for records with no website: names collide (two YC companies are called Freestyle).
    lowered = str(e.get("name") or "").lower()
    if lowered and not any(links.get(k) for k in ("web", "site", "website")):
        by_name[lowered] = e["_id"]

# Companies whose listed site differs from the archive's, checked by hand.
MOVED = {
    "helical-ai.com": "helical", "twitch.tv": "twitch", "gitlab.com": "gitlab", "about.gitlab.com": "gitlab",
    "redditinc.com": "reddit", "corp.roblox.com": "roblox", "a16z.com/companies/xai": "xai",
}

# YC top companies whose directory site no longer matches, researched under these slugs.
YC_NAMED = {
    "GOAT Group": "goat-group", "Machine Zone": "machine-zone", "Scribd": "scribd", "OMGPop": "omgpop", "Twitch": "twitch",
    "The Athletic": "the-athletic", "Proxy": "proxy", "Clipboard": "clipboard-health", "Pardes Biosciences": "pardes-biosciences", "Zepto": "zepto",
}

def match(name, url):
    return moved(url) or by_host.get(host(url)) or by_name.get(name.lower())

def compact(row):
    return {k: v for k, v in row.items() if v not in (None, "", [], 0)}

yc = [
    compact({
        "n": c["name"], "o": c.get("one_liner"), "g": c.get("batch"), "s": c.get("status"), "i": c.get("industry"),
        "t": c.get("team_size"), "w": c.get("website"), "u": c.get("url"), "l": c.get("small_logo_thumb_url"),
        "f": c.get("former_names"), "h": (YC_NAMED.get(c["name"]) if c.get("top_company") else None) or match(c["name"], c.get("website")),
    })
    for c in json.load(open(sys.argv[1]))
]

def exit_label(c):
    """a16z stores an IPO's ticker and a sale's buyer in the same field."""
    if c.get("ticker_symbol"):
        return f"Public: {c['ticker_symbol']}"
    who = c.get("acquirer")
    if not who:
        return None
    return f"Public: {who}" if re.fullmatch(r"[A-Z]{1,5}", who) else f"Acquired by {who}"

a16z = []
for c in json.load(open(sys.argv[2])):
    name = c.get("name") or c.get("post_title")
    exited = "Exits" in str(c.get("status"))
    url = c.get("url") or c.get("external_url") or c.get("company_url")
    date = str(c.get("initial_a16z_date_funded") or "")[:4]
    a16z.append(compact({
        "n": name, "o": c.get("website_description") or c.get("overview"), "g": date if date.isdigit() else None,
        "s": "Exited" if exited else c.get("status"), "i": (c.get("verticals") or "").split(";")[0] or None, "w": url,
        "u": "https://a16z.com/portfolio/", "l": c.get("logo"), "b": c.get("founders_list"),
        "x": exit_label(c) if exited else None, "h": match(name, url),
    }))

def fund_row(name, about, url, logo, source):
    name = html.unescape(name).strip()
    return compact({"n": name, "o": html.unescape(re.sub(r"\s+", " ", about or "")).strip().replace(" ...", "…"), "w": url, "u": source, "l": logo, "h": match(name, url)})

def kima_rows(path):
    """One link per company: a logo with its name in alt, or the name in a span, then a description."""
    rows = {}
    for href, body in re.findall(r'<a [^>]*href="(https?://[^"]+)"[^>]*>(.{0,1500}?)</a>', open(path, errors="ignore").read(), re.S):
        img = re.search(r"<img[^>]*>", body)
        name = re.search(r'alt="([^"]+)"', img.group(0)) if img else re.search(r"<span[^>]*>([^<]+)</span>", body)
        if not name or "wikipedia.org" in href or name.group(1).strip() in ("BUSINESS ANGEL", "Kima Ventures"):
            continue
        logo = re.search(r'src="([^"]+)"', img.group(0)) if img else None
        about = re.search(r"<div>(.*?)</div>", body, re.S)
        row = fund_row(name.group(1), about.group(1) if about else "", href, logo.group(1) if logo else None, "https://www.kimaventures.com/portfolio")
        rows[row["n"].lower()] = row
    return list(rows.values())

def frst_rows(path):
    """Webflow list: a link with the description over it, then the logo with the name in alt."""
    rows = {}
    for item in open(path, errors="ignore").read().split('class="portfolio_item')[1:]:
        href = re.search(r'<a href="([^"]+)"', item)
        about = re.search(r'overlay-text">(.*?)</p>', item, re.S)
        img = re.search(r"<img[^>]*>", item)
        name = re.search(r'alt="([^"]+)"', img.group(0)) if img else None
        if href and name:
            logo = re.search(r'src="([^"]+)"', img.group(0))
            row = fund_row(name.group(1), about.group(1) if about else "", href.group(1), logo.group(1) if logo else None, "https://www.frst.vc/")
            rows[row["n"].lower()] = row
    return list(rows.values())

kima = kima_rows(sys.argv[3])
frst = frst_rows(sys.argv[4])

out = WEB / "public/portfolios"
out.mkdir(exist_ok=True)
for name, rows in (("yc", yc), ("a16z", a16z), ("kima", kima), ("frst", frst)):
    rows.sort(key=lambda r: (not r.get("h"), r["n"].lower()))
    (out / f"{name}.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")))
    print(name, len(rows), "in archive:", sum("h" in r for r in rows), (out / f"{name}.json").stat().st_size)
