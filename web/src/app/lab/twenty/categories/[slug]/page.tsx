import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { IconArrowRight, IconLayoutGrid } from "../../icons";
import { CompaniesView } from "../../companies/view";
import { PageHead, Panel, T, usd } from "../../ui";
import { Chip, LightButton, Text } from "../../tw";
import { categoryRecord } from "./data";

export async function generateMetadata({ params }: PageProps<"/lab/twenty/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await categoryRecord(slug);
  if (!c) return { title: "Category not found" };
  const description = `${c.label} startups in the Hyperlore archive: ${c.names.join(", ")}. Sourced histories, funding rounds, founders and investors.`;
  return {
    title: `${c.label} companies`,
    description,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: { title: `${c.label} companies`, description, url: `/categories/${slug}`, type: "website" },
  };
}

export default function CategoryPage({ params }: PageProps<"/lab/twenty/categories/[slug]">) {
  return (
    <Suspense>
      <Category params={params} />
    </Suspense>
  );
}

async function Category({ params }: { params: PageProps<"/lab/twenty/categories/[slug]">["params"] }) {
  const { slug } = await params;
  const c = await categoryRecord(slug);
  if (!c) notFound();
  return (
    <>
      <PageHead
        section="categories"
        icon={IconLayoutGrid}
        crumbs={[{ href: `${T}/categories`, label: "Categories" }]}
        title={c.label}
        actions={
          <LightButton endIcon={<IconArrowRight />} render={<Link href={`${T}/companies?category=${encodeURIComponent(c.label)}`} />} nativeButton={false}>
            Open in Companies
          </LightButton>
        }
      />
      <Panel>
        <div className="tw-filterbar">
          <Text size="sm" color="secondary" className="tw-num">
            {c.count} {c.count === 1 ? "company" : "companies"}
            {c.raisedUsd > 0 && <> · {usd(c.raisedUsd)} raised</>}
            {c.investors > 0 && <> · {c.investors} investors</>}
          </Text>
          {c.related.length > 0 && (
            <>
              <span className="tw-pagehead-sep" aria-hidden>
                ·
              </span>
              <Text size="sm" color="tertiary">
                Often alongside
              </Text>
              <nav aria-label="Related categories" className="tw-chips">
                {c.related.map((r) => (
                  <Chip key={r.slug} variant="outline" render={<Link href={`${T}/categories/${r.slug}`} />} clickable endElement={<span className="tw-cell-light tw-num">{r.n}</span>}>
                    {r.label}
                  </Chip>
                ))}
              </nav>
            </>
          )}
        </div>
        <CompaniesView rows={c.rows} name={`${c.label} companies`} />
      </Panel>
    </>
  );
}
