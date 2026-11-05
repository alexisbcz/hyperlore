import Link from "next/link";
import { ArrowUpRight, ChevronDown, Columns2, Download, FileText, Globe, Sparkles } from "lucide-react";
import { XIcon } from "./icons";

const base = "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm transition-[color,background-color,border-color,transform] duration-150 ease-out active:scale-[0.97]";
const button = `${base} border border-border text-fg-muted hover:border-border-strong hover:text-fg`;
const primary = `${base} bg-primary font-medium text-on-primary hover:bg-primary-hover`;

// Every edition carries the archive version and numbered links to the primary sources.
const EXPORTS = [
  { ext: "pdf", label: "PDF", hint: "Typeset, printable", path: (slug: string) => `/${slug}/lore.pdf`, download: true },
  { ext: "md", label: "Markdown", hint: "Notion, Obsidian", path: (slug: string) => `/${slug}/lore.md`, download: true },
  { ext: "txt", label: "Plain text", hint: "Email, terminal", path: (slug: string) => `/${slug}/lore.txt`, download: true },
  { ext: "json", label: "JSON", hint: "API record", path: (slug: string) => `/api/v1/companies/${slug}`, download: false },
  { ext: "llms", label: "llms.txt", hint: "For AI agents", path: (slug: string) => `/${slug}/llms.txt`, download: false },
];

export function CompanyActions({
  slug,
  name,
  site,
  pageUrl,
  compareWith,
}: {
  slug: string;
  name: string;
  site?: string;
  pageUrl: string;
  /** The most similar company, preselected on the comparison page. */
  compareWith?: string;
}) {
  const share = `https://x.com/intent/post?text=${encodeURIComponent(`The lore of ${name}, every claim sourced`)}&url=${encodeURIComponent(pageUrl)}`;
  return (
    <div className="flex flex-wrap gap-2">
      {site && (
        <a href={`https://${site}`} target="_blank" rel="noreferrer" className={primary}>
          <Globe aria-hidden="true" className="size-3.5" />
          {site}
          <ArrowUpRight aria-hidden="true" className="size-3.5 opacity-60" />
        </a>
      )}
      <a href="#ask" className={button}>
        <Sparkles aria-hidden="true" className="size-3.5" />
        Ask
      </a>
      <Link href={`/compare?c=${[slug, compareWith].filter(Boolean).join(",")}`} className={button}>
        <Columns2 aria-hidden="true" className="size-3.5" />
        Compare
      </Link>
      <details className="group relative">
        <summary className={`${button} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>
          <Download aria-hidden="true" className="size-3.5" />
          Export
          <ChevronDown aria-hidden="true" className="size-3.5 opacity-60 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="absolute left-0 z-20 mt-1 w-64 overflow-hidden rounded-lg border border-border bg-bg py-1 text-sm shadow-lg">
          {EXPORTS.map((e) => (
            <li key={e.ext}>
              <a href={`${e.path(slug)}`} {...(e.download && { download: "" })} className="flex items-baseline justify-between gap-3 px-3 py-2 hover:bg-bg-hover">
                <span className="flex items-center gap-2 text-fg">
                  <FileText aria-hidden="true" className="size-3.5 shrink-0 self-center text-fg-subtle" />
                  {e.label}
                </span>
                <span className="text-xs text-fg-subtle">{e.hint}</span>
              </a>
            </li>
          ))}
        </ul>
      </details>
      <a href={share} target="_blank" rel="noreferrer" className={button}>
        <XIcon />
        Share
      </a>
    </div>
  );
}
