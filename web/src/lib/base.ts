/** A sub-path the site is served under ("" at a domain's root, the default; "/hyperlore" on
 * <user>.github.io/hyperlore). Next adds it to <Link> and its own assets; plain URLs (img src, fetch)
 * go through withBase. */
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Optional: serve archived logos and photos from another origin (e.g. a CDN in front of the archive
 * repo) instead of this site's public/. Empty by default. */
export const ASSET_BASE = process.env.NEXT_PUBLIC_ASSET_BASE ?? "";

/** Logos (/assets/…) and photos (/people/<file>, /places/<file>): files the archive repo holds. */
const ARCHIVED = /^\/(assets\/.+|(people|places)\/[^/]+)\.(png|jpe?g|webp|avif|gif|svg|ico)$/i;

export const isArchivedImage = (path: string) => ARCHIVED.test(path.split("?")[0]);

export function withBase(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  if (ASSET_BASE && isArchivedImage(path)) return ASSET_BASE + path;
  return path.startsWith(BASE + "/") ? path : BASE + path;
}
