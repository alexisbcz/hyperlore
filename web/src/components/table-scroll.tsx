"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * The one box every data table sits in (styles: `.tbl` in globals.css). A table wider than its column
 * scrolls inside the box, never the page: the box then becomes a labelled, focusable region (so the
 * keyboard can scroll it) and fades the edge that has more columns past it. The flags are set on the
 * DOM, not in state, so scrolling never re-renders a table of hundreds of rows.
 */
export function TableScroll({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const box = el?.parentElement;
    if (!el || !box) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const overflow = max > 1;
      // scrollLeft is negative in right-to-left layouts; this site is left-to-right only.
      box.toggleAttribute("data-overflow", overflow);
      box.toggleAttribute("data-start", overflow && el.scrollLeft > 1);
      box.toggleAttribute("data-end", overflow && el.scrollLeft < max - 1);
      // Only a box that scrolls is a stop for the keyboard and a named region for screen readers.
      if (overflow) {
        el.tabIndex = 0;
        el.setAttribute("role", "region");
        el.setAttribute("aria-label", label);
      } else for (const a of ["tabindex", "role", "aria-label"]) el.removeAttribute(a);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [label]);
  return (
    <div className={className ? `tbl ${className}` : "tbl"}>
      <div ref={ref} className="tbl-scroll">
        {children}
      </div>
    </div>
  );
}
