import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { preload } from "react-dom";
import { Suspense } from "react";
import { CompanyDirectory } from "@/components/company-directory";
import { Page } from "@/components/page";
import { isLive } from "@/lib/store";
import { DEFAULT_FILTERS, DIRECTORY_PAGE, directoryRows, sortCompanies } from "@/lib/directory";
import { listCompanies } from "@/lib/lore";
import { DirectorySkeleton } from "@/components/skeletons";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Companies",
  description:
    "Every startup in the archive in one sortable table: founding year, HQ, status, funding, last round, valuation, founders and investors, with filters you can share as a link.",
  path: "/companies",
});

export default function CompaniesPage() {
  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-balance text-3xl font-semibold text-fg">Companies</h1>
          <p className="mt-2 text-pretty text-fg-muted">
            Every company in the archive, with what its sources say about funding, founders and investors. Filter, sort, and share the
            view as a link.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/categories" className="text-fg-muted hover:text-fg">
            Browse by category →
          </Link>
          <Link href="/request" className="text-fg-muted hover:text-fg">
            Request a company →
          </Link>
        </div>
      </div>
      <Suspense fallback={<DirectorySkeleton label="Loading companies" />}>
        <Directory />
      </Suspense>
    </Page>
  );
}


const DIRECTORY_URL = "/companies/directory.json";

async function directory() {
  const rows = directoryRows(await listCompanies());
  return { initial: sortCompanies(rows, DEFAULT_FILTERS.sort, DEFAULT_FILTERS.dir).slice(0, DIRECTORY_PAGE), total: rows.length };
}

async function Directory() {
  // Starts downloading every company (for the filters and the remaining rows) alongside the scripts.
  preload(DIRECTORY_URL, { as: "fetch", crossOrigin: "anonymous" });
  if (!isLive()) return <CachedDirectory />;
  await connection();
  return <CompanyDirectory {...await directory()} src={DIRECTORY_URL} />;
}

/** From the snapshot: rendered once per deployment (prerendered at build). */
async function CachedDirectory() {
  "use cache";
  cacheLife("max");
  return <CompanyDirectory {...await directory()} src={DIRECTORY_URL} />;
}
