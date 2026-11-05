import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { preload } from "react-dom";
import { Suspense } from "react";
import { InvestorDirectory } from "@/components/investor-directory";
import { Page } from "@/components/page";
import { investorRows, listCompanies } from "@/lib/lore";
import { isLive } from "@/lib/store";
import { INVESTORS_PAGE } from "@/lib/directory";
import { DirectorySkeleton } from "@/components/skeletons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Investors",
  description:
    "Every investor in the archive's funding rounds, and which startups they backed or led.",
  path: "/investors",
});

export default function InvestorsPage() {
  return (
    <Page>
      <h1 className="text-balance text-3xl font-semibold text-fg">Investors</h1>
      <p className="mt-2 max-w-3xl text-pretty text-fg-muted">
        Built from every sourced funding round. Filter by stage, by the kind of company they back, or by whether they led.
      </p>
      <Suspense fallback={<DirectorySkeleton label="Loading investors" />}>
        <List />
      </Suspense>
    </Page>
  );
}


const DIRECTORY_URL = "/investors/directory.json";

async function directory() {
  const [rows, companies] = await Promise.all([investorRows(), listCompanies()]);
  return {
    // Rows come in the default order ("most companies"), so the first ones are the default view.
    initial: rows.slice(0, INVESTORS_PAGE),
    total: rows.length,
    companies: companies.map((c) => ({ slug: c.slug, name: c.name, categories: c.categories })),
  };
}

async function List() {
  // Starts downloading every investor (for the filters) alongside the page's scripts.
  preload(DIRECTORY_URL, { as: "fetch", crossOrigin: "anonymous" });
  if (!isLive()) return <CachedList />;
  await connection();
  return <InvestorDirectory {...await directory()} src={DIRECTORY_URL} />;
}

/** From the snapshot: rendered once per deployment (prerendered at build). */
async function CachedList() {
  "use cache";
  cacheLife("max");
  return <InvestorDirectory {...await directory()} src={DIRECTORY_URL} />;
}
