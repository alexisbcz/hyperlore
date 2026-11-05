import type { Metadata } from "next";
import { BUILD } from "@/lib/build";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { CompanyDirectory } from "@/components/company-directory";
import { formatUsd } from "@/components/lore";
import { Page } from "@/components/page";
import { directoryRows } from "@/lib/directory";
import { getCategory, listCategories } from "@/lib/lore";
import { isLive } from "@/lib/store";

// Every category is prerendered from the snapshot at build; new ones render on first visit.
export async function generateStaticParams() {
  return (await listCategories()).map((c) => ({ slug: c.slug }));
}

async function metaData(slug: string) {
  const category = await getCategory(slug);
  return category ? { label: category.label, names: category.companies.slice(0, 6).map((c) => c.name) } : null;
}

async function cachedMetaData(slug: string, build: string) {
  "use cache";
  void build;
  cacheLife("max");
  return metaData(slug);
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  if (isLive()) await connection();
  const category = await (isLive() ? metaData(slug) : cachedMetaData(slug, BUILD));
  if (!category) return { title: "Category not found" };
  const names = category.names.join(", ");
  const description = `${category.label} startups in the Hyperlore archive: ${names}. Sourced histories, funding rounds, founders and investors.`;
  return {
    title: `${category.label} companies`,
    description,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: { title: `${category.label} companies`, description, url: `/categories/${slug}`, type: "website" },
    twitter: { card: "summary_large_image", title: `${category.label} companies`, description },
  };
}

export default function CategoryPage({ params }: PageProps<"/categories/[slug]">) {
  return (
    <Page>
      <Suspense fallback={<CategorySkeleton />}>
        <Category params={params} />
      </Suspense>
    </Page>
  );
}

function CategorySkeleton() {
  return (
    <div aria-busy="true">
      <div className="h-4 w-24 rounded bg-bg-hover" />
      <div className="mt-4 h-9 w-64 rounded bg-bg-hover" />
      <div className="mt-8 h-96 rounded-lg bg-bg-hover" />
      <span className="sr-only">Loading category</span>
    </div>
  );
}

async function Category({ params }: { params: PageProps<"/categories/[slug]">["params"] }) {
  const { slug } = await params;
  if (!isLive()) return (await CachedCategory({ slug, build: BUILD })) ?? notFound();
  await connection();
  return (await CategoryBody({ slug })) ?? notFound();
}

/** The snapshot page, rendered once per deployment. Null for an unknown category (404 outside the cache). */
async function CachedCategory({ slug }: { slug: string; build: string }) {
  "use cache";
  cacheLife("max");
  return CategoryBody({ slug });
}

async function CategoryBody({ slug }: { slug: string }) {
  const [category, all] = await Promise.all([getCategory(slug), listCategories()]);
  if (!category) return null;
  const { companies } = category;
  const raised = companies.reduce((s, c) => s + c.raisedUsd, 0);
  const investors = new Set(companies.flatMap((c) => c.investors.map((i) => i.slug)));
  // Categories its companies also sit in, most shared first.
  const related = all
    .filter((c) => c.slug !== slug)
    .map((c) => ({ c, n: c.companies.filter((x) => companies.includes(x)).length }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n || a.c.label.localeCompare(b.c.label))
    .slice(0, 10);
  return (
    <>
      <Link href="/categories" className="text-sm text-fg-subtle hover:text-fg">
        ← Categories
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-balance text-3xl font-semibold text-fg">{category.label}</h1>
          <p className="mt-2 text-sm tabular-nums text-fg-subtle">
            {companies.length} {companies.length === 1 ? "company" : "companies"}
            {raised > 0 && <> · {formatUsd(raised)} raised</>}
            {investors.size > 0 && <> · {investors.size} investors</>}
          </p>
        </div>
        <Link href={`/companies?category=${encodeURIComponent(category.id)}`} className="text-sm text-fg-muted hover:text-fg">
          Open in the full directory →
        </Link>
      </div>
      {related.length > 0 && (
        <nav aria-label="Related categories" className="mt-5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-fg-subtle">Often alongside</span>
          {related.map(({ c, n }) => (
            <Link
              key={c.slug}
              href={`/categories/${c.slug}`}
              className="rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
            >
              {c.label} <span className="tabular-nums opacity-60">{n}</span>
            </Link>
          ))}
        </nav>
      )}
      <CompanyDirectory companies={directoryRows(companies)} />
    </>
  );
}
