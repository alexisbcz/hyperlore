"use client";

// The long lists on record pages (timeline, quotes, sources). Client components on purpose: they
// receive compact rows instead of server-rendered element trees, which kept a big company's page
// several times larger than its data.

import type { CSSProperties } from "react";
import Link from "next/link";
import { IconExternalLink } from "twenty-ui/icon";
import { Tooltip } from "twenty-ui/primitives/surfaces";
import { Text } from "twenty-ui/primitives/typography";
import { SOURCE_LABELS, formatDate } from "@/lib/format";
import type { SourceInfo } from "@/lib/types";
import { kindHue, kindOf, PersonAvatar, sourceIcon, SourceChip, T } from "./ui";

export function SourceList({ urls, sources, numbered }: { urls: string[]; sources: Record<string, SourceInfo>; numbered?: boolean }) {
  return (
    <ol>
      {[...new Set(urls)].map((url, i) => {
        const s = sources[url];
        const Icon = sourceIcon(s?.type);
        return (
          <li key={url} id={numbered ? `ref-${i + 1}` : undefined}>
            <span className="tw-ref-n">{numbered ? i + 1 : <Icon size={14} aria-hidden />}</span>
            <a href={url} target="_blank" rel="noreferrer" className="tw-link" title={url}>
              {s?.title?.split("\n")[0] || url}
            </a>
            <span className="tw-ref-meta">
              {SOURCE_LABELS[s?.type ?? ""] ?? s?.type ?? "Link"} · {(s?.host ?? new URL(url).host).replace(/^www\./, "")}
              {s?.publishedAt ? ` · ${formatDate(s.publishedAt)}` : ""}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------------------------------------

export type TimelineEvent = {
  id: string;
  date: string;
  kind: string;
  title: string;
  summary?: string;
  inferred: boolean;
  sources: { url: string; host: string; type: string }[];
  company?: string;
  companyName?: string;
};

/** Twenty's activity feed: grouped by year, newest first, one icon tile per event kind. */
export function Timeline({ events, showCompany }: { events: TimelineEvent[]; showCompany?: boolean }) {
  const byYear = new Map<string, TimelineEvent[]>();
  for (const e of events.toSorted((a, b) => b.date.localeCompare(a.date))) {
    const y = e.date.slice(0, 4);
    byYear.set(y, [...(byYear.get(y) ?? []), e]);
  }
  if (!events.length) return <div className="tw-empty">No events recorded yet.</div>;
  return (
    <div className="tw-timeline">
      {[...byYear].map(([y, list]) => (
        <section key={y}>
          <h3 className="tw-tl-year">
            {y} <span className="tw-col-count tw-num">{list.length}</span>
          </h3>
          <ol className="tw-tl-list">
            {list.map((e) => {
              const k = kindOf(e.kind);
              return (
                <li key={e.id} id={e.id} className="tw-tl-item">
                  <span className="tw-tl-icon tw-gloss" style={{ "--hue": kindHue(e.kind).hue, "--sat": kindHue(e.kind).sat } as CSSProperties}>
                    <k.icon aria-hidden />
                  </span>
                  <div className="tw-tl-body">
                    <div className="tw-tl-head">
                      {showCompany && e.company && (
                        <>
                          <Link href={`${T}/${e.company}`} className="tw-link" style={{ color: "var(--t-font-color-secondary)" }}>
                            {e.companyName ?? e.company}
                          </Link>
                          <span className="tw-pagehead-sep">·</span>
                        </>
                      )}
                      <span className="tw-tl-title">{e.title}</span>
                      <span style={{ fontSize: "var(--t-font-size-xs)", color: `var(--t-tag-text-${k.color})` }}>{k.label}</span>
                      {e.inferred && (
                        <Tooltip content="Inferred" description="Deduced from the sources rather than stated by one.">
                          <span style={{ fontSize: "var(--t-font-size-xs)", color: "var(--t-font-color-light)" }}>· inferred</span>
                        </Tooltip>
                      )}
                    </div>
                    {e.summary && <p className="tw-tl-summary">{e.summary}</p>}
                    {e.sources.length > 0 && (
                      <div className="tw-tl-sources">
                        {e.sources.slice(0, 4).map((s, i) => (
                          <SourceChip key={i} url={s.url} host={s.host} type={s.type} />
                        ))}
                        {e.sources.length > 4 && <span className="tw-cell-light">+{e.sources.length - 4}</span>}
                      </div>
                    )}
                  </div>
                  <time className="tw-tl-date tw-num" dateTime={e.date}>
                    {formatDate(e.date)}
                  </time>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

export function Quotes({ quotes, showCompany }: { quotes: { id: string; person?: string; company?: string; companyName?: string; text: string; date?: string; link: string; context?: string }[]; showCompany?: boolean }) {
  return (
    <div className="tw-quotes">
      {quotes.map((q, i) => (
        <figure key={`${q.id}-${i}`} className="tw-quote" style={{ margin: 0 }}>
          <blockquote className="tw-quote-text" style={{ margin: 0 }}>
            “{q.text}”
          </blockquote>
          {q.context && <Text size="sm" color="tertiary">{q.context}</Text>}
          <figcaption className="tw-quote-meta">
            {q.person && <PersonAvatar name={q.person} size="md" />}
            <span style={{ color: "var(--t-font-color-secondary)" }}>{q.person ?? (showCompany ? (q.companyName ?? q.company ?? "") : "")}</span>
            {q.date && <span className="tw-num">· {formatDate(q.date)}</span>}
            <a href={q.link} target="_blank" rel="noreferrer" className="tw-ext" style={{ marginLeft: "auto" }}>
              Source <IconExternalLink size={12} />
            </a>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

