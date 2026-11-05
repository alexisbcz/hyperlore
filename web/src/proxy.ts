import { NextResponse, type NextRequest } from "next/server";

// The Twenty design is the default. Its pages live under src/app/lab/twenty; this serves them at the
// public URLs (/, /companies, /vercel, /investors/accel…). The classic pages still answer the same
// URLs for visitors who pick them (?style=classic sets a cookie, ?style=twenty clears it). The style
// lab's experiments (/lab/paste, /lab/google) keep their own designs.

const TWENTY = "/lab/twenty";
const COOKIE = "hl-style";

/** Index pages the Twenty design draws. */
const SECTIONS = new Set([
  "companies", "rounds", "investors", "people", "categories", "places", "stories",
  "compare", "stats", "ideas", "benchmarks", "developers", "request", "correct",
]);
/** Sections whose /<section>/<slug> record pages the Twenty design draws too. */
const RECORDS = new Set(["investors", "people", "stories", "places", "categories", "portfolios"]);
/** Top-level routes that are not company pages. */
const RESERVED = new Set([
  "api", "lab", "portfolios",
  "assets", "flags", "opengraph-image", "twitter-image", "apple-icon", "icon", "manifest",
  "robots", "sitemap", "source-icons.svg",
]);

/** The Twenty page for a public path, or null when the path keeps the classic page. */
function twentyPath(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.some((p) => p.includes("."))) return null;
  if (parts.length === 0) return TWENTY;
  if (parts.length === 1) {
    if (parts[0] === "lab") return `${TWENTY}/lab`; // the style lab's index; its experiments keep their designs
    if (SECTIONS.has(parts[0])) return `${TWENTY}/${parts[0]}`;
    return RESERVED.has(parts[0]) ? null : `${TWENTY}/${parts[0]}`;
  }
  if (parts.length === 2 && RECORDS.has(parts[0])) return `${TWENTY}/${parts[0]}/${parts[1]}`;
  return null;
}

export function proxy(request: NextRequest) {
  const url = request.nextUrl;

  // ?style=classic|twenty: remember the choice and drop the parameter from the URL.
  const style = url.searchParams.get("style");
  if (style === "classic" || style === "twenty") {
    const clean = url.clone();
    clean.searchParams.delete("style");
    const response = NextResponse.redirect(clean);
    if (style === "classic") response.cookies.set(COOKIE, "classic", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
    else response.cookies.delete(COOKIE);
    return response;
  }

  // The Twenty pages' own URLs redirect to the public ones, so each page has one address. Their share
  // images and video frames are files, not pages: those keep the /lab/twenty URL Next gives them.
  const asset = /\/(opengraph-image|twitter-image|og-frame)[^/]*$/.test(url.pathname);
  if (!asset && (url.pathname === TWENTY || url.pathname.startsWith(`${TWENTY}/`))) {
    const canonical = url.clone();
    canonical.pathname = url.pathname.slice(TWENTY.length) || "/";
    return NextResponse.redirect(canonical, 308);
  }

  if (request.cookies.get(COOKIE)?.value === "classic") return NextResponse.next();

  const target = twentyPath(url.pathname);
  if (!target) return NextResponse.next();
  const rewritten = url.clone();
  rewritten.pathname = target;
  return NextResponse.rewrite(rewritten);
}

export const config = {
  // Pages only: no Next internals, API routes or files with an extension.
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
