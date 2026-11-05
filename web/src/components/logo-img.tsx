"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A logo <img> inside a CompanyMark that swaps to the company's `initial` (or to nothing) when the
 * file fails to load (a missing or renamed asset), instead of the browser's broken-image glyph. Also
 * catches failures that happened before hydration.
 */
export function LogoImg({ src, className, initial }: { src: string; className?: string; initial?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = ref.current;
    // naturalWidth is also 0 for size-less SVGs in some browsers; decode() only rejects real failures.
    if (img?.complete && img.naturalWidth === 0) img.decode().catch(() => setFailed(true));
  }, [src]);
  if (failed)
    return initial ? (
      <span aria-hidden="true" className={`mark-initial ${className ?? ""}`}>
        {initial}
      </span>
    ) : null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={ref} src={src} alt="" className={className} onError={() => setFailed(true)} />;
}
