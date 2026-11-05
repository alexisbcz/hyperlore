import type { ReactNode } from "react";
import { splitTables } from "@/lib/markdown-table";
import type { SourceInfo } from "@/lib/types";
import { SourceIcon } from "./icons";
import { Cite, SOURCE_LABELS, formatDate } from "./lore";
import { MarkdownTable } from "./markdown-table";

const CITE = /\{\{cite:([^}\s]+)\}\}/g;

/** Numbers citations by first appearance, so the overview and its reference list agree. */
export function citationOrder(markdown: string) {
  const order: string[] = [];
  for (const [, url] of markdown.matchAll(CITE)) if (!order.includes(url)) order.push(url);
  return order;
}

export function headings(markdown: string) {
  return [...markdown.matchAll(/^## (.+)$/gm)].map((m) => ({ id: slug(m[1]), title: m[1].trim() }));
}

const slug = (s: string) =>
  "overview-" +
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function inline(text: string, order: string[], sources: Record<string, SourceInfo>): ReactNode[] {
  // Citation marks wrap with the word before them ("2006.[1]", "[3][20]"), so a line never starts with
  // a stray mark.
  const out: ReactNode[] = [];
  let run: ReactNode[] = [];
  const flush = () => {
    if (!run.length) return;
    // A space after the last mark stays outside, so the next word can still wrap.
    const tail = typeof run[run.length - 1] === "string" ? (run.pop() as string) : null;
    const prev = out[out.length - 1];
    const word = typeof prev === "string" ? prev.match(/\S+$/)?.[0] : undefined;
    if (word) out[out.length - 1] = (prev as string).slice(0, -word.length);
    out.push(
      <span key={`run${out.length}`} className="whitespace-nowrap">
        {word}
        {run}
      </span>,
    );
    run = [];
    if (tail) out.push(tail);
  };
  for (const [i, chunk] of text.split(/(\{\{cite:[^}\s]+\}\}|\[[^\]]+\]\([^)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g).entries()) {
    if (chunk === "") continue;
    if (/^\{\{cite:/.test(chunk)) run.push(inlineChunk(chunk, i, order, sources));
    else if (run.length && /^\s+$/.test(chunk)) run.push(chunk);
    else {
      flush();
      out.push(inlineChunk(chunk, i, order, sources));
    }
  }
  flush();
  return out;
}

function inlineChunk(chunk: string, i: number, order: string[], sources: Record<string, SourceInfo>): ReactNode {
  const cite = chunk.match(/^\{\{cite:([^}\s]+)\}\}$/);
  if (cite) return <Cite key={i} n={order.indexOf(cite[1]) + 1} source={sources[cite[1]]} />;
  const link = chunk.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (link)
    return (
      <a key={i} href={link[2]} className="text-fg text-link underline decoration-accent/45 underline-offset-2 hover:decoration-accent">
        {link[1]}
      </a>
    );
  if (/^\*\*[^*]+\*\*$/.test(chunk)) return <strong key={i}>{chunk.slice(2, -2)}</strong>;
  if (/^\*[^*]+\*$/.test(chunk)) return <em key={i}>{chunk.slice(1, -1)}</em>;
  // Plain text stays a string, so a citation can borrow its last word.
  return chunk;
}

export function Prose({ markdown, sources }: { markdown: string; sources: Record<string, SourceInfo> }) {
  const order = citationOrder(markdown);
  // A table glued to the paragraph or heading above it becomes its own block.
  const blocks = markdown
    .trim()
    .split(/\n{2,}/)
    .flatMap((b) => splitTables(b))
    .map((seg) => (seg.kind === "table" ? seg.table : seg.text));
  return (
    <div className="prose-lore">
      {blocks.map((block, i) => {
        if (typeof block !== "string") return <MarkdownTable key={i} table={block} inline={(t) => inline(t, order, sources)} />;
        if (block.startsWith("## ")) {
          const title = block.slice(3).trim();
          return (
            <h2 key={i} id={slug(title)} className="scroll-mt-24 text-fg">
              {title}
            </h2>
          );
        }
        if (block.startsWith("# ")) return null;
        if (block.startsWith(">"))
          return (
            <blockquote key={i}>
              {inline(block.replace(/^>\s?/gm, "").replace(/\n/g, " "), order, sources)}
            </blockquote>
          );
        if (/^\s*[-*] /m.test(block))
          return (
            <ul key={i}>
              {block
                .split("\n")
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>{inline(l.replace(/^\s*[-*] /, ""), order, sources)}</li>
                ))}
            </ul>
          );
        return <p key={i}>{inline(block.replace(/\n/g, " "), order, sources)}</p>;
      })}
    </div>
  );
}

export function References({ urls, sources }: { urls: string[]; sources: Record<string, SourceInfo> }) {
  return (
    <ol className="refs space-y-2 text-sm">
      {urls.map((url, i) => {
        const s = sources[url];
        return (
          <li key={url} id={`ref-${i + 1}`}>
            <span className="refs-n">{i + 1}.</span>
            <span className="min-w-0">
              <a href={url} target="_blank" rel="noreferrer" className="break-words text-fg hover:underline">
                {s?.title?.split("\n")[0] || url}
              </a>
              <span className="refs-meta">
                <SourceIcon type={s?.type ?? "other"} />
                {SOURCE_LABELS[s?.type ?? ""] ?? s?.type} · {s?.host}
                {s?.publishedAt && <span className="tabular-nums"> · {formatDate(s.publishedAt)}</span>}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
