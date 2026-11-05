"use client";

import { type ReactNode, useState } from "react";
import { SOURCE_LABELS, formatDate } from "@/lib/format";
import { SourceIcon } from "./icons";

/** What a citation's hover card shows: source type, host, date, title and the supporting words. */
export type CiteCardData = {
  type: string;
  host: string;
  publishedAt?: string;
  title?: string;
  /** The supporting words: the claim's quote (shown in quotation marks) or the source's excerpt. */
  text?: string;
  quoted?: boolean;
};

export type CardPlacement = { side?: "top" | "bottom"; align?: "center" | "start" | "end"; /** For tight columns (the infobox). */ narrow?: boolean };

const CARD_SIDE = { top: "bottom-full mb-2", bottom: "top-full mt-2" };
const CARD_ALIGN = { center: "left-1/2 -translate-x-1/2", start: "left-0", end: "right-0" };
// On phones a card anchored to its mark would run off the screen (a 18rem card next to a mark near the
// right edge): it docks to the bottom of the viewport instead, full width.
const CARD_PHONE = "max-sm:fixed max-sm:inset-x-4 max-sm:top-auto max-sm:bottom-24 max-sm:m-0 max-sm:w-auto max-sm:max-w-none max-sm:translate-x-0";

/**
 * Wraps a citation mark and mounts its card the first time the mark is hovered or focused. Pages carry
 * hundreds of citations, and rendering every card up front put each one in the HTML twice (markup and
 * RSC payload); now only the card's data travels, once. Shown by CSS (group-hover/focus-within), out of
 * layout until then, so hidden cards never widen the page on phones.
 */
export function CiteHover({
  card,
  id,
  side = "top",
  align = "center",
  narrow,
  className,
  children,
}: {
  card: CiteCardData;
  id?: string;
  className: string;
  /** A function receives whether the card is mounted (to point aria-describedby at it). */
  children: ReactNode | ((mounted: boolean) => ReactNode);
} & CardPlacement) {
  const [mounted, setMounted] = useState(false);
  const mount = () => mounted || setMounted(true);
  return (
    <span className={className} onPointerEnter={mount} onFocus={mount}>
      {typeof children === "function" ? children(mounted) : children}
      {mounted && (
        <span
          id={id}
          role="tooltip"
          className={`absolute z-20 hidden ${narrow ? "w-60" : "w-72"} max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-bg p-3 text-left whitespace-normal text-[13px] font-normal normal-case leading-snug tracking-normal shadow-lg transition-opacity duration-150 starting:opacity-0 group-hover/cite:block group-focus-within/cite:block ${CARD_SIDE[side]} ${CARD_ALIGN[align]} ${CARD_PHONE}`}
        >
          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
            <SourceIcon type={card.type} className="size-3 text-fg-muted" />
            <span className="font-medium text-fg-muted">{SOURCE_LABELS[card.type] ?? card.type}</span>
            <span className="truncate">{card.host}</span>
            {card.publishedAt && <span className="ml-auto shrink-0 tabular-nums">{formatDate(card.publishedAt)}</span>}
          </span>
          {card.title && <span className="mt-1.5 line-clamp-2 font-medium text-fg">{card.title}</span>}
          {card.text && card.text !== card.title && <span className="mt-1 line-clamp-3 text-fg-muted">{card.quoted ? `“${card.text}”` : card.text}</span>}
        </span>
      )}
    </span>
  );
}

/** Numbered superscript citation; the link jumps to the reference, the card describes it once mounted. */
export function CiteMark({ n, card }: { n: number; card?: CiteCardData }) {
  // Styles in globals.css (.cite-sup): an overview carries dozens of these.
  const className = "group/cite cite-sup";
  const mark = (described: boolean) => (
    <a href={`#ref-${n}`} aria-describedby={described ? `cite-card-${n}` : undefined}>
      [{n}]
    </a>
  );
  if (!card) return <span className={className}>{mark(false)}</span>;
  return (
    <CiteHover card={card} id={`cite-card-${n}`} className={className}>
      {mark}
    </CiteHover>
  );
}
