"""Hyperlore CLI: the one way agents read and write the lore database.

Every fact must point at a source. Sources are stored once (keyed by URL),
events and quotes reference them by URL.

Usage (JSON on stdin for writes):
  hl source   < {"url", "type", "title", "author", "published_at", "publisher", "excerpt", "raw_path"}
  hl event    < {"company", "date", "kind", "title", "summary", "details", "sources": [{"url", "quote"}], "confidence"}
  hl quote    < {"company", "person", "text", "date", "url", "timestamp_s", "context"}
  hl asset    < {"company", "kind", "date", "url", "local_path", "source_url", "description"}
  hl entity   < {"slug", "kind", "name", "aliases", "links", "summary", "sources": [...]}
  hl page     < {"company", "slug", "title", "markdown"}   cited prose; cite with {{cite:<source url>}}
  hl sc <endpoint> key=value ...    ScrapeCreators GET, cached in data/raw/scrapecreators/
  hl ctx [GET|POST] <path> '<json>' Context.dev (brand/retrieve, news, web/search, web/scrape…), cached
  hl delete <collection> <id> <reason>   remove a wrong record (logged in `deletions`)
  hl export [path]                  publish a JSON snapshot of the archive for the website
  hl list <collection> [company]
  hl stats
"""

import hashlib
import json
import os
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from pymongo import ASCENDING, MongoClient

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

db = MongoClient(os.environ["MONGO_URL"], serverSelectionTimeoutMS=15000)["hyperlore"]

SOURCE_TYPES = {"tweet", "youtube", "podcast", "article", "blog", "press", "wayback",
                "github", "wikipedia", "hn", "reddit", "linkedin", "bluesky", "mastodon",
                "filing", "website", "other"}
EVENT_KINDS = {"founding", "funding", "rename", "logo", "rebrand", "product", "launch",
               "acquisition", "acquired", "hire", "departure", "event", "conference",
               "milestone", "pivot", "domain", "office", "controversy", "partnership",
               "open-source", "pricing", "outage", "layoff", "other"}
DATE_RE = re.compile(r"^\d{4}(-\d{2}(-\d{2})?)?$")


def now():
    return datetime.now(timezone.utc).isoformat()


def sid(url):
    return hashlib.sha1(url.strip().encode()).hexdigest()[:16]


def die(msg):
    print(json.dumps({"ok": False, "error": msg}))
    sys.exit(1)


def read_stdin():
    data = json.load(sys.stdin)
    return data if isinstance(data, list) else [data]


def ensure_indexes():
    db.sources.create_index([("url", ASCENDING)], unique=True)
    db.events.create_index([("company", ASCENDING), ("date", ASCENDING)])
    db.quotes.create_index([("company", ASCENDING)])


def check_sources(refs):
    if not refs:
        die("at least one source is required")
    for ref in refs:
        if not ref.get("url"):
            die("every source ref needs a url")
        if not db.sources.find_one({"_id": sid(ref["url"])}):
            die(f"unknown source {ref['url']}: add it with `hl source` first")


def check_date(d):
    if not d or not DATE_RE.match(d):
        die(f"date must be YYYY, YYYY-MM or YYYY-MM-DD, got {d!r}")


def cmd_source(items):
    out = []
    for s in items:
        if not s.get("url"):
            die("source needs a url")
        if s.get("type") not in SOURCE_TYPES:
            die(f"type must be one of {sorted(SOURCE_TYPES)}")
        s["_id"] = sid(s["url"])
        s["fetched_at"] = s.get("fetched_at") or now()
        db.sources.update_one({"_id": s["_id"]}, {"$set": s}, upsert=True)
        out.append(s["_id"])
    print(json.dumps({"ok": True, "ids": out}))


def cmd_event(items):
    out = []
    for e in items:
        for k in ("company", "date", "kind", "title"):
            if not e.get(k):
                die(f"event needs {k}")
        check_date(e["date"])
        if e["kind"] not in EVENT_KINDS:
            die(f"kind must be one of {sorted(EVENT_KINDS)}")
        e["company"] = e["company"].lower()
        e.setdefault("confidence", "sourced")
        check_sources(e.get("sources"))
        e["_id"] = sid(f"{e['company']}|{e['kind']}|{e['date']}|{e['title'].lower()}")
        e["updated_at"] = now()
        existing = db.events.find_one({"_id": e["_id"]})
        if existing:
            # Merge sources rather than overwrite, so agents can corroborate each other.
            urls = {s["url"] for s in existing.get("sources", [])}
            e["sources"] = existing.get("sources", []) + [s for s in e["sources"] if s["url"] not in urls]
        db.events.update_one({"_id": e["_id"]}, {"$set": e}, upsert=True)
        out.append(e["_id"])
    print(json.dumps({"ok": True, "ids": out}))


def cmd_quote(items):
    out = []
    for q in items:
        for k in ("company", "person", "text", "url"):
            if not q.get(k):
                die(f"quote needs {k}")
        check_sources([{"url": q["url"]}])
        q["company"] = q["company"].lower()
        q["_id"] = sid(f"{q['url']}|{q['text'][:80]}")
        db.quotes.update_one({"_id": q["_id"]}, {"$set": q}, upsert=True)
        out.append(q["_id"])
    print(json.dumps({"ok": True, "ids": out}))


def cmd_asset(items):
    out = []
    for a in items:
        for k in ("company", "kind", "source_url"):
            if not a.get(k):
                die(f"asset needs {k}")
        check_sources([{"url": a["source_url"]}])
        a["company"] = a["company"].lower()
        a["_id"] = sid(f"{a['company']}|{a['kind']}|{a.get('url') or a.get('local_path')}")
        db.assets.update_one({"_id": a["_id"]}, {"$set": a}, upsert=True)
        out.append(a["_id"])
    print(json.dumps({"ok": True, "ids": out}))


def _union(old, new, key):
    seen, out = set(), []
    for x in [*(old or []), *(new or [])]:
        k = key(x)
        if k not in seen:
            seen.add(k)
            out.append(x)
    return out


# How an entity write combines with what is stored, so agents don't wipe each other's work.
LIST_KEYS = {
    "aliases": lambda x: str(x).lower(),
    "sources": lambda x: x.get("url") if isinstance(x, dict) else x,
    "roles": lambda x: (x.get("company"), x.get("title")) if isinstance(x, dict) else x,
    "companies": lambda x: x,
}
DICT_KEYS = {"links", "profile", "field_sources"}


def merge_entity(old, new):
    merged = dict(new)
    for k, key in LIST_KEYS.items():
        if k in old or k in new:
            merged[k] = _union(old.get(k), new.get(k), key)
    for k in DICT_KEYS:
        if isinstance(old.get(k), dict) and isinstance(new.get(k), dict):
            merged[k] = {**old[k], **new[k]}
    # Several agents write shared entities (investors, places) at once: a summary is extended, never
    # silently replaced. Send "replace": true to rewrite it on purpose.
    before, after = (old.get("summary") or "").strip(), (new.get("summary") or "").strip()
    if before and after and before not in after:
        merged["summary"] = before if after in before else f"{before} {after}"
    return merged


def cmd_entity(items):
    """Upserts merge: lists (aliases, sources, roles) are unioned, dicts (links, profile)
    are shallow-merged, and a new summary is appended to the stored one unless it already
    contains it. Pass "replace": true to overwrite fields as sent."""
    out = []
    for e in items:
        if not e.get("slug") or not e.get("kind"):
            die("entity needs slug and kind")
        check_sources(e.get("sources"))
        e["_id"] = e["slug"]
        if not e.pop("replace", False):
            e = merge_entity(db.entities.find_one({"_id": e["_id"]}) or {}, e)
        db.entities.update_one({"_id": e["_id"]}, {"$set": e}, upsert=True)
        out.append(e["_id"])
    print(json.dumps({"ok": True, "ids": out}))


CITE_RE = re.compile(r"\{\{cite:([^}\s]+)\}\}")


def cmd_page(items):
    out = []
    for p in items:
        for k in ("company", "slug", "title", "markdown"):
            if not p.get(k):
                die(f"page needs {k}")
        cites = CITE_RE.findall(p["markdown"])
        if not cites:
            die("a page must cite its sources with {{cite:<url>}}")
        check_sources([{"url": u} for u in set(cites)])
        p["company"] = p["company"].lower()
        p["_id"] = f"{p['company']}:{p['slug']}"
        p["citations"] = len(cites)
        p["updated_at"] = now()
        p.setdefault("generated_by", os.environ.get("HL_AGENT", "?"))
        db.pages.update_one({"_id": p["_id"]}, {"$set": p}, upsert=True)
        out.append(p["_id"])
    print(json.dumps({"ok": True, "ids": out}))


def cmd_sc(endpoint, params):
    endpoint = endpoint.strip("/")
    key = hashlib.sha1(json.dumps([endpoint, sorted(params.items())]).encode()).hexdigest()[:20]
    cache = ROOT / "data/raw/scrapecreators" / endpoint.replace("/", "_") / f"{key}.json"
    if cache.exists():
        print(cache.read_text())
        return
    r = httpx.get(f"https://api.scrapecreators.com/{endpoint}", params=params,
                  headers={"x-api-key": os.environ["SCRAPECREATORS_API_KEY"]}, timeout=120)
    db.api_calls.insert_one({"endpoint": endpoint, "params": params, "status": r.status_code,
                             "at": now(), "agent": os.environ.get("HL_AGENT", "?")})
    if r.status_code != 200:
        die(f"HTTP {r.status_code}: {r.text[:300]}")
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(r.text)
    print(r.text)


def cmd_delete(coll, doc_id, reason):
    doc = db[coll].find_one({"_id": doc_id})
    if not doc:
        die(f"no {coll} document with _id {doc_id}")
    db.deletions.insert_one({"collection": coll, "doc": doc, "reason": reason, "at": now(),
                             "agent": os.environ.get("HL_AGENT", "?")})
    db[coll].delete_one({"_id": doc_id})
    print(json.dumps({"ok": True, "deleted": doc_id}))


def cmd_ctx(path, body, method="POST"):
    path = path.strip("/")
    key = hashlib.sha1(json.dumps([method, path, body], sort_keys=True).encode()).hexdigest()[:20]
    cache = ROOT / "data/raw/contextdev-api" / path.replace("/", "_") / f"{key}.json"
    if cache.exists():
        print(cache.read_text())
        return
    r = httpx.request(method, f"https://api.context.dev/v1/{path}", timeout=180,
                      **({"params": body} if method == "GET" else {"json": body}),
                      headers={"Authorization": f"Bearer {os.environ['CONTEXT_DEV_API_KEY']}"})
    db.api_calls.insert_one({"provider": "context.dev", "endpoint": path, "params": body,
                             "status": r.status_code, "credits": r.headers.get("x-credits-used"),
                             "at": now(), "agent": os.environ.get("HL_AGENT", "?")})
    if r.status_code != 200:
        die(f"HTTP {r.status_code}: {r.text[:300]}")
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(r.text)
    print(r.text)


IMAGE_EXTS = {".svg", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".ico"}

EXPORT_FIELDS = {
    "events": None,
    "quotes": None,
    "assets": None,
    "entities": None,
    "pages": None,
    "sources": {"url": 1, "type": 1, "title": 1, "author": 1, "published_at": 1, "excerpt": 1},
}


def fix_svg_size(svg):
    """Icon-library SVGs often say width="1em" height="1em": an <img> then renders them as a
    16px square and squeezes a wide wordmark into a speck. Use the viewBox size instead."""
    m = re.search(r"<svg\b[^>]*>", svg)
    if not m:
        return svg
    tag = m.group(0)
    vb = re.search(r'viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"', tag)
    sized = re.search(r'\b(width|height)="[\d.]*(em|%)"', tag)
    if not vb or not sized:
        return svg
    w, h = vb.groups()
    new = re.sub(r'\s(width|height)="[^"]*"', "", tag)
    new = new.replace("<svg", f'<svg width="{w}" height="{h}"', 1)
    return svg.replace(tag, new, 1)


def cmd_export(path=None):
    out = ROOT / (path or "web/data/archive.json")
    snapshot = {"exported_at": now()}
    for coll, fields in EXPORT_FIELDS.items():
        docs = list(db[coll].find({}, fields))
        if coll == "sources":
            for d in docs:
                d["_id"] = str(d["_id"])
                if d.get("excerpt"):
                    d["excerpt"] = d["excerpt"][:400]
        snapshot[coll] = docs
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(snapshot, default=str, ensure_ascii=False, separators=(",", ":")))
    # The website serves logos statically, so it ships the archived image files with it.
    public = ROOT / "web/public/assets"
    copied = 0
    for a in snapshot["assets"]:
        src = ROOT / str(a.get("local_path", ""))
        assets_dir = ROOT / "data/assets"
        if a.get("local_path") and src.is_file() and assets_dir not in src.parents:
            # Agents sometimes save media under data/raw (not versioned): move it into data/assets.
            moved = assets_dir / str(a.get("company", "misc")) / src.name
            moved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, moved)
            a["local_path"] = str(moved.relative_to(ROOT))
            db.assets.update_one({"_id": a["_id"]}, {"$set": {"local_path": a["local_path"]}})
            src = moved
        if a.get("local_path") and src.is_file() and src.suffix.lower() in IMAGE_EXTS:
            dest = public / src.relative_to(ROOT / "data/assets")
            dest.parent.mkdir(parents=True, exist_ok=True)
            if src.suffix.lower() == ".svg":
                # Some brand SVGs recolour themselves in dark mode, which makes them vanish on the
                # site's fixed white/dark tiles. Strip those rules so each mark keeps one colour.
                svg = src.read_text(errors="ignore")
                svg = re.sub(r"@media\s*\(\s*prefers-color-scheme[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}", "", svg)
                dest.write_text(fix_svg_size(svg))
            else:
                shutil.copy2(src, dest)
            copied += 1
    # People portraits and place photos ship the same way.
    for e in snapshot["entities"]:
        local = (e.get("photo") or {}).get("local_path")
        src = ROOT / str(local or "")
        if local and src.is_file() and src.suffix.lower() in IMAGE_EXTS:
            dest = ROOT / "web/public" / src.relative_to(ROOT / "data")
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest)
            copied += 1
    snapshot["assets_copied"] = copied
    out.write_text(json.dumps(snapshot, default=str, ensure_ascii=False, separators=(",", ":")))
    print(json.dumps({"ok": True, "path": str(out), "bytes": out.stat().st_size, "assets_copied": copied,
                      **{k: len(v) for k, v in snapshot.items() if isinstance(v, list)}}))


def cmd_list(coll, company=None):
    q = {"company": company.lower()} if company else {}
    sort = [("date", ASCENDING)] if coll == "events" else None
    for doc in db[coll].find(q, sort=sort):
        print(json.dumps(doc, default=str, ensure_ascii=False))


def cmd_stats():
    out = {"api_calls": db.api_calls.count_documents({})}
    for c in ("sources", "events", "quotes", "assets", "entities"):
        out[c] = db[c].count_documents({})
    out["events_by_company"] = {r["_id"]: r["n"] for r in db.events.aggregate(
        [{"$group": {"_id": "$company", "n": {"$sum": 1}}}])}
    out["calls_by_agent"] = {r["_id"]: r["n"] for r in db.api_calls.aggregate(
        [{"$group": {"_id": "$agent", "n": {"$sum": 1}}}])}
    print(json.dumps(out, indent=2))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return
    ensure_indexes()
    cmd, args = sys.argv[1], sys.argv[2:]
    writers = {"page": cmd_page, "source": cmd_source, "event": cmd_event, "quote": cmd_quote,
               "asset": cmd_asset, "entity": cmd_entity}
    if cmd in writers:
        writers[cmd](read_stdin())
    elif cmd == "sc":
        cmd_sc(args[0], dict(a.split("=", 1) for a in args[1:]))
    elif cmd == "ctx":
        method = args.pop(0) if args[0] in ("GET", "POST") else "POST"
        cmd_ctx(args[0], json.loads(args[1]) if len(args) > 1 else {}, method)
    elif cmd == "delete":
        if len(args) < 3:
            die("usage: hl delete <collection> <id> <reason>")
        cmd_delete(args[0], args[1], " ".join(args[2:]))
    elif cmd == "export":
        cmd_export(*args)
    elif cmd == "list":
        cmd_list(*args)
    elif cmd == "stats":
        cmd_stats()
    else:
        die(f"unknown command {cmd}")


if __name__ == "__main__":
    main()
