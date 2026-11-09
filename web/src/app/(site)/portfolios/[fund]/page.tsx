import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconRocket } from "../../icons";
import { indexMetadata } from "../../og/meta";
import { PageHead, Panel } from "../../ui";
import { TabButton } from "../../tw";
import { PortfolioView } from "./view";
import "./portfolios.css";

// The funds and their wording are the classic page's (src/app/(classic)/portfolios/[fund]).
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
  return f ? indexMetadata({ title: f.title, description: f.intro, path: `/portfolios/${fund}` }) : {};
}

export default function PortfolioPage({ params }: PageProps<"/portfolios/[fund]">) {
  return (
    <Suspense>
      <Portfolio params={params} />
    </Suspense>
  );
}

async function Portfolio({ params }: { params: PageProps<"/portfolios/[fund]">["params"] }) {
  const { fund } = await params;
  const f = FUNDS[fund];
  if (!f) notFound();
  return (
    <>
      <PageHead section="portfolios" icon={IconRocket} crumbs={[{ href: "/portfolios/yc", label: "Portfolios" }]} title={f.label} />
      <Panel>
        <nav aria-label="Portfolios" className="tw-folio-tabs">
          {Object.entries(FUNDS).map(([id, x]) => (
            <TabButton key={id} active={id === fund} aria-current={id === fund ? "page" : undefined} render={<Link href={`/portfolios/${id}`} />} nativeButton={false} role="link">
              {x.label}
            </TabButton>
          ))}
        </nav>
        <div className="tw-folio-intro">
          <strong>{f.title}.</strong> {f.intro} Source:{" "}
          <a href={f.sourceUrl} target="_blank" rel="noreferrer" className="tw-link">
            {f.source}
          </a>
          , 2 November 2026.
        </div>
        <PortfolioView fund={fund} label={f.label} periodLabel={f.periodLabel} />
      </Panel>
    </>
  );
}
