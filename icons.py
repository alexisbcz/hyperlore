"""Fill in each company's square icon (and a full logo when it has none) from Context.dev's brand API.

Only adds what's missing: companies that already have a light icon keep it.
Usage: uv run python icons.py [company ...]
"""

import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone

import httpx

from hl import ROOT, db

DOMAINS = {
    "vercel": "vercel.com", "resend": "resend.com", "supabase": "supabase.com", "linear": "linear.app",
    "tangled": "tangled.org", "contextdev": "context.dev", "mistral": "mistral.ai", "railway": "railway.com",
    "letterboxd": "letterboxd.com", "corgi": "corgi.insure", "gradium": "gradium.ai", "dust": "dust.tt",
    "photoroom": "photoroom.com", "hcompany": "hcompany.ai", "cloudflare": "cloudflare.com",
    "ovhcloud": "ovhcloud.com", "delve": "delve.co", "shadow": "shadow.tech", "e2b": "e2b.dev",
    "daytona": "daytona.io", "flyio": "fly.io", "legora": "legora.com", "boat": "boat.dev",
    "zernio": "zernio.com", "arena": "are.na", "goodreads": "goodreads.com", "storygraph": "thestorygraph.com",
    "pinboard": "pinboard.in", "modal": "modal.com", "blaxel": "blaxel.ai", "upstash": "upstash.com",
    "baseten": "baseten.co", "together": "together.ai", "codesandbox": "codesandbox.io", "runloop": "runloop.ai",
    "openai": "openai.com", "freestyle": "freestyle.sh", "northflank": "northflank.com", "aws": "aws.amazon.com",
    "google": "google.com", "docker": "docker.com", "nodeops": "nodeops.network", "agent37": "agent37.com",
    "notion": "notion.com", "figma": "figma.com", "posthog": "posthog.com", "stripe": "stripe.com", "anthropic": "anthropic.com", "netlify": "netlify.com", "render": "render.com", "aikido": "aikido.dev", "robovision": "robovision.ai", "collibra": "collibra.com",
}
EXT = {"image/png": ".png", "image/svg+xml": ".svg", "image/jpeg": ".jpg", "image/webp": ".webp", "image/x-icon": ".ico"}


def brand(domain):
    body = json.dumps({"type": "by_domain", "domain": domain, "timeoutOpts": {"milliseconds": 60000, "behavior": "return-partial"}})
    res = subprocess.run([str(ROOT / "hl"), "ctx", "POST", "brand/retrieve", body], capture_output=True, text=True,
                         env={**__import__("os").environ, "HL_AGENT": "icons"})
    try:
        data = json.loads(res.stdout)
    except json.JSONDecodeError:
        return None
    return data.get("brand") if data.get("status") == "ok" or data.get("brand") else None


def variant_of(path):
    """White marks on transparency go on dark tiles; everything else on white. Measured, since brand
    APIs label modes inconsistently. SVGs must be rasterised on a transparent background."""
    pre = ["-background", "none"] if path.suffix == ".svg" else []
    run = lambda args: float(subprocess.run(["magick", *pre, str(path), "-resize", "128x128", *args],
                                            capture_output=True, text=True).stdout.strip() or 0)
    coverage = run(["-alpha", "extract", "-format", "%[fx:mean]", "info:"])
    lit = run(["-background", "black", "-alpha", "remove", "-colorspace", "gray", "-format", "%[fx:mean]", "info:"])
    return "dark" if coverage < 0.9 and coverage and lit / coverage > 0.75 else "light"


def has(company, kind_filter):
    return db.assets.count_documents({"company": company, "variant": {"$ne": "dark"}, "local_path": {"$exists": True}, **kind_filter}) > 0


def save(company, domain, logo, kind):
    r = httpx.get(logo["url"], timeout=60, follow_redirects=True)
    ctype = r.headers.get("content-type", "").split(";")[0]
    if r.status_code != 200 or ctype not in EXT:
        return None
    sha = hashlib.sha256(r.content).hexdigest()
    path = ROOT / "data/assets" / company / f"{kind}-contextdev-{sha[:8]}{EXT[ctype]}"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(r.content)
    site = f"https://{domain}"
    db.sources.update_one({"_id": hashlib.sha1(site.encode()).hexdigest()[:16]},
                          {"$setOnInsert": {"url": site, "type": "website", "title": f"{domain} (brand assets via Context.dev)",
                                            "fetched_at": datetime.now(timezone.utc).isoformat()}}, upsert=True)
    asset = {
        "company": company, "kind": kind,
        "variant": variant_of(path),
        "date": datetime.now(timezone.utc).strftime("%Y-%m"), "url": logo["url"], "local_path": str(path.relative_to(ROOT)),
        "source_url": site, "origin": "contextdev", "sha256": sha,
        "description": f"Current {kind} from {domain}'s brand profile ({logo.get('mode')}, "
                       f"{(logo.get('resolution') or {}).get('width')}px)",
    }
    db.assets.update_one({"_id": hashlib.sha1(f"{company}|{kind}|{sha}".encode()).hexdigest()[:16]}, {"$set": asset}, upsert=True)
    return path


def pick(logos, kind):
    def size(l):
        return (l.get("resolution") or {}).get("width") or 0

    if kind == "icon":
        square = [l for l in logos if abs(((l.get("resolution") or {}).get("aspect_ratio") or 1) - 1) < 0.15]
        # A light-background-friendly mark first: anything not marked as a white ("light" mode) mark.
        square.sort(key=lambda l: (l.get("mode") == "light", l.get("type") != "icon", -size(l)))
        return square[0] if square else None
    wide = [l for l in logos if l.get("type") == "logo" and l.get("mode") != "light"]
    wide.sort(key=lambda l: (not l["url"].endswith(".svg"), -size(l)))
    return wide[0] if wide else None


def main():
    only = sys.argv[1:]
    for company in sorted(set(db.events.distinct("company"))):
        if only and company not in only:
            continue
        domain = DOMAINS.get(company)
        need_icon = not has(company, {"kind": "icon"})
        need_logo = not has(company, {"kind": {"$in": ["logo", "wordmark"]}})
        if not domain or not (need_icon or need_logo):
            print(f"{company}\tskip\t{'no domain' if not domain else 'complete'}")
            continue
        b = brand(domain)
        logos = (b or {}).get("logos") or []
        done = []
        for kind, needed in (("icon", need_icon), ("logo", need_logo)):
            if needed and (choice := pick(logos, kind)) and save(company, domain, choice, kind):
                done.append(kind)
        print(f"{company}\t{','.join(done) or 'nothing usable'}\t{domain}")


if __name__ == "__main__":
    main()
