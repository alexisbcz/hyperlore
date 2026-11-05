"use client";

import { List, X } from "lucide-react";
import { useEffect, useState } from "react";

export type TocItem = { id: string; title: string; sub?: boolean; /** Short count shown after the title ("6", "153"). */ count?: string };

/** The section whose heading last scrolled past the top of the viewport (below the sticky header). */
function useActive(items: TocItem[]) {
  const [active, setActive] = useState<string | undefined>(items[0]?.id);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 80) + 120;
      let current: string | undefined = items[0]?.id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= line) current = item.id;
      }
      // At the very bottom, the last short sections can never reach the line: pick the last one.
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = items.at(-1)?.id;
      setActive(current);
    };
    const onScroll = () => (frame ||= requestAnimationFrame(update));
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);
  return active;
}

function Links({ items, active, onPick }: { items: TocItem[]; active?: string; onPick?: () => void }) {
  // A sub-heading lights up its parent too, so the top-level position is always visible.
  const parentOf = (id?: string) => {
    const i = items.findIndex((t) => t.id === id);
    for (let j = i; j >= 0; j--) if (!items[j].sub) return items[j].id;
  };
  const activeParent = parentOf(active);
  return (
    <ul className="space-y-px text-sm">
      {items.map((t) => {
        const on = t.id === active || (!t.sub && t.id === activeParent);
        return (
          <li key={t.id}>
            <a
              href={`#${t.id}`}
              onClick={onPick}
              aria-current={t.id === active ? "location" : undefined}
              className={`flex items-baseline gap-2 rounded-r-md border-l-2 py-1 pr-2 transition-colors hover:text-fg ${
                t.sub ? "pl-5 text-[13px]" : "pl-3"
              } ${on ? "border-fg font-medium text-fg" : "border-transparent text-fg-muted"} ${t.sub && !on ? "text-fg-subtle" : ""}`}
            >
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
              {t.count && <span className="shrink-0 text-xs font-normal tabular-nums text-fg-subtle">{t.count}</span>}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** Sticky contents for the left column on wide screens. */
export function TocRail({ items }: { items: TocItem[] }) {
  const active = useActive(items);
  return (
    <nav aria-label="On this page">
      <p className="mb-2 px-3 text-xs font-medium text-fg-subtle">On this page</p>
      <Links items={items} active={active} />
    </nav>
  );
}

/** A floating "Contents" button for narrow screens, naming the current section. */
export function TocSheet({ items }: { items: TocItem[] }) {
  const active = useActive(items);
  const [open, setOpen] = useState(false);
  const current = items.find((t) => t.id === active);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="fixed inset-x-4 bottom-24 z-40 flex flex-col items-end gap-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
      {open && (
        <nav
          id="toc-sheet"
          aria-label="On this page"
          className="max-h-[60dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-xl border border-border bg-bg p-2 shadow-lg"
        >
          <Links items={items} active={active} onPick={() => setOpen(false)} />
        </nav>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls="toc-sheet"
        onClick={() => setOpen(!open)}
        className="flex h-10 max-w-full items-center gap-2 rounded-full border border-border bg-bg px-4 text-sm font-medium text-fg shadow-md transition-colors hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-accent"
      >
        {open ? <X aria-hidden="true" className="size-4 shrink-0" /> : <List aria-hidden="true" className="size-4 shrink-0" />}
        <span className="truncate">{open ? "Close" : (current?.title ?? "Contents")}</span>
      </button>
    </div>
  );
}
