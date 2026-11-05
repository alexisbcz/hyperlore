import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { connection } from "next/server";
import { Suspense } from "react";
import { CompanyMark, formatUsd } from "@/components/lore";
import { Page } from "@/components/page";
import { listCategories } from "@/lib/lore";
import { isLive } from "@/lib/store";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Categories",
  description:
    "Every startup category in the archive, from AI and devtools to fintech, with the companies in each and what they raised.",
  path: "/categories",
});

export default function CategoriesPage() {
  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="text-balance text-3xl font-semibold text-fg">Categories</h1>
          <p className="mt-2 text-pretty text-fg-muted">
            What the companies in the archive do, as recorded on their profiles. A company can sit in several categories.
          </p>
        </div>
        <Link href="/companies" className="text-sm text-fg-muted hover:text-fg">
          All companies →
        </Link>
      </div>
      <Suspense fallback={<CategoriesSkeleton />}>
        <Categories />
      </Suspense>
    </Page>
  );
}

function CategoriesSkeleton() {
  return (
    <div aria-busy="true" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="h-28 rounded-lg bg-bg-hover" />
      ))}
      <span className="sr-only">Loading categories</span>
    </div>
  );
}

// Live data renders per request; the snapshot once per deployment (prerendered at build).
async function Categories() {
  if (!isLive()) return CachedCategories();
  await connection();
  return CategoriesBody();
}

async function CachedCategories() {
  "use cache";
  cacheLife("max");
  return CategoriesBody();
}

async function CategoriesBody() {
  const categories = await listCategories();
  if (!categories.length) return <p className="mt-8 text-sm text-fg-subtle">Categories appear as company profiles are filled in.</p>;
  return (
    <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((c) => {
        const raised = c.companies.reduce((s, x) => s + x.raisedUsd, 0);
        const shown = c.companies.slice(0, 6);
        return (
          <li key={c.slug}>
            <Link
              href={`/categories/${c.slug}`}
              className="flex h-full flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-accent"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-fg">{c.label}</span>
                <span className="shrink-0 text-xs tabular-nums text-fg-subtle">
                  {c.companies.length} {c.companies.length === 1 ? "company" : "companies"}
                </span>
              </span>
              <span className="flex items-center gap-1" aria-hidden="true">
                {shown.map((x) => (
                  <CompanyMark key={x.slug} logo={x.icon} dark={x.iconDark} name={x.name} size="sm" />
                ))}
                {c.companies.length > shown.length && <span className="ml-1 text-xs tabular-nums text-fg-subtle">+{c.companies.length - shown.length}</span>}
              </span>
              <span className="mt-auto truncate text-xs text-fg-subtle">
                {c.companies
                  .slice(0, 4)
                  .map((x) => x.name)
                  .join(", ")}
                {raised > 0 && <> · {formatUsd(raised)} raised</>}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
