"""Profile photos for the people in the archive.

Tries, in order: GitHub avatar (free), Bluesky avatar (free), X profile and LinkedIn profile
(ScrapeCreators, cached through `./hl sc`). People with no known profile link get one looked up
on Google, accepted only if the profile's display name matches theirs.
Each photo is downloaded to data/people/<slug>.<ext> and recorded on the entity as `photo`,
with the profile page it came from.

Usage: uv run python people_photos.py [slug ...] [--refresh] [--sources=x,linkedin,search]
"""

import json
import re
import subprocess
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import httpx

from hl import ROOT, db
from icons import DOMAINS

OUT = ROOT / "data/people"
UA = {"user-agent": "hyperlore/1.0 (+https://github.com/alexisbcz/hyperlore)"}
EXT = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}


def sc(endpoint, **params):
    """ScrapeCreators through `./hl sc`, so responses are cached and spend is logged."""
    args = [str(ROOT / "hl"), "sc", endpoint, *[f"{k}={v}" for k, v in params.items()]]
    res = subprocess.run(args, capture_output=True, text=True, env={**__import__("os").environ, "HL_AGENT": "people-photos"})
    try:
        data = json.loads(res.stdout)
    except json.JSONDecodeError:
        return None
    return None if data.get("ok") is False else data


def fold(s):
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


def same_person(name, display):
    """Every word of the archive's name must appear in the profile's display name."""
    words = [w for w in re.split(r"\W+", fold(name)) if len(w) > 1]
    # A single name ("Lewis") matches strangers; only full names are safe to match by search.
    return bool(display) and len(words) >= 2 and all(w in fold(display) for w in words)


def handle(url):
    path = urlparse(url).path.strip("/").split("/")
    return path[-1] if path and path[-1] else None


def github(person):
    url = person.get("links", {}).get("github")
    if url and (user := handle(url)):
        return {"image": f"https://github.com/{user}.png?size=460", "profile": f"https://github.com/{user}", "origin": "github"}


def bluesky(person):
    url = person.get("links", {}).get("bluesky")
    if not url or not (actor := handle(url)):
        return None
    r = httpx.get("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile", params={"actor": actor}, timeout=30)
    if r.status_code == 200 and (avatar := r.json().get("avatar")):
        return {"image": avatar, "profile": f"https://bsky.app/profile/{actor}", "origin": "bluesky"}


def x(person, url=None):
    url = url or person.get("links", {}).get("x")
    if not url or not (h := handle(url)):
        return None
    data = sc("v1/twitter/profile", handle=h)
    legacy = (data or {}).get("legacy") or data or {}
    img = legacy.get("profile_image_url_https") or (data or {}).get("profile_image_url_https")
    shown = legacy.get("name") or (data or {}).get("name", "")
    if img and (person.get("links", {}).get("x") or same_person(person["name"], shown)):
        # X serves 48px "_normal" thumbnails by default; ask for the 400px original.
        return {"image": img.replace("_normal.", "_400x400."), "profile": f"https://x.com/{h}", "origin": "x"}


def linkedin(person, url=None):
    url = url or person.get("links", {}).get("linkedin")
    if not url:
        return None
    data = sc("v1/linkedin/profile", url=url) or {}
    if (img := data.get("image")) and (person.get("links", {}).get("linkedin") or same_person(person["name"], data.get("name", ""))):
        return {"image": img, "profile": url, "origin": "linkedin"}


def company_of(person):
    """The company whose events mention this person most: added to searches to avoid namesakes."""
    counts = {}
    for e in db.events.find({"$or": [{"title": {"$regex": re.escape(person["name"]), "$options": "i"}},
                                      {"summary": {"$regex": re.escape(person["name"]), "$options": "i"}}]}, {"company": 1}):
        counts[e["company"]] = counts.get(e["company"], 0) + 1
    return max(counts, key=counts.get) if counts else None


def discover(person):
    """No known profile: look one up, accepting it only if the display name matches."""
    context = company_of(person) or ""
    for query, site, fetch in (
        (f'"{person["name"]}" {context} site:x.com', "x.com", x),
        (f'"{person["name"]}" {context} site:linkedin.com/in', "linkedin.com", linkedin),
    ):
        results = (sc("v1/google/search", query=query) or {}).get("results", [])
        for hit in results[:3]:
            link = hit.get("url", "")
            if site in link and (found := fetch(person, link)):
                return found


ROLE_WORDS = re.compile(r"entrepreneur|founder|executive|engineer|programmer|developer|investor|businessman|businesswoman|"
                        r"computer scientist|designer|journalist|editor|ceo|cto|venture", re.I)


def wikipedia(person):
    """A Wikipedia page about this person (not a namesake): its description must mention their company or role."""
    title = person["name"].replace(" ", "_")
    r = httpx.get(f"https://en.wikipedia.org/api/rest_v1/page/summary/{title}", headers=UA, timeout=30, follow_redirects=True)
    if r.status_code != 200:
        return None
    page = r.json()
    company = company_of(person)
    text = f'{page.get("description", "")} {page.get("extract", "")}'
    names = [n for n in (company, DOMAINS.get(company or "", "").split(".")[0]) if n]
    about_them = any(n.lower() in text.lower() for n in names) or ROLE_WORDS.search(page.get("description", ""))
    img = (page.get("originalimage") or page.get("thumbnail") or {}).get("source")
    if page.get("type") != "standard" or not about_them or not img:
        return None
    found = {"image": img.split("?")[0], "profile": page["content_urls"]["desktop"]["page"], "origin": "wikipedia"}
    # Commons credit line: licence and author.
    file = "File:" + img.split("?")[0].split("/")[-1]
    meta = httpx.get("https://commons.wikimedia.org/w/api.php", headers=UA, timeout=30, params={
        "action": "query", "titles": file, "prop": "imageinfo", "iiprop": "extmetadata", "format": "json"}).json()
    info = next(iter(meta.get("query", {}).get("pages", {}).values()), {}).get("imageinfo", [{}])[0].get("extmetadata", {})
    found["licence"] = (info.get("LicenseShortName") or {}).get("value")
    found["author"] = re.sub(r"<[^>]+>", "", (info.get("Artist") or {}).get("value", "")).strip() or None
    found["commons"] = f"https://commons.wikimedia.org/wiki/{file}"
    return found


def people_search(person):
    """Context.dev people search, accepted only if both the full name and the company's domain match."""
    company = company_of(person)
    domain = DOMAINS.get(company or "")
    if not domain:
        return None
    body = json.dumps({"query": f'{person["name"]}, {company}'})
    res = subprocess.run([str(ROOT / "hl"), "ctx", "POST", "people/search", body], capture_output=True, text=True,
                         env={**__import__("os").environ, "HL_AGENT": "people-photos"})
    try:
        results = json.loads(res.stdout).get("results", [])
    except json.JSONDecodeError:
        return None
    for r in results[:5]:
        works_there = ((r.get("role") or {}).get("company") or {}).get("domain") == domain
        linkedin_url = next((u for u in r.get("profiles", []) if "linkedin.com/in/" in u), None)
        if works_there and same_person(person["name"], r.get("name", "")) and linkedin_url:
            return linkedin(person, linkedin_url)


def github_search(person):
    """GitHub user search: full name must match and the profile's bio/company must mention their company."""
    company = company_of(person)
    if not company:
        return None
    clues = [company.lower(), DOMAINS.get(company, "").split(".")[0].lower()]
    r = httpx.get("https://api.github.com/search/users", params={"q": f'fullname:"{person["name"]}"', "per_page": 5},
                  headers={**UA, "accept": "application/vnd.github+json"}, timeout=30)
    for item in (r.json().get("items", []) if r.status_code == 200 else []):
        u = httpx.get(item["url"], headers=UA, timeout=30).json()
        text = f'{u.get("bio") or ""} {u.get("company") or ""} {u.get("blog") or ""}'.lower()
        if same_person(person["name"], u.get("name") or "") and any(c and c in text for c in clues):
            return {"image": f'https://github.com/{u["login"]}.png?size=460', "profile": u["html_url"], "origin": "github"}


def download(slug, found):
    if "default_profile" in found["image"]:
        return None  # X's grey silhouette is not a photo of anyone
    r = httpx.get(found["image"], headers=UA, timeout=60, follow_redirects=True)
    kind = r.headers.get("content-type", "").split(";")[0]
    if r.status_code != 200 or kind not in EXT or len(r.content) < 1000:
        return None
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob(f"{slug}.*"):
        old.unlink()
    path = OUT / f"{slug}{EXT[kind]}"
    path.write_bytes(r.content)
    if is_placeholder(path):
        path.unlink()
        return None
    return path


def is_placeholder(path):
    """GitHub's generated identicons (and similar defaults) are flat blocks of two or three colours."""
    out = subprocess.run(["magick", str(path), "-filter", "point", "-resize", "32x32!", "-colors", "16", "-unique-colors", "-format", "%w", "info:"],
                         capture_output=True, text=True).stdout.strip()
    return out.isdigit() and int(out) <= 3


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    refresh = "--refresh" in sys.argv
    # Restrict sources, e.g. to replace a logo-style avatar with a portrait from another profile.
    only = next((a.split("=", 1)[1].split(",") for a in sys.argv if a.startswith("--sources=")), None)
    sources = [f for f in (github, bluesky, x, linkedin, wikipedia, people_search, github_search) if not only or f.__name__ in only]
    query = {"kind": "person", **({"_id": {"$in": args}} if args else {})}
    report = []
    # Load everyone first: a cursor held open across many slow network calls times out.
    for person in list(db.entities.find(query)):
        slug = person["_id"]
        if person.get("photo") and not refresh:
            report.append((slug, "kept", person["photo"]["origin"]))
            continue
        found = None
        for source in sources:
            if (found := source(person)) and (path := download(slug, found)):
                break
            found = None
        if not found and (not person.get("links") or (only and "search" in only)):
            if (found := discover(person)) and not (path := download(slug, found)):
                found = None
        if not found:
            report.append((slug, "none", ""))
            continue
        db.entities.update_one({"_id": slug}, {"$set": {"photo": {
            "local_path": str(path.relative_to(ROOT)),
            "image_url": found["image"],
            "source_url": found["profile"],
            "origin": found["origin"],
            **{k: found[k] for k in ("licence", "author", "commons") if found.get(k)},
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }}})
        report.append((slug, "saved", found["origin"]))
    for row in report:
        print("\t".join(row))


if __name__ == "__main__":
    main()
