// Hyperlore's mark: an H whose crossbar is a timeline with one event on it. Drawn on a 32-unit grid so
// the strokes land on whole pixels at 16, 32 and 48 px. Plain SVG, so it also works inside OG images.
export const BRAND_LIME = "#ccff2a";
const INK = "#0b0c0e";

export function LogoMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" width={size} height={size} className={className}>
      <rect width="32" height="32" rx="8" fill={BRAND_LIME} />
      <rect x="7" y="7" width="4" height="18" rx="2" fill={INK} />
      <rect x="21" y="7" width="4" height="18" rx="2" fill={INK} />
      <rect x="11" y="15" width="10" height="2" fill={INK} />
      <circle cx="16" cy="16" r="4" fill={INK} />
      <circle cx="16" cy="16" r="1.75" fill={BRAND_LIME} />
    </svg>
  );
}
