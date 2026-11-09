import Link from "next/link";
import type { ReactNode } from "react";
import { splitTables, type Table } from "@/lib/markdown-table";
import { SOURCE_LABELS, formatDate } from "@/lib/format";
import type { SourceInfo } from "@/lib/types";
import { Tooltip } from "./tw";
import { T } from "./ui";
import { SourceList } from "./feed";

export { Quotes, SourceList, Timeline, type TimelineEvent } from "./feed";

// Overview and story markdown with numbered citations, plus the timeline, in Twenty's type.

const CITE = /\{\{cite:([^}\s]+)\}\}/g;

export function citationOrder(markdown: string) {
  const order: string[] = [];
  for (const [, url] of markdown.matchAll(CITE)) if (!order.includes(url)) order.push(url);
  return order;
}

/** Internal links point at the classic site; keep them inside the variant. */
const localHref = (href: string) => (href.startsWith("/") && !href.startsWith("/lab/") && !href.startsWith("/assets/") ? `${T}${href}` : href);

function inline(text: string, order: string[], sources: Record<string, SourceInfo>, key = ""): ReactNode[] {
  return text
    .split(/(\{\{cite:[^}\s]+\}\}|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    .filter(Boolean)
    .map((chunk, i) => {
      const k = `${key}${i}`;
      const cite = chunk.match(/^\{\{cite:([^}\s]+)\}\}$/);
      if (cite) {
        const n = order.indexOf(cite[1]) + 1;
        const s = sources[cite[1]];
        return (
          <Tooltip key={k} content={s?.title?.split("\n")[0] || cite[1]} description={s ? `${SOURCE_LABELS[s.type] ?? s.type} · ${s.host}${s.publishedAt ? ` · ${formatDate(s.publishedAt)}` : ""}` : undefined} delay={200}>
            <a href={cite[1]} target="_blank" rel="noreferrer" className="tw-cite">
              {n}
            </a>
          </Tooltip>
        );
      }
      const link = chunk.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const href = localHref(link[2]);
        return href.startsWith("/") ? (
          <Link key={k} href={href}>
            {link[1]}
          </Link>
        ) : (
          <a key={k} href={href} target="_blank" rel="noreferrer">
            {link[1]}
          </a>
        );
      }
      if (/^\*\*[^*]+\*\*$/.test(chunk)) return <strong key={k}>{chunk.slice(2, -2)}</strong>;
      if (/^\*[^*]+\*$/.test(chunk)) return <em key={k}>{chunk.slice(1, -1)}</em>;
      if (/^`[^`]+`$/.test(chunk)) return <code key={k}>{chunk.slice(1, -1)}</code>;
      return chunk;
    });
}

function MdTable({ table, cell }: { table: Table; cell: (t: string, key: string) => ReactNode }) {
  return (
    <div className="tw-mdtable">
      <table>
        <thead>
          <tr>
            {table.head.map((h, k) => (
              <th key={k} style={{ textAlign: table.align[k] ?? "left" }}>
                {cell(h, `h${k}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, j) => (
            <tr key={j}>
              {row.map((c, k) => (
                <td key={k} className={table.align[k] === "right" ? "tw-num" : undefined} style={{ textAlign: table.align[k] ?? "left" }}>
                  {cell(c, `${j}-${k}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Prose({ markdown, sources, references = true }: { markdown: string; sources: Record<string, SourceInfo>; references?: boolean }) {
  const order = citationOrder(markdown);
  const blocks = markdown
    .trim()
    .split(/\n{2,}/)
    .flatMap((b) => splitTables(b))
    .map((seg) => (seg.kind === "table" ? seg.table : seg.text));
  const cell = (t: string, key: string) => inline(t, order, sources, key);
  return (
    <div className="tw-prose">
      {blocks.map((block, i) => {
        if (typeof block !== "string") return <MdTable key={i} table={block} cell={cell} />;
        if (block.startsWith("### ")) return <h3 key={i}>{block.slice(4).trim()}</h3>;
        if (block.startsWith("## ")) return <h2 key={i}>{block.slice(3).trim()}</h2>;
        if (block.startsWith("# ")) return null;
        if (block.startsWith(">")) return <blockquote key={i}>{cell(block.replace(/^>\s?/gm, "").replace(/\n/g, " "), `${i}`)}</blockquote>;
        if (/^\s*[-*] /m.test(block))
          return (
            <ul key={i}>
              {block
                .split("\n")
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>{cell(l.replace(/^\s*[-*] /, ""), `${i}-${j}`)}</li>
                ))}
            </ul>
          );
        if (/^\s*\d+\. /m.test(block))
          return (
            <ol key={i}>
              {block
                .split("\n")
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>{cell(l.replace(/^\s*\d+\. /, ""), `${i}-${j}`)}</li>
                ))}
            </ol>
          );
        return <p key={i}>{cell(block.replace(/\n/g, " "), `${i}`)}</p>;
      })}
      {references && order.length > 0 && (
        <div className="tw-refs">
          <div className="tw-side-section-head">
            References <span className="tw-col-count tw-num">{order.length}</span>
          </div>
          <SourceList urls={order} sources={sources} numbered />
        </div>
      )}
    </div>
  );
}

