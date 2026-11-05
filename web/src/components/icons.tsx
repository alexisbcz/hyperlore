// Source marks are drawn once in the /source-icons.svg sprite (src/app/source-icons.svg/route.ts) and
// referenced with <use>: pages show hundreds of them, and inlining each path weighed ~190 KB of HTML
// (twice, counting the RSC payload) on a company page. Brand marks (Simple Icons) for these types:
const BRANDS = new Set(["tweet", "youtube", "hn", "bluesky", "github", "wikipedia", "wayback", "reddit", "linkedin", "yc"]);

/** Source type → glyph, for types without a brand mark. */
const GLYPH_OF: Record<string, string> = {
  blog: "file",
  press: "newspaper",
  article: "newspaper",
  website: "globe",
  podcast: "mic",
  filing: "scale",
};

/** Bump when a symbol changes, so browsers drop the cached sprite. */
export const SPRITE_URL = "/source-icons.svg?v=3";

// Own keys only: a type can be any string, including "constructor".
const symbolOf = (type: string) =>
  BRANDS.has(type) ? type : `g-${Object.hasOwn(GLYPH_OF, type) ? GLYPH_OF[type] : "link"}`;

export function SourceIcon({ type, className = "size-3" }: { type: string; className?: string }) {
  return (
    <svg aria-hidden="true" className={className ? `${className} shrink-0` : "shrink-0"}>
      <use href={`${SPRITE_URL}#${symbolOf(type)}`} />
    </svg>
  );
}

export function XIcon({ className = "size-3.5" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`${className} shrink-0 fill-current`}>
      <path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" />
    </svg>
  );
}
