import type { ReactNode } from "react";

/** The one horizontal frame: matches the header, so every page shares its left edge. */
export const CONTAINER = "mx-auto w-full max-w-7xl px-4 sm:px-6";

const WIDTHS = {
  full: "",
  wide: "max-w-5xl",
  text: "max-w-3xl",
};

/**
 * Page body inside the shared frame. `width` limits the content column (left-aligned, never re-centred),
 * so lists and reading pages keep comfortable measures without shifting the left edge.
 */
export function Page({ width = "full", children }: { width?: keyof typeof WIDTHS; children: ReactNode }) {
  return (
    <div className={`${CONTAINER} py-12`}>
      <div className={WIDTHS[width]}>{children}</div>
    </div>
  );
}
