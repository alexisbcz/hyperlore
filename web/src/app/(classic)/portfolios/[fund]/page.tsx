import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortfolioDirectory } from "@/components/portfolio-directory";
import { pageMetadata } from "@/lib/seo";

const FUNDS: Record<string, { title: string; label: string; periodLabel: string; intro: string; source: string; sourceUrl: string }> = {
  yc: {
    title: "Every Y Combinator company",
    label: "Y Combinator",
    periodLabel: "Batch",
    intro: "All 6,362 companies in Y Combinator's directory, as YC lists them. Companies with full sourced lore on Hyperlore are marked.",
    source: "YC's public directory, through the yc-oss mirror",
    sourceUrl: "https://www.ycombinator.com/companies",
  },
  a16z: {
    title: "Every a16z investment",
    label: "a16z",
    periodLabel: "Year",
    intro: "All 883 companies on Andreessen Horowitz's portfolio page, as a16z lists them. Companies with full sourced lore on Hyperlore are marked.",
    source: "a16z's portfolio page",
    sourceUrl: "https://a16z.com/portfolio/",
  },
  kima: {
    title: "Every Kima Ventures company",
    label: "Kima Ventures",
    periodLabel: "Year",
    intro: "The 1,005 companies on Kima Ventures' portfolio page, as Kima lists them. Companies with full sourced lore on Hyperlore are marked.",
    source: "Kima Ventures' portfolio page",
    sourceUrl: "https://www.kimaventures.com/portfolio",
  },
  frst: {
    title: "Frst's portfolio",
    label: "Frst",
    periodLabel: "Year",
    intro: "The 37 companies Frst shows on its website. Frst has no separate portfolio page, so past investments it doesn't display may be missing. Companies with full sourced lore on Hyperlore are marked.",
    source: "Frst's website",
    sourceUrl: "https://www.frst.vc/",
  },
};

export function generateStaticParams() {
  return Object.keys(FUNDS).map((fund) => ({ fund }));
}

export async function generateMetadata({ params }: PageProps<"/portfolios/[fund]">): Promise<Metadata> {
  const { fund } = await params;
  const f = FUNDS[fund];
  return f ? pageMetadata({ title: f.title, description: f.intro, path: `/portfolios/${fund}` }) : {};
}

export default async function PortfolioPage({ params }: PageProps<"/portfolios/[fund]">) {
  const { fund } = await params;
  const f = FUNDS[fund];
  if (!f) notFound();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <nav aria-label="Portfolios" className="mb-4 flex gap-1.5">
        {Object.entries(FUNDS).map(([id, x]) => (
          <Link
            key={id}
            href={`/portfolios/${id}`}
            aria-current={id === fund ? "page" : undefined}
            className="flex h-9 items-center rounded-lg border border-border px-3 text-sm text-fg-muted transition-colors hover:text-fg aria-[current=page]:border-accent/50 aria-[current=page]:bg-bg-hover aria-[current=page]:text-fg"
          >
            {x.label}
          </Link>
        ))}
      </nav>
      <h1 className="display text-4xl uppercase leading-[1.02] sm:text-5xl">{f.title}</h1>
      <p className="mt-3 max-w-3xl text-pretty leading-relaxed text-fg-muted">{f.intro}</p>
      <p className="mt-1 text-xs text-fg-subtle">
        Source:{" "}
        <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="link-u">
          {f.source}
        </a>
        , 2 November 2026.
      </p>
      <PortfolioDirectory fund={fund} periodLabel={f.periodLabel} />
    </div>
  );
}
